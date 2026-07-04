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

const parseNumeric = (value, { defaultValue = null } = {}) => {
  if (value === null || value === undefined || value === "") return defaultValue;
  let normalized = String(value).trim();

  if (normalized.includes(".") && normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
  } else {
    normalized = normalized.replace(/,/g, ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const mapRow = (row = {}) => ({
  regra_tributaria_id: row.regra_tributaria_id,
  descricao: row.descricao,
  regime_tributario: row.regime_tributario,
  crt_emitente: row.crt_emitente,
  tipo_operacao: row.tipo_operacao,
  finalidade_nfe: row.finalidade_nfe,
  consumidor_final: row.consumidor_final,
  contribuinte_icms: row.contribuinte_icms,
  origem_mercadoria: row.origem_mercadoria,
  cfop_venda_interna: row.cfop_venda_interna,
  cfop_venda_interestadual: row.cfop_venda_interestadual,
  cfop_compra: row.cfop_compra,
  cbenef: row.cbenef,
  observacao: row.observacao,
  prioridade: row.prioridade,
  ativo: row.ativo,
  icms_cst: row.icms_cst,
  icms_csosn: row.icms_csosn,
  icms_aliquota: row.icms_aliquota !== null && row.icms_aliquota !== undefined ? Number(row.icms_aliquota) : 0,
  icms_reducao_base:
    row.icms_reducao_base !== null && row.icms_reducao_base !== undefined ? Number(row.icms_reducao_base) : 0,
  icms_aliquota_fcp:
    row.icms_aliquota_fcp !== null && row.icms_aliquota_fcp !== undefined ? Number(row.icms_aliquota_fcp) : 0,
  icms_modalidade_bc: row.icms_modalidade_bc,
  pis_cst: row.pis_cst,
  pis_aliquota: row.pis_aliquota !== null && row.pis_aliquota !== undefined ? Number(row.pis_aliquota) : 0,
  cofins_cst: row.cofins_cst,
  cofins_aliquota:
    row.cofins_aliquota !== null && row.cofins_aliquota !== undefined ? Number(row.cofins_aliquota) : 0,
  ipi_cst: row.ipi_cst,
  ipi_enquadramento: row.ipi_enquadramento,
  ipi_aliquota: row.ipi_aliquota !== null && row.ipi_aliquota !== undefined ? Number(row.ipi_aliquota) : 0,
  cbs_cst: row.cbs_cst,
  cbs_cclass_trib: row.cbs_cclass_trib,
  cbs_aliquota: row.cbs_aliquota !== null && row.cbs_aliquota !== undefined ? Number(row.cbs_aliquota) : 0,
  ibs_uf_cst: row.ibs_uf_cst,
  ibs_uf_cclass_trib: row.ibs_uf_cclass_trib,
  ibs_uf_aliquota:
    row.ibs_uf_aliquota !== null && row.ibs_uf_aliquota !== undefined ? Number(row.ibs_uf_aliquota) : 0,
  ibs_mun_cst: row.ibs_mun_cst,
  ibs_mun_cclass_trib: row.ibs_mun_cclass_trib,
  ibs_mun_aliquota:
    row.ibs_mun_aliquota !== null && row.ibs_mun_aliquota !== undefined
      ? Number(row.ibs_mun_aliquota)
      : 0,
  is_cst: row.is_cst,
  is_cclass_trib: row.is_cclass_trib,
  is_aliquota: row.is_aliquota !== null && row.is_aliquota !== undefined ? Number(row.is_aliquota) : 0,
  criado_em: row.criado_em,
  atualizado_em: row.atualizado_em,
});

const selectSql = `
  SELECT
    r.regra_tributaria_id,
    r.descricao,
    r.regime_tributario,
    r.crt_emitente,
    r.tipo_operacao,
    r.finalidade_nfe,
    r.consumidor_final,
    r.contribuinte_icms,
    r.origem_mercadoria,
    r.cfop_venda_interna,
    r.cfop_venda_interestadual,
    r.cfop_compra,
    r.cbenef,
    r.observacao,
    r.prioridade,
    r.ativo,
    r.criado_em,
    r.atualizado_em,
    icms.cst AS icms_cst,
    icms.csosn AS icms_csosn,
    icms.aliquota_icms AS icms_aliquota,
    icms.reducao_base AS icms_reducao_base,
    icms.aliquota_fcp AS icms_aliquota_fcp,
    icms.modalidade_bc AS icms_modalidade_bc,
    pis.cst AS pis_cst,
    pis.aliquota AS pis_aliquota,
    cofins.cst AS cofins_cst,
    cofins.aliquota AS cofins_aliquota,
    ipi.cst AS ipi_cst,
    ipi.enquadramento_ipi AS ipi_enquadramento,
    ipi.aliquota AS ipi_aliquota,
    cbs.cst AS cbs_cst,
    cbs.cclass_trib AS cbs_cclass_trib,
    cbs.aliquota AS cbs_aliquota,
    ibs_uf.cst AS ibs_uf_cst,
    ibs_uf.cclass_trib AS ibs_uf_cclass_trib,
    ibs_uf.aliquota AS ibs_uf_aliquota,
    ibs_mun.cst AS ibs_mun_cst,
    ibs_mun.cclass_trib AS ibs_mun_cclass_trib,
    ibs_mun.aliquota AS ibs_mun_aliquota,
    is_trib.cst AS is_cst,
    is_trib.cclass_trib AS is_cclass_trib,
    is_trib.aliquota AS is_aliquota
  FROM regra_tributaria r
  LEFT JOIN regra_tributaria_icms icms
    ON icms.regra_tributaria_id = r.regra_tributaria_id
  LEFT JOIN regra_tributaria_pis pis
    ON pis.regra_tributaria_id = r.regra_tributaria_id
  LEFT JOIN regra_tributaria_cofins cofins
    ON cofins.regra_tributaria_id = r.regra_tributaria_id
  LEFT JOIN regra_tributaria_ipi ipi
    ON ipi.regra_tributaria_id = r.regra_tributaria_id
  LEFT JOIN regra_tributaria_tributo cbs
    ON cbs.regra_tributaria_id = r.regra_tributaria_id
   AND cbs.tipo_tributo = 'CBS'
  LEFT JOIN regra_tributaria_tributo ibs_uf
    ON ibs_uf.regra_tributaria_id = r.regra_tributaria_id
   AND ibs_uf.tipo_tributo = 'IBS_UF'
  LEFT JOIN regra_tributaria_tributo ibs_mun
    ON ibs_mun.regra_tributaria_id = r.regra_tributaria_id
   AND ibs_mun.tipo_tributo = 'IBS_MUN'
  LEFT JOIN regra_tributaria_tributo is_trib
    ON is_trib.regra_tributaria_id = r.regra_tributaria_id
   AND is_trib.tipo_tributo = 'IS'
`;

const normalizeReformaTributo = (payload, prefix) => ({
  cst: normalizeText(payload[`${prefix}_cst`], 6),
  cclass_trib: normalizeText(payload[`${prefix}_cclass_trib`], 12),
  aliquota: parseNumeric(payload[`${prefix}_aliquota`], { defaultValue: 0 }),
});

class RegraFiscalDAO {
  static normalizePayload(payload = {}) {
    const regime = normalizeText(payload.regime_tributario, 20) || "simples_nacional";
    const crt = normalizeText(payload.crt_emitente, 1) || (regime === "regime_normal" ? "3" : "1");

    return {
      descricao: normalizeText(payload.descricao, 180, {
        required: true,
        label: "Nome da regra fiscal",
      }),
      regime_tributario: regime,
      crt_emitente: crt,
      tipo_operacao: normalizeText(payload.tipo_operacao, 20) || "saida",
      finalidade_nfe: normalizeText(payload.finalidade_nfe, 20) || "normal",
      consumidor_final: parseBoolean(payload.consumidor_final, true),
      contribuinte_icms: parseBoolean(payload.contribuinte_icms, false),
      origem_mercadoria: normalizeText(payload.origem_mercadoria, 1) || "0",
      cfop_venda_interna: normalizeText(payload.cfop_venda_interna, 4, {
        required: true,
        label: "CFOP venda dentro da UF",
      }),
      cfop_venda_interestadual: normalizeText(payload.cfop_venda_interestadual, 4, {
        required: true,
        label: "CFOP venda fora da UF",
      }),
      cfop_compra: normalizeText(payload.cfop_compra, 4),
      cbenef: normalizeText(payload.cbenef, 10),
      observacao: normalizeText(payload.observacao, null),
      prioridade: Number.isInteger(Number(payload.prioridade)) ? Number(payload.prioridade) : 0,
      ativo: parseBoolean(payload.ativo, true),
      icms: {
        cst: normalizeText(payload.icms_cst, 3),
        csosn: normalizeText(payload.icms_csosn, 3) || (crt === "3" ? null : "102"),
        aliquota_icms: parseNumeric(payload.icms_aliquota, { defaultValue: 0 }),
        reducao_base: parseNumeric(payload.icms_reducao_base, { defaultValue: 0 }),
        aliquota_fcp: parseNumeric(payload.icms_aliquota_fcp, { defaultValue: 0 }),
        modalidade_bc: normalizeText(payload.icms_modalidade_bc, 2) || "3",
      },
      pis: {
        cst: normalizeText(payload.pis_cst, 2) || "99",
        aliquota: parseNumeric(payload.pis_aliquota, { defaultValue: 0 }),
      },
      cofins: {
        cst: normalizeText(payload.cofins_cst, 2) || "99",
        aliquota: parseNumeric(payload.cofins_aliquota, { defaultValue: 0 }),
      },
      ipi: {
        cst: normalizeText(payload.ipi_cst, 2),
        enquadramento_ipi: normalizeText(payload.ipi_enquadramento, 3),
        aliquota: parseNumeric(payload.ipi_aliquota, { defaultValue: 0 }),
      },
      reforma_tributaria: {
        CBS: normalizeReformaTributo(payload, "cbs"),
        IBS_UF: normalizeReformaTributo(payload, "ibs_uf"),
        IBS_MUN: normalizeReformaTributo(payload, "ibs_mun"),
        IS: normalizeReformaTributo(payload, "is"),
      },
    };
  }

  static async listar(client, { search = "", includeInactive = true } = {}) {
    const values = [];
    let where = `WHERE r.tenant_id = ${TENANT_CONTEXT_SQL} AND r.excluido = FALSE`;

    if (!includeInactive) {
      where += " AND r.ativo = TRUE";
    }

    const normalizedSearch = String(search || "").trim();
    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += ` AND LOWER(r.descricao) LIKE LOWER($${values.length})`;
    }

    const { rows } = await client.query(
      `
        ${selectSql}
        ${where}
        ORDER BY r.ativo DESC, r.prioridade DESC, r.descricao ASC
      `,
      values
    );

    return rows.map(mapRow);
  }

  static async buscarPorId(client, regraId) {
    const { rows } = await client.query(
      `
        ${selectSql}
        WHERE r.tenant_id = ${TENANT_CONTEXT_SQL}
          AND r.regra_tributaria_id = $1
          AND r.excluido = FALSE
        LIMIT 1
      `,
      [regraId]
    );

    return rows[0] ? mapRow(rows[0]) : null;
  }

  static async salvarChildTables(client, regraId, data) {
    await client.query(
      `
        INSERT INTO regra_tributaria_icms (
          regra_tributaria_id,
          cst,
          csosn,
          aliquota_icms,
          reducao_base,
          aliquota_fcp,
          modalidade_bc
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (regra_tributaria_id)
        DO UPDATE SET
          cst = EXCLUDED.cst,
          csosn = EXCLUDED.csosn,
          aliquota_icms = EXCLUDED.aliquota_icms,
          reducao_base = EXCLUDED.reducao_base,
          aliquota_fcp = EXCLUDED.aliquota_fcp,
          modalidade_bc = EXCLUDED.modalidade_bc
      `,
      [
        regraId,
        data.icms.cst,
        data.icms.csosn,
        data.icms.aliquota_icms,
        data.icms.reducao_base,
        data.icms.aliquota_fcp,
        data.icms.modalidade_bc,
      ]
    );

    await client.query(
      `
        INSERT INTO regra_tributaria_pis (regra_tributaria_id, cst, aliquota)
        VALUES ($1, $2, $3)
        ON CONFLICT (regra_tributaria_id)
        DO UPDATE SET cst = EXCLUDED.cst, aliquota = EXCLUDED.aliquota
      `,
      [regraId, data.pis.cst, data.pis.aliquota]
    );

    await client.query(
      `
        INSERT INTO regra_tributaria_cofins (regra_tributaria_id, cst, aliquota)
        VALUES ($1, $2, $3)
        ON CONFLICT (regra_tributaria_id)
        DO UPDATE SET cst = EXCLUDED.cst, aliquota = EXCLUDED.aliquota
      `,
      [regraId, data.cofins.cst, data.cofins.aliquota]
    );

    await client.query(
      `
        INSERT INTO regra_tributaria_ipi (
          regra_tributaria_id,
          cst,
          enquadramento_ipi,
          aliquota
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (regra_tributaria_id)
        DO UPDATE SET
          cst = EXCLUDED.cst,
          enquadramento_ipi = EXCLUDED.enquadramento_ipi,
          aliquota = EXCLUDED.aliquota
      `,
      [regraId, data.ipi.cst, data.ipi.enquadramento_ipi, data.ipi.aliquota]
    );

    for (const [tipoTributo, tributo] of Object.entries(data.reforma_tributaria || {})) {
      await client.query(
        `
          INSERT INTO regra_tributaria_tributo (
            tenant_id,
            regra_tributaria_id,
            tipo_tributo,
            cst,
            cclass_trib,
            aliquota,
            ativo
          )
          VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3, $4, $5, TRUE)
          ON CONFLICT (regra_tributaria_id, tipo_tributo)
          DO UPDATE SET
            cst = EXCLUDED.cst,
            cclass_trib = EXCLUDED.cclass_trib,
            aliquota = EXCLUDED.aliquota,
            ativo = TRUE,
            atualizado_em = NOW()
        `,
        [regraId, tipoTributo, tributo.cst, tributo.cclass_trib, tributo.aliquota]
      );
    }
  }

  static async criar(client, payload) {
    const data = this.normalizePayload(payload);

    await client.query("BEGIN");
    try {
      const result = await client.query(
        `
          INSERT INTO regra_tributaria (
            tenant_id,
            descricao,
            regime_tributario,
            crt_emitente,
            tipo_operacao,
            finalidade_nfe,
            consumidor_final,
            contribuinte_icms,
            origem_mercadoria,
            cfop_venda_interna,
            cfop_venda_interestadual,
            cfop_compra,
            cbenef,
            observacao,
            prioridade,
            ativo,
            excluido
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15, FALSE
          )
          RETURNING regra_tributaria_id
        `,
        [
          data.descricao,
          data.regime_tributario,
          data.crt_emitente,
          data.tipo_operacao,
          data.finalidade_nfe,
          data.consumidor_final,
          data.contribuinte_icms,
          data.origem_mercadoria,
          data.cfop_venda_interna,
          data.cfop_venda_interestadual,
          data.cfop_compra,
          data.cbenef,
          data.observacao,
          data.prioridade,
          data.ativo,
        ]
      );

      const regraId = Number(result.rows[0].regra_tributaria_id);
      await this.salvarChildTables(client, regraId, data);
      await client.query("COMMIT");
      return this.buscarPorId(client, regraId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async atualizar(client, regraId, payload) {
    const existing = await this.buscarPorId(client, regraId);
    if (!existing) throw new Error("Regra fiscal não encontrada.");

    const data = this.normalizePayload(payload);

    await client.query("BEGIN");
    try {
      await client.query(
        `
          UPDATE regra_tributaria
          SET
            descricao = $1,
            regime_tributario = $2,
            crt_emitente = $3,
            tipo_operacao = $4,
            finalidade_nfe = $5,
            consumidor_final = $6,
            contribuinte_icms = $7,
            origem_mercadoria = $8,
            cfop_venda_interna = $9,
            cfop_venda_interestadual = $10,
            cfop_compra = $11,
            cbenef = $12,
            observacao = $13,
            prioridade = $14,
            ativo = $15,
            atualizado_em = NOW()
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND regra_tributaria_id = $16
            AND excluido = FALSE
        `,
        [
          data.descricao,
          data.regime_tributario,
          data.crt_emitente,
          data.tipo_operacao,
          data.finalidade_nfe,
          data.consumidor_final,
          data.contribuinte_icms,
          data.origem_mercadoria,
          data.cfop_venda_interna,
          data.cfop_venda_interestadual,
          data.cfop_compra,
          data.cbenef,
          data.observacao,
          data.prioridade,
          data.ativo,
          regraId,
        ]
      );

      await this.salvarChildTables(client, regraId, data);
      await client.query("COMMIT");
      return this.buscarPorId(client, regraId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async excluir(client, regraId) {
    const { rows } = await client.query(
      `
        SELECT COUNT(*)::int AS total
        FROM produto_fiscal
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND regra_tributaria_id = $1
      `,
      [regraId]
    );

    if (Number(rows[0]?.total || 0) > 0) {
      throw new Error("Esta regra fiscal está vinculada a produtos. Inative a regra ou altere os produtos antes de excluir.");
    }

    await client.query(
      `
        UPDATE regra_tributaria
        SET excluido = TRUE,
            ativo = FALSE,
            atualizado_em = NOW()
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND regra_tributaria_id = $1
          AND excluido = FALSE
      `,
      [regraId]
    );
  }
}

export default RegraFiscalDAO;
