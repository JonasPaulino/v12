import { getDb } from "../../db/connection.js";
import { assertTerminalConfigurado, getTerminalTenantErpId } from "../configuracao/localConfigRepository.js";

const PEDIDO_STATUS = Object.freeze({
  ENVIADO: "enviado",
  IMPORTADO: "importado",
  CANCELADO: "cancelado",
});

function normalizeText(value) {
  return String(value || "").trim();
}

function getTenantContext() {
  assertTerminalConfigurado();
  const tenantErpId = getTerminalTenantErpId();
  if (!tenantErpId) {
    throw new Error("PDV local ainda não pareado com uma filial do ERP.");
  }
  return { tenantErpId };
}

function getProdutoPedido(db, tenantErpId, produtoId) {
  return db
    .prepare(
      `SELECT
         produto_id,
         codigo,
         descricao,
         unidade,
         preco_venda,
         ativo
       FROM produto
       WHERE tenant_erp_id = ?
         AND produto_id = ?
       LIMIT 1`,
    )
    .get(tenantErpId, Number(produtoId));
}

function getOperadorPedido(db, tenantErpId, operadorId) {
  return db
    .prepare(
      `SELECT operador_id, nome, ativo
       FROM operador_local
       WHERE tenant_erp_id = ?
         AND operador_id = ?
       LIMIT 1`,
    )
    .get(tenantErpId, Number(operadorId));
}

function getPedidoBase(db, tenantErpId, pedidoId) {
  return db
    .prepare(
      `SELECT
         pedido_id,
         tenant_erp_id,
         operador_id,
         operador_nome,
         tipo_referencia,
         referencia,
         cliente_nome,
         observacao,
         status,
         total_itens,
         total_liquido,
         importado_venda_id,
         criado_em,
         atualizado_em,
         enviado_em,
         importado_em,
         cancelado_em
       FROM pedido_local
       WHERE tenant_erp_id = ?
         AND pedido_id = ?
       LIMIT 1`,
    )
    .get(tenantErpId, Number(pedidoId));
}

export function listarPedidosLocais({ status = PEDIDO_STATUS.ENVIADO, search = "", limit = 80 } = {}) {
  const { tenantErpId } = getTenantContext();
  const normalizedStatus = normalizeText(status).toLowerCase();
  const normalizedSearch = normalizeText(search).toLowerCase();

  return getDb()
    .prepare(
      `SELECT
         pedido_id,
         operador_id,
         operador_nome,
         tipo_referencia,
         referencia,
         cliente_nome,
         observacao,
         status,
         total_itens,
         total_liquido,
         criado_em,
         enviado_em,
         importado_em
       FROM pedido_local
       WHERE tenant_erp_id = ?
         AND (? = '' OR status = ?)
         AND (
           ? = ''
           OR LOWER(referencia) LIKE ?
           OR LOWER(COALESCE(cliente_nome, '')) LIKE ?
           OR LOWER(COALESCE(operador_nome, '')) LIKE ?
         )
       ORDER BY pedido_id DESC
       LIMIT ?`,
    )
    .all(
      tenantErpId,
      normalizedStatus,
      normalizedStatus,
      normalizedSearch,
      `%${normalizedSearch}%`,
      `%${normalizedSearch}%`,
      `%${normalizedSearch}%`,
      Number(limit) > 0 ? Math.min(Number(limit), 200) : 80,
    );
}

export function getPedidoLocalDetalhe(pedidoId) {
  const { tenantErpId } = getTenantContext();
  const db = getDb();
  const pedido = getPedidoBase(db, tenantErpId, pedidoId);

  if (!pedido) {
    throw new Error("Pedido local não encontrado.");
  }

  const itens = db
    .prepare(
      `SELECT
         pli.pedido_item_id,
         pli.pedido_id,
         pli.produto_id,
         pli.codigo_produto,
         pli.descricao,
         pli.unidade,
         pli.quantidade,
         pli.valor_unitario,
         pli.valor_total,
         pli.observacao,
         p.estoque_atual,
         p.controla_estoque
       FROM pedido_local_item pli
       LEFT JOIN produto p ON p.produto_id = pli.produto_id
       WHERE pli.tenant_erp_id = ?
         AND pli.pedido_id = ?
       ORDER BY pli.pedido_item_id ASC`,
    )
    .all(tenantErpId, Number(pedidoId));

  return { ...pedido, itens };
}

export function criarPedidoLocal(payload = {}) {
  const { tenantErpId } = getTenantContext();
  const db = getDb();
  const itens = Array.isArray(payload.itens) ? payload.itens : [];
  const referencia = normalizeText(payload.referencia);

  if (!referencia) {
    throw new Error("Informe a referência do pedido.");
  }

  if (!itens.length) {
    throw new Error("Informe ao menos um item no pedido.");
  }

  const operadorId = Number(payload.operador_id || 0);
  const operador = operadorId ? getOperadorPedido(db, tenantErpId, operadorId) : null;

  if (!operador || !Number(operador.ativo)) {
    throw new Error("Operador inválido ou inativo para lançar pedido.");
  }

  const itensValidados = itens.map((item) => {
    const produtoId = Number(item.produto_id || 0);
    const quantidade = Number(item.quantidade || 0);
    const observacao = normalizeText(item.observacao);

    if (!produtoId) {
      throw new Error("Produto inválido no pedido.");
    }

    if (quantidade <= 0) {
      throw new Error("A quantidade do item deve ser maior que zero.");
    }

    const produto = getProdutoPedido(db, tenantErpId, produtoId);
    if (!produto || !Number(produto.ativo)) {
      throw new Error(`Produto ${item.descricao || produtoId} indisponível no PDV.`);
    }

    const valorUnitario = Number(produto.preco_venda || 0);
    return {
      produto_id: produto.produto_id,
      codigo_produto: produto.codigo || null,
      descricao: produto.descricao,
      unidade: produto.unidade || "UN",
      quantidade,
      valor_unitario: valorUnitario,
      valor_total: Number((quantidade * valorUnitario).toFixed(2)),
      observacao: observacao || null,
    };
  });

  const totalItens = itensValidados.reduce((acc, item) => acc + Number(item.quantidade || 0), 0);
  const totalLiquido = itensValidados.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);

  const pedidoId = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO pedido_local (
           tenant_erp_id,
           operador_id,
           operador_nome,
           tipo_referencia,
           referencia,
           cliente_nome,
           observacao,
           status,
           total_itens,
           total_liquido,
           enviado_em
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      )
      .run(
        tenantErpId,
        operador.operador_id,
        operador.nome,
        normalizeText(payload.tipo_referencia).toLowerCase() || "pedido",
        referencia,
        normalizeText(payload.cliente_nome) || null,
        normalizeText(payload.observacao) || null,
        PEDIDO_STATUS.ENVIADO,
        totalItens,
        Number(totalLiquido.toFixed(2)),
      );

    const insertItem = db.prepare(
      `INSERT INTO pedido_local_item (
         pedido_id,
         tenant_erp_id,
         produto_id,
         codigo_produto,
         descricao,
         unidade,
         quantidade,
         valor_unitario,
         valor_total,
         observacao
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const item of itensValidados) {
      insertItem.run(
        result.lastInsertRowid,
        tenantErpId,
        item.produto_id,
        item.codigo_produto,
        item.descricao,
        item.unidade,
        item.quantidade,
        item.valor_unitario,
        item.valor_total,
        item.observacao,
      );
    }

    return result.lastInsertRowid;
  })();

  return getPedidoLocalDetalhe(pedidoId);
}

export function marcarPedidoLocalImportado(pedidoId, { vendaId = null } = {}) {
  const { tenantErpId } = getTenantContext();
  const db = getDb();
  const pedido = getPedidoBase(db, tenantErpId, pedidoId);

  if (!pedido) {
    throw new Error("Pedido local não encontrado.");
  }

  if (pedido.status !== PEDIDO_STATUS.ENVIADO) {
    throw new Error("Somente pedidos enviados podem ser importados para a venda.");
  }

  db.prepare(
    `UPDATE pedido_local
     SET status = ?,
         importado_venda_id = ?,
         importado_em = CURRENT_TIMESTAMP,
         atualizado_em = CURRENT_TIMESTAMP
     WHERE tenant_erp_id = ?
       AND pedido_id = ?`,
  ).run(PEDIDO_STATUS.IMPORTADO, vendaId || null, tenantErpId, Number(pedidoId));

  return getPedidoLocalDetalhe(pedidoId);
}

export function cancelarPedidoLocal(pedidoId) {
  const { tenantErpId } = getTenantContext();
  const db = getDb();
  const pedido = getPedidoBase(db, tenantErpId, pedidoId);

  if (!pedido) {
    throw new Error("Pedido local não encontrado.");
  }

  if (pedido.status === PEDIDO_STATUS.IMPORTADO) {
    throw new Error("Pedido já importado não pode ser cancelado.");
  }

  db.prepare(
    `UPDATE pedido_local
     SET status = ?,
         cancelado_em = CURRENT_TIMESTAMP,
         atualizado_em = CURRENT_TIMESTAMP
     WHERE tenant_erp_id = ?
       AND pedido_id = ?`,
  ).run(PEDIDO_STATUS.CANCELADO, tenantErpId, Number(pedidoId));

  return getPedidoLocalDetalhe(pedidoId);
}
