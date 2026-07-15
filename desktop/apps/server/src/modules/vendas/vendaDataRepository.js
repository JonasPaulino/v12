import { formaPagamento, nfceStatus, vendaStatus } from "@v12-desktop/shared";
import { getDb } from "../../db/connection.js";
import { assertTerminalConfigurado, getTerminalTenantErpId } from "../configuracao/localConfigRepository.js";
import { getNfceByVendaId } from "./nfceRepository.js";

function toBooleanFlag(value, defaultValue = true) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "sim", "yes", "t"].includes(normalized)) return true;
  if (["0", "false", "nao", "não", "no", "f"].includes(normalized)) return false;
  return defaultValue;
}

export function normalizePayment(payment) {
  return {
    forma: payment.forma || formaPagamento.DINHEIRO,
    valor: Number(payment.valor || 0),
  };
}

export function normalizeIdentificacaoCliente(cliente) {
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
      `SELECT produto_id, tenant_erp_id, descricao, ativo, estoque_atual, controla_estoque
       FROM produto
       WHERE tenant_erp_id = ?
         AND produto_id = ?
       LIMIT 1`,
    )
    .get(tenantErpId, Number(produtoId));
}

export function validarItensVenda(db, tenantErpId, items = []) {
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

    const controlaEstoque = toBooleanFlag(produto.controla_estoque, true);
    const estoqueDisponivel = Number(produto.estoque_atual || 0);
    if (controlaEstoque && quantidade > estoqueDisponivel) {
      throw new Error(
        `Estoque insuficiente para ${produto.descricao || item.descricao}. Disponível: ${estoqueDisponivel}.`,
      );
    }

    validatedItems.push({
      ...item,
      quantidade,
      valor_unitario: valorUnitario,
      estoque_atual: estoqueDisponivel,
      controla_estoque: controlaEstoque,
    });
  }

  return validatedItems;
}

export function aplicarMovimentoEstoque(db, tenantErpId, items = [], direction = "saida") {
  for (const item of items) {
    if (!toBooleanFlag(item.controla_estoque, true)) {
      continue;
    }

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

export function marcarVendaConcluida(db, tenantErpId, vendaId) {
  db.prepare(
    `UPDATE venda
     SET status = ?, concluida_em = CURRENT_TIMESTAMP
     WHERE tenant_erp_id = ?
       AND venda_id = ?`,
  ).run(vendaStatus.CONCLUIDA, tenantErpId, Number(vendaId));
}

export function descartarVendaProvisoria(db, tenantErpId, vendaId) {
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

export function garantirRegistroNfce(db, tenantErpId, vendaId) {
  const existente = getNfceByVendaId(vendaId);
  if (existente) {
    return existente;
  }

  db.prepare(
    `INSERT INTO nfce (tenant_erp_id, venda_id, status)
     VALUES (?, ?, ?)`,
  ).run(tenantErpId, Number(vendaId), nfceStatus.PENDENTE);

  return getNfceByVendaId(vendaId);
}

export function criarVendaPersistida({
  db,
  tenantErpId,
  caixaId,
  pessoaId,
  cliente,
  itensValidados = [],
  pagamentos = [],
  subtotal = null,
  desconto = 0,
  totalLiquido = null,
  emitirFiscal = false,
}) {
  const totalProdutosCalculado = itensValidados.reduce((acc, item) => {
    return acc + Number(item.quantidade || 0) * Number(item.valor_unitario || 0);
  }, 0);
  const totalProdutos = subtotal == null ? totalProdutosCalculado : Number(subtotal || 0);
  const totalDesconto = Math.max(0, Math.min(totalProdutos, Number(desconto || 0)));
  const totalLiquidoVenda =
    totalLiquido == null
      ? Number((totalProdutos - totalDesconto).toFixed(2))
      : Number(totalLiquido || 0);
  const pagamentosNormalizados = pagamentos.map(normalizePayment);
  const totalPagamentos = pagamentosNormalizados.reduce((acc, item) => acc + Number(item.valor || 0), 0);

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
      caixaId,
      pessoaId || null,
      cliente.tipoDocumento,
      cliente.documento,
      cliente.nome,
      cliente.email,
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

  for (const pagamento of pagamentosNormalizados) {
    insertPagamento.run(tenantErpId, vendaId, pagamento.forma, pagamento.valor);
  }

  if (emitirFiscal) {
    db.prepare(
      `INSERT INTO nfce (tenant_erp_id, venda_id, status)
       VALUES (?, ?, ?)`,
    ).run(tenantErpId, vendaId, nfceStatus.PENDENTE);
  } else {
    aplicarMovimentoEstoque(db, tenantErpId, itensValidados, "saida");
  }

  return getVendaDetalhe(vendaId);
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
