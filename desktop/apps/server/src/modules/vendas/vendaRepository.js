import { formaPagamento, nfceStatus, syncEventTypes, vendaStatus } from "@v12-desktop/shared";
import { getDb } from "../../db/connection.js";
import { getCaixaAberto } from "../caixa/caixaRepository.js";
import { assertTerminalConfigurado, getTerminalTenantErpId } from "../configuracao/localConfigRepository.js";
import { enqueueSyncEvent } from "../../services/syncQueueService.js";
import { emitirNfce } from "../../services/acbrFiscalService.js";

function normalizePayment(payment) {
  return {
    forma: payment.forma || formaPagamento.DINHEIRO,
    valor: Number(payment.valor || 0),
  };
}

function normalizeIdentificacaoCliente(cliente) {
  const source = cliente || {};
  const tipoDocumento = String(source.tipoDocumento || "").trim().toUpperCase();
  return {
    tipoDocumento: ["CPF", "CNPJ", "ESTRANGEIRO"].includes(tipoDocumento) ? tipoDocumento : null,
    documento: String(source.documento || "").trim() || null,
    nome: String(source.nome || "").trim() || null,
    email: String(source.email || "").trim().toLowerCase() || null,
  };
}

function getProdutoLocal(db, tenantErpId, produtoId) {
  return db
    .prepare(
      `SELECT produto_id, tenant_erp_id, descricao, ativo, estoque_atual
       FROM produto
       WHERE tenant_erp_id = ?
         AND produto_id = ?
       LIMIT 1`,
    )
    .get(tenantErpId, Number(produtoId));
}

function validarItensVenda(db, tenantErpId, items = []) {
  const validatedItems = [];

  for (const item of items) {
    const quantidade = Number(item.quantidade || 0);
    const valorUnitario = Number(item.valor_unitario || 0);
    const produtoId = Number(item.produto_id || 0);

    if (!produtoId) {
      throw new Error("Produto inválido na venda.");
    }

    if (quantidade <= 0) {
      throw new Error("A quantidade do item deve ser maior que zero.");
    }

    const produto = getProdutoLocal(db, tenantErpId, produtoId);
    if (!produto || !Number(produto.ativo)) {
      throw new Error(`O produto ${item.descricao || produtoId} não está ativo no PDV.`);
    }

    const estoqueDisponivel = Number(produto.estoque_atual || 0);
    if (quantidade > estoqueDisponivel) {
      throw new Error(
        `Estoque insuficiente para ${produto.descricao || item.descricao}. Disponível: ${estoqueDisponivel}.`,
      );
    }

    validatedItems.push({
      ...item,
      quantidade,
      valor_unitario: valorUnitario,
      estoque_atual: estoqueDisponivel,
    });
  }

  return validatedItems;
}

function aplicarMovimentoEstoque(db, tenantErpId, items = [], direction = "saida") {
  for (const item of items) {
    const quantidade = Number(item.quantidade || 0);
    const delta = direction === "entrada" ? quantidade : -quantidade;
    db.prepare(
      `UPDATE produto
       SET estoque_atual = estoque_atual + ?, atualizado_em = CURRENT_TIMESTAMP
       WHERE tenant_erp_id = ?
         AND produto_id = ?`,
    ).run(delta, tenantErpId, item.produto_id);
  }
}

function marcarVendaConcluida(db, tenantErpId, vendaId) {
  db.prepare(
    `UPDATE venda
     SET status = ?, concluida_em = CURRENT_TIMESTAMP
     WHERE tenant_erp_id = ?
       AND venda_id = ?`,
  ).run(vendaStatus.CONCLUIDA, tenantErpId, Number(vendaId));
}

function descartarVendaProvisoria(db, tenantErpId, vendaId) {
  db.prepare(`DELETE FROM venda_pagamento WHERE tenant_erp_id = ? AND venda_id = ?`).run(
    tenantErpId,
    Number(vendaId),
  );
  db.prepare(`DELETE FROM venda_item WHERE tenant_erp_id = ? AND venda_id = ?`).run(
    tenantErpId,
    Number(vendaId),
  );
  db.prepare(`DELETE FROM nfce WHERE tenant_erp_id = ? AND venda_id = ?`).run(
    tenantErpId,
    Number(vendaId),
  );
  db.prepare(`DELETE FROM venda WHERE tenant_erp_id = ? AND venda_id = ?`).run(
    tenantErpId,
    Number(vendaId),
  );
}

function buildContingenciaDecisionError(vendaId, fiscal) {
  const error = new Error(
    fiscal?.message || "Não foi possível transmitir a NFC-e. A emissão em contingência offline está disponível.",
  );
  error.code = "NFCE_CONTINGENCIA_DISPONIVEL";
  error.data = {
    vendaId: Number(vendaId),
    fiscal,
  };
  return error;
}

export async function criarVenda({
  pessoaId,
  cliente,
  items = [],
  pagamentos = [],
  subtotal = null,
  desconto = 0,
  totalLiquido = null,
  emitirFiscal = false,
  permitirContingenciaOffline = false,
}) {
  assertTerminalConfigurado();
  const caixa = getCaixaAberto();
  const tenantErpId = getTerminalTenantErpId();
  if (!caixa) {
    throw new Error("Não existe caixa aberto.");
  }

  if (!tenantErpId || Number(caixa.tenant_erp_id) !== Number(tenantErpId)) {
    throw new Error("O caixa aberto não pertence à filial configurada neste PDV.");
  }

  if (!items.length) {
    throw new Error("Informe ao menos um item.");
  }

  const clienteIdentificado = normalizeIdentificacaoCliente(cliente);
  const db = getDb();
  const itensValidados = validarItensVenda(db, tenantErpId, items);
  const create = db.transaction(() => {
    const totalProdutosCalculado = itensValidados.reduce((acc, item) => {
      return acc + Number(item.quantidade || 0) * Number(item.valor_unitario || 0);
    }, 0);
    const totalProdutos = subtotal == null ? totalProdutosCalculado : Number(subtotal || 0);
    const totalDesconto = Math.max(0, Math.min(totalProdutos, Number(desconto || 0)));
    const totalLiquidoVenda =
      totalLiquido == null
        ? Number((totalProdutos - totalDesconto).toFixed(2))
        : Number(totalLiquido || 0);
    const totalPagamentos = pagamentos
      .map(normalizePayment)
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);

    if (Math.abs(Number((totalPagamentos - totalLiquidoVenda).toFixed(2))) > 0.01) {
      throw new Error("A soma dos pagamentos precisa fechar com o total líquido da venda.");
    }

    const vendaResult = db
      .prepare(
        `INSERT INTO venda (
           tenant_erp_id,
           caixa_id,
           pessoa_id,
           cliente_tipo_documento,
           cliente_documento,
           cliente_nome,
           cliente_email,
           status,
           total_produtos,
           total_desconto,
           total_liquido,
           concluida_em
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        tenantErpId,
        caixa.caixa_id,
        pessoaId || null,
        clienteIdentificado.tipoDocumento,
        clienteIdentificado.documento,
        clienteIdentificado.nome,
        clienteIdentificado.email,
        emitirFiscal ? vendaStatus.RASCUNHO : vendaStatus.CONCLUIDA,
        totalProdutos,
        totalDesconto,
        totalLiquidoVenda,
        emitirFiscal ? null : new Date().toISOString(),
      );

    const vendaId = vendaResult.lastInsertRowid;

    const insertItem = db.prepare(
      `INSERT INTO venda_item (tenant_erp_id, venda_id, produto_id, codigo_produto, descricao, quantidade, valor_unitario, unidade, valor_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const item of itensValidados) {
      const quantidade = item.quantidade;
      const valorUnitario = item.valor_unitario;
      insertItem.run(
        tenantErpId,
        vendaId,
        item.produto_id,
        item.codigo_produto || null,
        item.descricao,
        quantidade,
        valorUnitario,
        item.unidade || "UN",
        quantidade * valorUnitario,
      );
    }

    const insertPagamento = db.prepare(
      `INSERT INTO venda_pagamento (tenant_erp_id, venda_id, forma, valor)
       VALUES (?, ?, ?, ?)`,
    );

    for (const pagamento of pagamentos.map(normalizePayment)) {
      insertPagamento.run(tenantErpId, vendaId, pagamento.forma, pagamento.valor);
    }

    if (emitirFiscal) {
      db.prepare(
        `INSERT INTO nfce (tenant_erp_id, venda_id, status)
         VALUES (?, ?, ?)`,
      ).run(tenantErpId, vendaId, nfceStatus.PENDENTE);
    }

    if (!emitirFiscal) {
      aplicarMovimentoEstoque(db, tenantErpId, itensValidados, "saida");
    }

    return getVendaDetalhe(vendaId);
  });

  let venda = create();

  let fiscal = null;
  if (!emitirFiscal) {
    enqueueSyncEvent(syncEventTypes.VENDA_CRIADA, venda);
    return { venda, fiscal };
  }

  if (emitirFiscal) {
    fiscal = await emitirNfce(venda, {
      mode: permitirContingenciaOffline ? "contingencia_offline" : "normal",
    });

    if (fiscal.requiresOfflineDecision) {
      throw buildContingenciaDecisionError(venda.venda_id, fiscal);
    }

    if (fiscal.success || fiscal.status === nfceStatus.CONTINGENCIA) {
      const finalize = db.transaction(() => {
        aplicarMovimentoEstoque(db, tenantErpId, itensValidados, "saida");
        marcarVendaConcluida(db, tenantErpId, venda.venda_id);
        return getVendaDetalhe(venda.venda_id);
      });

      venda = finalize();
      enqueueSyncEvent(syncEventTypes.VENDA_CRIADA, venda);
      enqueueSyncEvent(
        fiscal.success ? syncEventTypes.NFCE_AUTORIZADA : syncEventTypes.NFCE_CONTINGENCIA,
        fiscal,
      );
      return { venda, fiscal };
    }

    if (!permitirContingenciaOffline) {
      const rollback = db.transaction(() => {
        descartarVendaProvisoria(db, tenantErpId, venda.venda_id);
      });
      rollback();
    }

    throw new Error(
      fiscal?.message || "A NFC-e não foi autorizada e a venda local foi descartada para evitar pendência fiscal.",
    );
  }

  return { venda, fiscal };
}

export function listVendas({ limit = 50 } = {}) {
  return searchVendas({ limit });
}

export function searchVendas({ search = "", status = "", limit = 50 } = {}) {
  assertTerminalConfigurado();
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  return db
    .prepare(
      `SELECT
         v.venda_id,
         v.caixa_id,
         v.pessoa_id,
         p.erp_id AS pessoa_erp_id,
         v.cliente_tipo_documento,
         v.cliente_documento,
         v.cliente_nome,
         v.cliente_email,
         v.status,
         v.total_produtos,
         v.total_desconto,
         v.total_liquido,
         v.criada_em,
         v.concluida_em,
         v.cancelada_em,
         v.cancelamento_motivo,
         c.operador_nome,
         c.terminal_codigo,
         n.status AS nfce_status,
         n.numero AS nfce_numero,
         n.serie AS nfce_serie
       FROM venda v
       LEFT JOIN caixa c ON c.caixa_id = v.caixa_id
       LEFT JOIN pessoa p ON p.pessoa_id = v.pessoa_id
       LEFT JOIN nfce n ON n.venda_id = v.venda_id
       WHERE v.tenant_erp_id = ?
         AND (
           (? = '' AND v.status <> 'rascunho')
           OR (? <> '' AND v.status = ?)
         )
         AND (
           ? = ''
           OR CAST(v.venda_id AS TEXT) LIKE ?
           OR LOWER(COALESCE(v.cliente_nome, '')) LIKE ?
           OR LOWER(COALESCE(v.cliente_documento, '')) LIKE ?
           OR REPLACE(printf('%.2f', COALESCE(v.total_liquido, 0)), '.', ',') LIKE ?
           OR printf('%.2f', COALESCE(v.total_liquido, 0)) LIKE ?
         )
       ORDER BY v.venda_id DESC
       LIMIT ?`,
    )
    .all(
      tenantErpId,
      String(status || "").trim().toLowerCase(),
      String(status || "").trim().toLowerCase(),
      String(status || "").trim().toLowerCase(),
      String(search || "").trim().toLowerCase(),
      `%${String(search || "").trim().toLowerCase()}%`,
      `%${String(search || "").trim().toLowerCase()}%`,
      `%${String(search || "").trim().toLowerCase()}%`,
      `%${String(search || "").trim().toLowerCase()}%`,
      `%${String(search || "").trim().toLowerCase().replace(",", ".")}%`,
      Number(limit) > 0 ? Math.min(Number(limit), 200) : 50,
    );
}

export function getVendaDetalhe(vendaId) {
  assertTerminalConfigurado();
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const venda = db
    .prepare(
      `SELECT
         v.venda_id,
         v.caixa_id,
         v.pessoa_id,
         v.cliente_tipo_documento,
         v.cliente_documento,
         v.cliente_nome,
         v.cliente_email,
         v.status,
         v.total_produtos,
         v.total_desconto,
         v.total_liquido,
         v.criada_em,
         v.concluida_em,
         v.cancelada_em,
         v.cancelamento_motivo,
         c.operador_nome,
         c.terminal_codigo,
         n.nfce_id,
         n.status AS nfce_status,
         n.chave_acesso,
         n.numero AS nfce_numero,
         n.serie AS nfce_serie,
         n.recibo AS nfce_recibo,
         n.protocolo,
         n.cstat AS nfce_cstat,
         n.motivo AS nfce_motivo,
         n.tp_emis AS nfce_tp_emis,
         n.contingencia_em AS nfce_contingencia_em,
         n.contingencia_justificativa AS nfce_contingencia_justificativa,
         n.pdf_path AS nfce_pdf_path,
         n.xml AS nfce_xml,
         n.xml_assinado AS nfce_xml_assinado,
         n.emitida_em
       FROM venda v
       LEFT JOIN caixa c ON c.caixa_id = v.caixa_id
       LEFT JOIN nfce n ON n.venda_id = v.venda_id
       WHERE v.tenant_erp_id = ?
         AND v.venda_id = ?
       LIMIT 1`,
    )
    .get(tenantErpId, Number(vendaId));

  if (!venda) {
    throw new Error("Venda local não encontrada.");
  }

  const itens = db
    .prepare(
      `SELECT
         venda_item_id,
         venda_id,
         vi.produto_id,
         p.erp_id AS produto_erp_id,
         vi.codigo_produto,
         vi.descricao,
         vi.unidade,
         vi.quantidade,
         vi.valor_unitario,
         vi.valor_total
       FROM venda_item vi
       LEFT JOIN produto p ON p.produto_id = vi.produto_id
       WHERE vi.tenant_erp_id = ?
         AND venda_id = ?
       ORDER BY venda_item_id ASC`,
    )
    .all(tenantErpId, Number(vendaId));

  const pagamentos = db
    .prepare(
      `SELECT
         pagamento_id,
         venda_id,
         forma,
         valor,
         autorizado,
         criado_em
       FROM venda_pagamento
       WHERE tenant_erp_id = ?
         AND venda_id = ?
       ORDER BY pagamento_id ASC`,
    )
    .all(tenantErpId, Number(vendaId));

  return { ...venda, itens, pagamentos };
}

export function cancelarVenda(vendaId, { motivo = "Cancelamento manual no PDV." } = {}) {
  assertTerminalConfigurado();
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const saleId = Number(vendaId);
  const cancelReason = String(motivo || "").trim() || "Cancelamento manual no PDV.";

  const cancel = db.transaction(() => {
    const venda = getVendaDetalhe(saleId);

    if (venda.status === vendaStatus.CANCELADA) {
      throw new Error("Esta venda já está cancelada.");
    }

    if (venda.nfce_status === nfceStatus.AUTORIZADA) {
      throw new Error("A venda possui NFC-e autorizada. Faça primeiro o cancelamento fiscal.");
    }

    if ([nfceStatus.CONTINGENCIA, nfceStatus.REJEITADA].includes(venda.nfce_status)) {
      throw new Error(
        "A venda possui NFC-e em contingência ou rejeitada. Regularize primeiro a situação fiscal antes do cancelamento.",
      );
    }

    for (const item of venda.itens) {
      db.prepare(
        `UPDATE produto
         SET estoque_atual = estoque_atual + ?, atualizado_em = CURRENT_TIMESTAMP
         WHERE tenant_erp_id = ?
           AND produto_id = ?`,
      ).run(Number(item.quantidade || 0), tenantErpId, item.produto_id);
    }

    db.prepare(
      `UPDATE venda
       SET status = ?, cancelada_em = CURRENT_TIMESTAMP, cancelamento_motivo = ?
       WHERE tenant_erp_id = ?
         AND venda_id = ?`,
    ).run(vendaStatus.CANCELADA, cancelReason, tenantErpId, saleId);

    db.prepare(
      `UPDATE nfce
       SET status = ?, motivo = ?, atualizado_em = CURRENT_TIMESTAMP
       WHERE tenant_erp_id = ?
         AND venda_id = ?`,
    ).run(nfceStatus.CANCELADA, cancelReason, tenantErpId, saleId);

    return getVendaDetalhe(saleId);
  });

  const vendaCancelada = cancel();
  enqueueSyncEvent(syncEventTypes.VENDA_CANCELADA, vendaCancelada);
  enqueueSyncEvent(syncEventTypes.NFCE_CANCELADA, {
    venda_id: vendaCancelada.venda_id,
    motivo: vendaCancelada.cancelamento_motivo,
    status: vendaCancelada.nfce_status,
  });
  return vendaCancelada;
}

export function descartarVendaRascunho(vendaId) {
  assertTerminalConfigurado();
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const saleId = Number(vendaId);

  const discard = db.transaction(() => {
    const venda = getVendaDetalhe(saleId);

    if (venda.status !== vendaStatus.RASCUNHO) {
      throw new Error("Somente vendas em rascunho podem ser descartadas.");
    }

    descartarVendaProvisoria(db, tenantErpId, saleId);
    return { venda_id: saleId, descartada: true };
  });

  return discard();
}

export async function emitirVendaEmContingencia(vendaId, options = {}) {
  assertTerminalConfigurado();
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const saleId = Number(vendaId);
  const venda = getVendaDetalhe(saleId);

  if (venda.status !== vendaStatus.RASCUNHO) {
    throw new Error("A venda não está mais disponível para emissão em contingência.");
  }

  const fiscal = await emitirNfce(venda, {
    mode: "contingencia_offline",
    contingenciaJustificativa: options.contingenciaJustificativa,
  });

  if (fiscal.status !== nfceStatus.CONTINGENCIA) {
    throw new Error(fiscal?.message || "Não foi possível emitir a NFC-e em contingência offline.");
  }

  const finalize = db.transaction(() => {
    aplicarMovimentoEstoque(db, tenantErpId, venda.itens || [], "saida");
    marcarVendaConcluida(db, tenantErpId, saleId);
    return getVendaDetalhe(saleId);
  });

  const vendaFinalizada = finalize();
  enqueueSyncEvent(syncEventTypes.VENDA_CRIADA, vendaFinalizada);
  enqueueSyncEvent(syncEventTypes.NFCE_CONTINGENCIA, fiscal);

  return { venda: vendaFinalizada, fiscal };
}

export async function transmitirVendaContingencia(vendaId) {
  assertTerminalConfigurado();
  const saleId = Number(vendaId);
  const venda = getVendaDetalhe(saleId);

  if (venda.status !== vendaStatus.CONCLUIDA || venda.nfce_status !== nfceStatus.CONTINGENCIA) {
    throw new Error("A venda selecionada não possui NFC-e em contingência pendente de transmissão.");
  }

  const fiscal = await emitirNfce(venda, {
    mode: "transmitir_contingencia_xml",
    xmlContent: venda.nfce_xml_assinado || venda.nfce_xml || null,
  });

  if (fiscal.success) {
    enqueueSyncEvent(syncEventTypes.NFCE_AUTORIZADA, fiscal);
  } else if (fiscal.status === nfceStatus.REJEITADA) {
    enqueueSyncEvent(syncEventTypes.NFCE_REJEITADA, fiscal);
  }

  return {
    venda: getVendaDetalhe(saleId),
    fiscal,
  };
}

export async function reenviarContingenciasNfce({ limit = 20 } = {}) {
  assertTerminalConfigurado();
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const pendencias = db
    .prepare(
      `SELECT v.venda_id
       FROM venda v
       JOIN nfce n
         ON n.venda_id = v.venda_id
        AND n.tenant_erp_id = v.tenant_erp_id
       WHERE v.tenant_erp_id = ?
         AND v.status = ?
         AND n.status = ?
       ORDER BY COALESCE(n.atualizado_em, n.emitida_em) ASC, v.venda_id ASC
       LIMIT ?`,
    )
    .all(tenantErpId, vendaStatus.CONCLUIDA, nfceStatus.CONTINGENCIA, Number(limit) || 20);

  const resultados = [];

  for (const item of pendencias) {
    const { fiscal } = await transmitirVendaContingencia(item.venda_id);

    resultados.push({
      venda_id: Number(item.venda_id),
      status: fiscal.status,
      message: fiscal.message,
      chave_acesso: fiscal.chave_acesso || null,
    });
  }

  return {
    total: pendencias.length,
    autorizadas: resultados.filter((item) => item.status === nfceStatus.AUTORIZADA).length,
    em_contingencia: resultados.filter((item) => item.status === nfceStatus.CONTINGENCIA).length,
    rejeitadas: resultados.filter((item) => item.status === nfceStatus.REJEITADA).length,
    resultados,
  };
}
