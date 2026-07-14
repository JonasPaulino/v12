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

export async function criarVenda({
  pessoaId,
  cliente,
  items = [],
  pagamentos = [],
  subtotal = null,
  desconto = 0,
  totalLiquido = null,
}) {
  assertTerminalConfigurado();
  const caixa = getCaixaAberto();
  const tenantErpId = getTerminalTenantErpId();
  if (!caixa) {
    throw new Error("Nao existe caixa aberto.");
  }

  if (!tenantErpId || Number(caixa.tenant_erp_id) !== Number(tenantErpId)) {
    throw new Error("O caixa aberto nao pertence a filial configurada neste PDV.");
  }

  if (!items.length) {
    throw new Error("Informe ao menos um item.");
  }

  const clienteIdentificado = normalizeIdentificacaoCliente(cliente);
  const db = getDb();
  const create = db.transaction(() => {
    const totalProdutosCalculado = items.reduce((acc, item) => {
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
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      )
      .run(
        tenantErpId,
        caixa.caixa_id,
        pessoaId || null,
        clienteIdentificado.tipoDocumento,
        clienteIdentificado.documento,
        clienteIdentificado.nome,
        clienteIdentificado.email,
        vendaStatus.CONCLUIDA,
        totalProdutos,
        totalDesconto,
        totalLiquidoVenda,
      );

    const vendaId = vendaResult.lastInsertRowid;

    const insertItem = db.prepare(
      `INSERT INTO venda_item (tenant_erp_id, venda_id, produto_id, codigo_produto, descricao, quantidade, valor_unitario, unidade, valor_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const item of items) {
      const quantidade = Number(item.quantidade || 0);
      const valorUnitario = Number(item.valor_unitario || 0);
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

      db.prepare(
        `UPDATE produto
         SET estoque_atual = estoque_atual - ?, atualizado_em = CURRENT_TIMESTAMP
         WHERE tenant_erp_id = ?
           AND produto_id = ?`,
      ).run(quantidade, tenantErpId, item.produto_id);
    }

    const insertPagamento = db.prepare(
      `INSERT INTO venda_pagamento (tenant_erp_id, venda_id, forma, valor)
       VALUES (?, ?, ?, ?)`,
    );

    for (const pagamento of pagamentos.map(normalizePayment)) {
      insertPagamento.run(tenantErpId, vendaId, pagamento.forma, pagamento.valor);
    }

    db.prepare(
      `INSERT INTO nfce (tenant_erp_id, venda_id, status)
       VALUES (?, ?, ?)`,
    ).run(tenantErpId, vendaId, nfceStatus.PENDENTE);

    return getVendaDetalhe(vendaId);
  });

  const venda = create();
  enqueueSyncEvent(syncEventTypes.VENDA_CRIADA, venda);

  const fiscal = await emitirNfce(venda);
  if (fiscal.success) {
    enqueueSyncEvent(syncEventTypes.NFCE_EMITIDA, fiscal);
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
         AND (? = '' OR v.status = ?)
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
         n.pdf_path AS nfce_pdf_path,
         n.xml AS nfce_xml,
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
