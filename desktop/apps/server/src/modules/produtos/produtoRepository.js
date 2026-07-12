import { getDb } from "../../db/connection.js";
import { getTerminalTenantErpId } from "../configuracao/localConfigRepository.js";

export function listProdutos({ search = "", limit = 50 } = {}) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const like = `%${search}%`;
  return db
    .prepare(
      `SELECT produto_id, erp_id, codigo, descricao, unidade, ncm, cest, preco_venda, estoque_atual, ativo
       FROM produto
       WHERE tenant_erp_id = ?
         AND ativo = 1
         AND (? = '' OR descricao LIKE ? OR codigo LIKE ?)
       ORDER BY descricao
       LIMIT ?`,
    )
    .all(tenantErpId, search, like, like, limit);
}

export function upsertProduto(produto) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  if (!tenantErpId) {
    throw new Error("PDV local ainda não pareado com uma filial do ERP.");
  }
  const payload = {
    tenant_erp_id: tenantErpId,
    erp_id: produto.erp_id || null,
    codigo: produto.codigo || null,
    descricao: produto.descricao,
    unidade: produto.unidade || "UN",
    ncm: produto.ncm || null,
    cest: produto.cest || null,
    preco_venda: Number(produto.preco_venda || 0),
    estoque_atual: Number(produto.estoque_atual || 0),
    ativo: produto.ativo === false ? 0 : 1,
  };

  const result = payload.erp_id
      ? db
        .prepare(
          `INSERT INTO produto (tenant_erp_id, erp_id, codigo, descricao, unidade, ncm, cest, preco_venda, estoque_atual, ativo, sincronizado_em)
           VALUES (@tenant_erp_id, @erp_id, @codigo, @descricao, @unidade, @ncm, @cest, @preco_venda, @estoque_atual, @ativo, CURRENT_TIMESTAMP)
           ON CONFLICT(erp_id) WHERE erp_id IS NOT NULL DO UPDATE SET
             tenant_erp_id = excluded.tenant_erp_id,
             codigo = excluded.codigo,
             descricao = excluded.descricao,
             unidade = excluded.unidade,
             ncm = excluded.ncm,
             cest = excluded.cest,
             preco_venda = excluded.preco_venda,
             estoque_atual = excluded.estoque_atual,
             ativo = excluded.ativo,
             sincronizado_em = CURRENT_TIMESTAMP,
             atualizado_em = CURRENT_TIMESTAMP`,
        )
        .run(payload)
      : db
        .prepare(
          `INSERT INTO produto (tenant_erp_id, erp_id, codigo, descricao, unidade, ncm, cest, preco_venda, estoque_atual, ativo, sincronizado_em)
           VALUES (@tenant_erp_id, @erp_id, @codigo, @descricao, @unidade, @ncm, @cest, @preco_venda, @estoque_atual, @ativo, CURRENT_TIMESTAMP)`,
        )
        .run(payload);

  return result.lastInsertRowid;
}

export function upsertProdutos(produtos = []) {
  const db = getDb();
  const sync = db.transaction((items) => {
    for (const produto of items) {
      upsertProduto(produto);
    }
  });

  sync(produtos);
  return produtos.length;
}
