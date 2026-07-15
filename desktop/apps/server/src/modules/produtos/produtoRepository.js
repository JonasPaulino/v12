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

export function listProdutos({ search = "", limit = 50 } = {}) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const like = `%${search}%`;
  return db
    .prepare(
      `SELECT
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
         preco_venda,
         estoque_atual,
         controla_estoque,
         ativo
       FROM produto
       WHERE tenant_erp_id = ?
         AND ativo = 1
         AND (? = '' OR descricao LIKE ? OR codigo LIKE ?)
       ORDER BY descricao
       LIMIT ?`,
    )
    .all(tenantErpId, search, like, like, limit)
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
