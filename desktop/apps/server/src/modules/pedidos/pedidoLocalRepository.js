import { getDb } from "../../db/connection.js";
import { getCaixaAberto } from "../caixa/caixaRepository.js";
import { assertTerminalConfigurado, getTerminalTenantErpId } from "../configuracao/localConfigRepository.js";

const PEDIDO_STATUS = Object.freeze({
  ENVIADO: "enviado",
  IMPORTADO: "importado",
  CANCELADO: "cancelado",
});

function normalizeText(value) {
  return String(value || "").trim();
}

function isProdutoControlaEstoque(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function getTenantContext() {
  assertTerminalConfigurado();
  const tenantErpId = getTerminalTenantErpId();
  if (!tenantErpId) {
    throw new Error("PDV local ainda não pareado com uma filial do ERP.");
  }
  return { tenantErpId };
}

function buildDayBounds(dateValue = null) {
  const localDay =
    String(dateValue || "").trim() ||
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  const start = new Date(`${localDay}T00:00:00-03:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    localDay,
    startUtc: start.toISOString().slice(0, 19).replace("T", " "),
    endUtc: end.toISOString().slice(0, 19).replace("T", " "),
  };
}

function formatPedidoReferencia(numeroPedido) {
  return `#PEDIDO ${String(Number(numeroPedido) || 0).padStart(4, "0")}`;
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
         estoque_atual,
         controla_estoque,
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
  const pedido = db
    .prepare(
      `SELECT
         pedido_id,
         tenant_erp_id,
         operador_id,
         operador_nome,
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

  if (!pedido) {
    return null;
  }

  return {
    ...pedido,
    numero_pedido: Number(pedido.pedido_id),
    referencia_formatada: formatPedidoReferencia(pedido.pedido_id),
  };
}

function getNextPedidoNumber(db, tenantErpId) {
  const row = db
    .prepare(
      `SELECT COALESCE(MAX(pedido_id), 0) + 1 AS next_id
       FROM pedido_local
       WHERE tenant_erp_id = ?`,
    )
    .get(tenantErpId);

  return Number(row?.next_id || 1);
}

function validarCaixaAberto() {
  const caixa = getCaixaAberto();
  if (!caixa) {
    throw new Error("Não existe caixa aberto para receber pedidos nesta filial.");
  }
  if (caixa.caixa_pendente_dia_anterior) {
    throw new Error(
      `Existe um caixa aberto do dia ${caixa.data_operacional}. Feche esse caixa antes de registrar pedidos.`,
    );
  }
  return caixa;
}

function buildPedidoItems(db, tenantErpId, pedidoId) {
  return db
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
}

function validatePedidoPayload({ db, tenantErpId, payload }) {
  const itens = Array.isArray(payload.itens) ? payload.itens : [];
  const operadorId = Number(payload.operador_id || 0);
  const operador = operadorId ? getOperadorPedido(db, tenantErpId, operadorId) : null;

  if (!operador || !Number(operador.ativo)) {
    throw new Error("Operador inválido ou inativo para lançar pedido.");
  }

  if (!itens.length) {
    throw new Error("Informe ao menos um item no pedido.");
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

    const controlaEstoque = isProdutoControlaEstoque(produto.controla_estoque);
    const estoqueDisponivel = Math.max(0, Number(produto.estoque_atual || 0));
    if (controlaEstoque && quantidade > estoqueDisponivel) {
      throw new Error(`Estoque insuficiente para ${produto.descricao}. Disponível: ${estoqueDisponivel}.`);
    }

    return {
      produto_id: produto.produto_id,
      codigo_produto: produto.codigo || null,
      descricao: produto.descricao,
      unidade: produto.unidade || "UN",
      quantidade,
      valor_unitario: Number(produto.preco_venda || 0),
      valor_total: Number((quantidade * Number(produto.preco_venda || 0)).toFixed(2)),
      observacao: observacao || null,
    };
  });

  const totalItens = itensValidados.reduce((acc, item) => acc + Number(item.quantidade || 0), 0);
  const totalLiquido = itensValidados.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);

  return {
    operador,
    clienteNome: normalizeText(payload.cliente_nome) || null,
    observacao: normalizeText(payload.observacao) || null,
    itensValidados,
    totalItens,
    totalLiquido: Number(totalLiquido.toFixed(2)),
  };
}

export function obterProximoNumeroPedidoLocal() {
  const { tenantErpId } = getTenantContext();
  const db = getDb();
  validarCaixaAberto();
  const nextNumber = getNextPedidoNumber(db, tenantErpId);

  return {
    numero_pedido: nextNumber,
    referencia: formatPedidoReferencia(nextNumber),
  };
}

export function listarPedidosLocais({ search = "", limit = 80, date = null, status = "" } = {}) {
  const { tenantErpId } = getTenantContext();
  const db = getDb();
  const normalizedSearch = normalizeText(search).toLowerCase();
  const normalizedStatus = normalizeText(status).toLowerCase();
  const bounds = buildDayBounds(date);

  return db
    .prepare(
      `SELECT
         pedido_id,
         operador_id,
         operador_nome,
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
         AND criado_em >= ?
         AND criado_em < ?
         AND (? = '' OR status = ?)
         AND (? = '' OR status <> ?)
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
      bounds.startUtc,
      bounds.endUtc,
      normalizedStatus,
      normalizedStatus,
      normalizedStatus,
      PEDIDO_STATUS.CANCELADO,
      normalizedSearch,
      `%${normalizedSearch}%`,
      `%${normalizedSearch}%`,
      `%${normalizedSearch}%`,
      Number(limit) > 0 ? Math.min(Number(limit), 200) : 80,
    )
    .map((pedido) => ({
      ...pedido,
      numero_pedido: Number(pedido.pedido_id),
      referencia_formatada: formatPedidoReferencia(pedido.pedido_id),
      data_operacional: bounds.localDay,
      editavel: pedido.status === PEDIDO_STATUS.ENVIADO,
    }));
}

export function getPedidoLocalDetalhe(pedidoId) {
  const { tenantErpId } = getTenantContext();
  const db = getDb();
  const pedido = getPedidoBase(db, tenantErpId, pedidoId);

  if (!pedido) {
    throw new Error("Pedido local não encontrado.");
  }

  return {
    ...pedido,
    editavel: pedido.status === PEDIDO_STATUS.ENVIADO,
    itens: buildPedidoItems(db, tenantErpId, pedidoId),
  };
}

export function criarPedidoLocal(payload = {}) {
  const { tenantErpId } = getTenantContext();
  const db = getDb();
  validarCaixaAberto();

  const normalized = validatePedidoPayload({
    db,
    tenantErpId,
    payload,
  });

  const pedidoId = db.transaction(() => {
    const nextNumber = getNextPedidoNumber(db, tenantErpId);
    const result = db
      .prepare(
        `INSERT INTO pedido_local (
           tenant_erp_id,
           operador_id,
           operador_nome,
           referencia,
           cliente_nome,
           observacao,
           status,
           total_itens,
           total_liquido,
           enviado_em
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      )
      .run(
        tenantErpId,
        normalized.operador.operador_id,
        normalized.operador.nome,
        formatPedidoReferencia(nextNumber),
        normalized.clienteNome,
        normalized.observacao,
        PEDIDO_STATUS.ENVIADO,
        normalized.totalItens,
        normalized.totalLiquido,
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

    for (const item of normalized.itensValidados) {
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

export function atualizarPedidoLocal(pedidoId, payload = {}) {
  const { tenantErpId } = getTenantContext();
  const db = getDb();
  validarCaixaAberto();

  const pedido = getPedidoBase(db, tenantErpId, pedidoId);
  if (!pedido) {
    throw new Error("Pedido local não encontrado.");
  }

  if (pedido.status !== PEDIDO_STATUS.ENVIADO) {
    throw new Error("Somente pedidos pendentes podem ser alterados.");
  }

  const normalized = validatePedidoPayload({
    db,
    tenantErpId,
    payload,
  });

  db.transaction(() => {
    db.prepare(
      `UPDATE pedido_local
       SET operador_id = ?,
           operador_nome = ?,
           cliente_nome = ?,
           observacao = ?,
           total_itens = ?,
           total_liquido = ?,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE tenant_erp_id = ?
         AND pedido_id = ?`,
    ).run(
      normalized.operador.operador_id,
      normalized.operador.nome,
      normalized.clienteNome,
      normalized.observacao,
      normalized.totalItens,
      normalized.totalLiquido,
      tenantErpId,
      Number(pedidoId),
    );

    db.prepare(
      `DELETE FROM pedido_local_item
       WHERE tenant_erp_id = ?
         AND pedido_id = ?`,
    ).run(tenantErpId, Number(pedidoId));

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

    for (const item of normalized.itensValidados) {
      insertItem.run(
        Number(pedidoId),
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
    throw new Error("Pedido já importado não pode ser excluído.");
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
