import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

const normalizeText = (value, maxLength, { required = false, label = "Campo" } = {}) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    if (required) throw new Error(`${label} obrigatório.`);
    return null;
  }

  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "sim", "yes"].includes(normalized)) return true;
  if (["false", "0", "nao", "não", "no"].includes(normalized)) return false;

  return defaultValue;
};

const parseInteger = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const allowedTiposOperacao = new Set([
  "venda",
  "compra",
  "devolucao_venda",
  "devolucao_compra",
  "bonificacao_entrada",
  "bonificacao_saida",
  "remessa",
  "retorno",
  "ajuste",
]);

const allowedFinalidades = new Set(["normal", "complementar", "ajuste", "devolucao"]);
const allowedTipoNfe = new Set(["entrada", "saida"]);
const allowedMovimentos = new Set(["entrada", "saida", "nenhum"]);
const allowedFinanceiro = new Set(["receber", "pagar", "nenhum"]);

const mapRow = (row = {}) => ({
  operacao_fiscal_id: row.operacao_fiscal_id,
  codigo: row.codigo,
  descricao: row.descricao,
  tipo_operacao: row.tipo_operacao,
  natureza_operacao: row.natureza_operacao,
  finalidade_nfe: row.finalidade_nfe,
  tipo_nfe: row.tipo_nfe,
  emite_nfe: !!row.emite_nfe,
  movimenta_estoque: !!row.movimenta_estoque,
  tipo_movimento_estoque: row.tipo_movimento_estoque,
  gera_financeiro: !!row.gera_financeiro,
  tipo_financeiro: row.tipo_financeiro,
  atualiza_custo: !!row.atualiza_custo,
  regra_tributaria_id: row.regra_tributaria_id,
  regra_fiscal_descricao: row.regra_fiscal_descricao,
  observacao: row.observacao,
  ativo: !!row.ativo,
  criado_em: row.criado_em,
  atualizado_em: row.atualizado_em,
});

const selectSql = `
  SELECT
    op.operacao_fiscal_id,
    op.codigo,
    op.descricao,
    op.tipo_operacao,
    op.natureza_operacao,
    op.finalidade_nfe,
    op.tipo_nfe,
    op.emite_nfe,
    op.movimenta_estoque,
    op.tipo_movimento_estoque,
    op.gera_financeiro,
    op.tipo_financeiro,
    op.atualiza_custo,
    op.regra_tributaria_id,
    regra.descricao AS regra_fiscal_descricao,
    op.observacao,
    op.ativo,
    op.criado_em,
    op.atualizado_em
  FROM operacao_fiscal op
  LEFT JOIN regra_tributaria regra
    ON regra.regra_tributaria_id = op.regra_tributaria_id
   AND regra.tenant_id = op.tenant_id
`;

class OperacaoFiscalDAO {
  static normalizePayload(payload = {}) {
    const codigo = normalizeText(payload.codigo, 40, {
      required: true,
      label: "Código da operação",
    })?.toUpperCase().replace(/\s+/g, "_");
    const tipoOperacao = normalizeText(payload.tipo_operacao, 40) || "venda";
    const finalidade = normalizeText(payload.finalidade_nfe, 20) || "normal";
    const emiteNfe = parseBoolean(payload.emite_nfe, false);
    const movimentaEstoque = parseBoolean(payload.movimenta_estoque, true);
    const geraFinanceiro = parseBoolean(payload.gera_financeiro, true);
    const tipoNfe = normalizeText(payload.tipo_nfe, 10) || (emiteNfe ? "saida" : null);
    const tipoMovimentoEstoque =
      normalizeText(payload.tipo_movimento_estoque, 20) ||
      (movimentaEstoque ? "saida" : "nenhum");
    const tipoFinanceiro =
      normalizeText(payload.tipo_financeiro, 10) ||
      (geraFinanceiro ? "receber" : "nenhum");

    if (!allowedTiposOperacao.has(tipoOperacao)) {
      throw new Error("Tipo de operação fiscal inválido.");
    }

    if (!allowedFinalidades.has(finalidade)) {
      throw new Error("Finalidade da NF-e inválida.");
    }

    if (emiteNfe && !allowedTipoNfe.has(tipoNfe)) {
      throw new Error("Tipo da NF-e obrigatório para operações que emitem NF-e.");
    }

    if (!allowedMovimentos.has(tipoMovimentoEstoque)) {
      throw new Error("Tipo de movimento de estoque inválido.");
    }

    if (!allowedFinanceiro.has(tipoFinanceiro)) {
      throw new Error("Tipo financeiro inválido.");
    }

    return {
      codigo,
      descricao: normalizeText(payload.descricao, 140, {
        required: true,
        label: "Descrição da operação",
      }),
      tipo_operacao: tipoOperacao,
      natureza_operacao: normalizeText(payload.natureza_operacao, 120, {
        required: true,
        label: "Natureza da operação",
      }),
      finalidade_nfe: finalidade,
      tipo_nfe: emiteNfe ? tipoNfe : tipoNfe || null,
      emite_nfe: emiteNfe,
      movimenta_estoque: movimentaEstoque,
      tipo_movimento_estoque: movimentaEstoque ? tipoMovimentoEstoque : "nenhum",
      gera_financeiro: geraFinanceiro,
      tipo_financeiro: geraFinanceiro ? tipoFinanceiro : "nenhum",
      atualiza_custo: parseBoolean(payload.atualiza_custo, false),
      regra_tributaria_id: parseInteger(payload.regra_tributaria_id),
      observacao: normalizeText(payload.observacao, null),
      ativo: parseBoolean(payload.ativo, true),
    };
  }

  static async validarRegraFiscal(client, regraId) {
    if (!regraId) return;

    const { rows } = await client.query(
      `
        SELECT regra_tributaria_id
        FROM regra_tributaria
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND regra_tributaria_id = $1
          AND excluido = FALSE
        LIMIT 1
      `,
      [regraId]
    );

    if (!rows[0]) {
      throw new Error("Regra fiscal vinculada não encontrada.");
    }
  }

  static async listar(client, { search = "", includeInactive = true } = {}) {
    const values = [];
    let where = `WHERE op.tenant_id = ${TENANT_CONTEXT_SQL} AND op.excluido = FALSE`;

    if (!includeInactive) {
      where += " AND op.ativo = TRUE";
    }

    const normalizedSearch = String(search || "").trim();
    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += ` AND (
        LOWER(op.codigo) LIKE LOWER($${values.length})
        OR LOWER(op.descricao) LIKE LOWER($${values.length})
        OR LOWER(op.natureza_operacao) LIKE LOWER($${values.length})
      )`;
    }

    const { rows } = await client.query(
      `
        ${selectSql}
        ${where}
        ORDER BY op.ativo DESC, op.descricao ASC
      `,
      values
    );

    return rows.map(mapRow);
  }

  static async buscarPorId(client, operacaoId) {
    const { rows } = await client.query(
      `
        ${selectSql}
        WHERE op.tenant_id = ${TENANT_CONTEXT_SQL}
          AND op.operacao_fiscal_id = $1
          AND op.excluido = FALSE
        LIMIT 1
      `,
      [operacaoId]
    );

    return rows[0] ? mapRow(rows[0]) : null;
  }

  static async criar(client, payload) {
    const data = this.normalizePayload(payload);
    await this.validarRegraFiscal(client, data.regra_tributaria_id);

    const { rows } = await client.query(
      `
        INSERT INTO operacao_fiscal (
          tenant_id,
          codigo,
          descricao,
          tipo_operacao,
          natureza_operacao,
          finalidade_nfe,
          tipo_nfe,
          emite_nfe,
          movimenta_estoque,
          tipo_movimento_estoque,
          gera_financeiro,
          tipo_financeiro,
          atualiza_custo,
          regra_tributaria_id,
          observacao,
          ativo,
          excluido
        )
        VALUES (
          ${TENANT_CONTEXT_SQL},
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, FALSE
        )
        RETURNING operacao_fiscal_id
      `,
      [
        data.codigo,
        data.descricao,
        data.tipo_operacao,
        data.natureza_operacao,
        data.finalidade_nfe,
        data.tipo_nfe,
        data.emite_nfe,
        data.movimenta_estoque,
        data.tipo_movimento_estoque,
        data.gera_financeiro,
        data.tipo_financeiro,
        data.atualiza_custo,
        data.regra_tributaria_id,
        data.observacao,
        data.ativo,
      ]
    );

    return this.buscarPorId(client, Number(rows[0].operacao_fiscal_id));
  }

  static async atualizar(client, operacaoId, payload) {
    const existing = await this.buscarPorId(client, operacaoId);
    if (!existing) throw new Error("Operação fiscal não encontrada.");

    const data = this.normalizePayload(payload);
    await this.validarRegraFiscal(client, data.regra_tributaria_id);

    await client.query(
      `
        UPDATE operacao_fiscal
        SET
          codigo = $1,
          descricao = $2,
          tipo_operacao = $3,
          natureza_operacao = $4,
          finalidade_nfe = $5,
          tipo_nfe = $6,
          emite_nfe = $7,
          movimenta_estoque = $8,
          tipo_movimento_estoque = $9,
          gera_financeiro = $10,
          tipo_financeiro = $11,
          atualiza_custo = $12,
          regra_tributaria_id = $13,
          observacao = $14,
          ativo = $15
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND operacao_fiscal_id = $16
          AND excluido = FALSE
      `,
      [
        data.codigo,
        data.descricao,
        data.tipo_operacao,
        data.natureza_operacao,
        data.finalidade_nfe,
        data.tipo_nfe,
        data.emite_nfe,
        data.movimenta_estoque,
        data.tipo_movimento_estoque,
        data.gera_financeiro,
        data.tipo_financeiro,
        data.atualiza_custo,
        data.regra_tributaria_id,
        data.observacao,
        data.ativo,
        operacaoId,
      ]
    );

    return this.buscarPorId(client, operacaoId);
  }

  static async excluir(client, operacaoId) {
    await client.query(
      `
        UPDATE operacao_fiscal
        SET excluido = TRUE,
            ativo = FALSE
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND operacao_fiscal_id = $1
          AND excluido = FALSE
      `,
      [operacaoId]
    );
  }
}

export default OperacaoFiscalDAO;
