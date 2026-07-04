import { getDb } from "../../db/connection.js";

export function listProdutos({ search = "", limit = 50 } = {}) {
  const db = getDb();
  const like = `%${search}%`;
  return db
    .prepare(
      `SELECT produto_id, erp_id, codigo, descricao, unidade, ncm, cest, preco_venda, estoque_atual, ativo
       FROM produto
       WHERE ativo = 1
         AND (? = '' OR descricao LIKE ? OR codigo LIKE ?)
       ORDER BY descricao
       LIMIT ?`,
    )
    .all(search, like, like, limit);
}

export function upsertProduto(produto) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO produto (erp_id, codigo, descricao, unidade, ncm, cest, preco_venda, estoque_atual, ativo, sincronizado_em)
       VALUES (@erp_id, @codigo, @descricao, @unidade, @ncm, @cest, @preco_venda, @estoque_atual, @ativo, CURRENT_TIMESTAMP)
       ON CONFLICT(produto_id) DO UPDATE SET
         codigo = excluded.codigo,
         descricao = excluded.descricao,
         unidade = excluded.unidade,
         ncm = excluded.ncm,
         cest = excluded.cest,
         preco_venda = excluded.preco_venda,
         estoque_atual = excluded.estoque_atual,
         ativo = excluded.ativo,
         atualizado_em = CURRENT_TIMESTAMP`,
    )
    .run({
      erp_id: produto.erp_id || null,
      codigo: produto.codigo || null,
      descricao: produto.descricao,
      unidade: produto.unidade || "UN",
      ncm: produto.ncm || null,
      cest: produto.cest || null,
      preco_venda: Number(produto.preco_venda || 0),
      estoque_atual: Number(produto.estoque_atual || 0),
      ativo: produto.ativo === false ? 0 : 1,
    });

  return result.lastInsertRowid;
}
