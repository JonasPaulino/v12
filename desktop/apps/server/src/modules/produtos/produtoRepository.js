import { getDb } from "../../db/connection.js";
import { getTerminalTenantErpId } from "../configuracao/localConfigRepository.js";

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

const PRODUTO_COLUMNS = [
  "tenant_erp_id",
  "erp_id",
  "codigo",
  "descricao",
  "descricao_fiscal",
  "gtin",
  "unidade",
  "ncm",
  "cest",
  "origem_mercadoria",
  "regra_tributaria_erp_id",
  "regra_fiscal_descricao",
  "crt_emitente",
  "cbenef",
  "cfop_venda_interna",
  "cfop_venda_interestadual",
  "icms_cst",
  "icms_csosn",
  "icms_aliquota",
  "icms_reducao_base",
  "icms_aliquota_fcp",
  "icms_modalidade_bc",
  "pis_cst",
  "pis_aliquota",
  "cofins_cst",
  "cofins_aliquota",
  "ipi_cst",
  "ipi_enquadramento",
  "ipi_aliquota",
  "ibpt_aliquota_federal_nacional",
  "ibpt_aliquota_federal_importado",
  "ibpt_aliquota_estadual",
  "ibpt_aliquota_municipal",
  "ibpt_fonte",
  "ibpt_chave",
  "ibpt_atualizado_em",
  "preco_venda",
  "estoque_atual",
  "controla_estoque",
  "ativo",
];

const PRODUTO_INSERT_COLUMNS_SQL = `${PRODUTO_COLUMNS.join(", ")}, sincronizado_em`;
const PRODUTO_INSERT_VALUES_SQL = `${PRODUTO_COLUMNS.map((column) => `@${column}`).join(", ")}, CURRENT_TIMESTAMP`;
const PRODUTO_UPDATE_SET_SQL = [
  ...PRODUTO_COLUMNS.map((column) => `${column} = excluded.${column}`),
  "sincronizado_em = CURRENT_TIMESTAMP",
  "atualizado_em = CURRENT_TIMESTAMP",
].join(",\n             ");

export function listProdutos({ search = "", limit = 50, strategy = "default" } = {}) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const like = `%${normalizedSearch}%`;
  const normalizedLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 50;

  const query =
    strategy === "mobile" && !normalizedSearch
      ? `SELECT
           p.produto_id,
           p.erp_id,
           p.codigo,
           p.descricao,
           p.descricao_fiscal,
           p.gtin,
           p.unidade,
           p.ncm,
           p.cest,
           p.origem_mercadoria,
           p.regra_tributaria_erp_id,
           p.regra_fiscal_descricao,
           p.crt_emitente,
           p.cbenef,
           p.cfop_venda_interna,
           p.cfop_venda_interestadual,
           p.icms_cst,
           p.icms_csosn,
           p.icms_aliquota,
           p.icms_reducao_base,
           p.icms_aliquota_fcp,
           p.icms_modalidade_bc,
           p.pis_cst,
           p.pis_aliquota,
           p.cofins_cst,
           p.cofins_aliquota,
           p.ipi_cst,
           p.ipi_enquadramento,
           p.ipi_aliquota,
           p.ibpt_aliquota_federal_nacional,
           p.ibpt_aliquota_federal_importado,
           p.ibpt_aliquota_estadual,
           p.ibpt_aliquota_municipal,
           p.ibpt_fonte,
           p.ibpt_chave,
           p.ibpt_atualizado_em,
           p.preco_venda,
           p.estoque_atual,
           p.controla_estoque,
           p.ativo
         FROM produto p
         LEFT JOIN (
           SELECT
             vi.produto_id,
             SUM(COALESCE(vi.quantidade, 0)) AS total_vendido
           FROM venda_item vi
           JOIN venda v ON v.venda_id = vi.venda_id
           WHERE v.tenant_erp_id = ?
             AND v.status = 'concluida'
           GROUP BY vi.produto_id
         ) mv ON mv.produto_id = p.produto_id
         WHERE p.tenant_erp_id = ?
           AND p.ativo = 1
         ORDER BY COALESCE(mv.total_vendido, 0) DESC, p.descricao
         LIMIT ?`
      : `SELECT
           produto_id,
           erp_id,
           codigo,
           descricao,
           descricao_fiscal,
           gtin,
           unidade,
           ncm,
           cest,
           origem_mercadoria,
           regra_tributaria_erp_id,
           regra_fiscal_descricao,
           crt_emitente,
           cbenef,
           cfop_venda_interna,
           cfop_venda_interestadual,
           icms_cst,
           icms_csosn,
           icms_aliquota,
           icms_reducao_base,
           icms_aliquota_fcp,
           icms_modalidade_bc,
           pis_cst,
           pis_aliquota,
           cofins_cst,
           cofins_aliquota,
           ipi_cst,
           ipi_enquadramento,
           ipi_aliquota,
           ibpt_aliquota_federal_nacional,
           ibpt_aliquota_federal_importado,
           ibpt_aliquota_estadual,
           ibpt_aliquota_municipal,
           ibpt_fonte,
           ibpt_chave,
           ibpt_atualizado_em,
           preco_venda,
           estoque_atual,
           controla_estoque,
           ativo
         FROM produto
         WHERE tenant_erp_id = ?
           AND ativo = 1
           AND (? = '' OR LOWER(descricao) LIKE ? OR LOWER(COALESCE(codigo, '')) LIKE ?)
         ORDER BY
           CASE
             WHEN LOWER(COALESCE(codigo, '')) = ? THEN 0
             WHEN LOWER(COALESCE(codigo, '')) LIKE ? THEN 1
             WHEN LOWER(descricao) LIKE ? THEN 2
             ELSE 3
           END,
           descricao
         LIMIT ?`;

  const rows =
    strategy === "mobile" && !normalizedSearch
      ? db.prepare(query).all(tenantErpId, tenantErpId, normalizedLimit)
      : db
          .prepare(query)
          .all(
            tenantErpId,
            normalizedSearch,
            like,
            like,
            normalizedSearch,
            `${normalizedSearch}%`,
            `${normalizedSearch}%`,
            normalizedLimit,
          );

  return rows
    .map((row) => ({
      ...row,
      preco_venda: Number(row.preco_venda || 0),
      estoque_atual: Number(row.estoque_atual || 0),
      controla_estoque: toBooleanFlag(row.controla_estoque, true),
      ativo: toBooleanFlag(row.ativo, true),
    }));
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
    descricao_fiscal: produto.descricao_fiscal || null,
    gtin: produto.gtin || null,
    unidade: produto.unidade || "UN",
    ncm: produto.ncm || null,
    cest: produto.cest || null,
    origem_mercadoria: produto.origem_mercadoria || null,
    regra_tributaria_erp_id: produto.regra_tributaria_id || null,
    regra_fiscal_descricao: produto.regra_fiscal_descricao || null,
    crt_emitente: produto.crt_emitente || null,
    cbenef: produto.cbenef || null,
    cfop_venda_interna: produto.cfop_venda_interna || null,
    cfop_venda_interestadual: produto.cfop_venda_interestadual || null,
    icms_cst: produto.icms_cst || null,
    icms_csosn: produto.icms_csosn || null,
    icms_aliquota: Number(produto.icms_aliquota || 0),
    icms_reducao_base: Number(produto.icms_reducao_base || 0),
    icms_aliquota_fcp: Number(produto.icms_aliquota_fcp || 0),
    icms_modalidade_bc: produto.icms_modalidade_bc || null,
    pis_cst: produto.pis_cst || null,
    pis_aliquota: Number(produto.pis_aliquota || 0),
    cofins_cst: produto.cofins_cst || null,
    cofins_aliquota: Number(produto.cofins_aliquota || 0),
    ipi_cst: produto.ipi_cst || null,
    ipi_enquadramento: produto.ipi_enquadramento || null,
    ipi_aliquota: Number(produto.ipi_aliquota || 0),
    ibpt_aliquota_federal_nacional: Number(produto.ibpt_aliquota_federal_nacional || 0),
    ibpt_aliquota_federal_importado: Number(produto.ibpt_aliquota_federal_importado || 0),
    ibpt_aliquota_estadual: Number(produto.ibpt_aliquota_estadual || 0),
    ibpt_aliquota_municipal: Number(produto.ibpt_aliquota_municipal || 0),
    ibpt_fonte: produto.ibpt_fonte || null,
    ibpt_chave: produto.ibpt_chave || null,
    ibpt_atualizado_em: produto.ibpt_atualizado_em || null,
    preco_venda: Number(produto.preco_venda || 0),
    estoque_atual: Number(produto.estoque_atual || 0),
    controla_estoque: toBooleanFlag(produto.controla_estoque, true) ? 1 : 0,
    ativo: produto.ativo === false ? 0 : 1,
  };

  const result = payload.erp_id
      ? db
        .prepare(
          `INSERT INTO produto (${PRODUTO_INSERT_COLUMNS_SQL})
           VALUES (${PRODUTO_INSERT_VALUES_SQL})
           ON CONFLICT(erp_id) WHERE erp_id IS NOT NULL DO UPDATE SET
             ${PRODUTO_UPDATE_SET_SQL}`,
        )
        .run(payload)
      : db
        .prepare(
          `INSERT INTO produto (${PRODUTO_INSERT_COLUMNS_SQL})
           VALUES (${PRODUTO_INSERT_VALUES_SQL})`,
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
