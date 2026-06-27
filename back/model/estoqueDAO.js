import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

const CODIGO_INTERNO_SQL = "COALESCE(NULLIF(p.codigo_interno, ''), p.produto_id::varchar(60))";

const parseInteger = (value, { min = 1, label = "Campo" } = {}) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(`${label} inválido.`);
  }
  return parsed;
};

const parseNumeric = (value, { label = "Campo" } = {}) => {
  let normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`${label} obrigatório.`);
  }

  const hasDot = normalized.includes(".");
  const hasComma = normalized.includes(",");
  if (hasDot && hasComma) {
    normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
  } else {
    normalized = normalized.replace(/,/g, ".");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} inválido.`);
  }

  return parsed;
};

const normalizeText = (value, maxLength, { required = false, label = "Campo" } = {}) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    if (required) throw new Error(`${label} obrigatório.`);
    return null;
  }
  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const buildOrderBy = (sort = {}, columns = {}, fallback) => {
  const entries = Object.entries(sort || {})
    .filter(([column]) => columns[column])
    .map(([column, direction]) => {
      const safeDirection = String(direction).toUpperCase() === "DESC" ? "DESC" : "ASC";
      return `${columns[column]} ${safeDirection}`;
    });

  return entries.length ? entries.join(", ") : fallback;
};

class EstoqueDAO {
  static async obterDepositoPadrao(client) {
    const { rows } = await client.query(
      `
        SELECT deposito_id
        FROM deposito
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND padrao = TRUE
          AND ativo = TRUE
          AND excluido = FALSE
        ORDER BY deposito_id
        LIMIT 1
      `
    );

    if (rows[0]?.deposito_id) return Number(rows[0].deposito_id);

    const result = await client.query(
      `
        INSERT INTO deposito (tenant_id, nome, padrao, ativo, excluido)
        VALUES (${TENANT_CONTEXT_SQL}, 'Depósito principal', TRUE, TRUE, FALSE)
        ON CONFLICT (tenant_id, nome) DO UPDATE
        SET
          padrao = TRUE,
          ativo = TRUE,
          excluido = FALSE
        RETURNING deposito_id
      `
    );

    return Number(result.rows[0].deposito_id);
  }

  static async listarSaldos(client, { page = 1, limit = 20, search = "", sort = {} }) {
    const depositoId = await this.obterDepositoPadrao(client);
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const searchValues = [];
    const normalizedSearch = String(search || "").trim();

    let selectWhere = `
      WHERE p.tenant_id = ${TENANT_CONTEXT_SQL}
        AND p.excluido = FALSE
        AND p.controla_estoque = TRUE
    `;
    let countWhere = selectWhere;

    if (normalizedSearch) {
      searchValues.push(`%${normalizedSearch}%`);
      selectWhere += `
        AND (
          LOWER(${CODIGO_INTERNO_SQL}) LIKE LOWER($2)
          OR LOWER(p.descricao) LIKE LOWER($2)
          OR LOWER(COALESCE(pf.ncm, '')) LIKE LOWER($2)
        )
      `;
      countWhere += `
        AND (
          LOWER(${CODIGO_INTERNO_SQL}) LIKE LOWER($1)
          OR LOWER(p.descricao) LIKE LOWER($1)
          OR LOWER(COALESCE(pf.ncm, '')) LIKE LOWER($1)
        )
      `;
    }

    const orderBy = buildOrderBy(
      sort,
      {
        codigo_interno: CODIGO_INTERNO_SQL,
        descricao: "p.descricao",
        ncm: "pf.ncm",
        estoque_atual: "COALESCE(pe.estoque_atual, 0)",
        estoque_minimo: "COALESCE(pe.estoque_minimo, 0)",
      },
      "p.descricao ASC"
    );

    const selectSql = `
      SELECT
        p.produto_id,
        ${CODIGO_INTERNO_SQL} AS codigo_interno,
        p.descricao,
        p.ativo,
        pf.ncm,
        uc.sigla AS unidade_sigla,
        COALESCE(pe.estoque_atual, 0) AS estoque_atual,
        COALESCE(pe.estoque_minimo, 0) AS estoque_minimo,
        COALESCE(pe.estoque_reservado, 0) AS estoque_reservado,
        pe.atualizado_em
      FROM produto p
      LEFT JOIN produto_fiscal pf ON pf.produto_id = p.produto_id
      LEFT JOIN produto_unidade pu ON pu.produto_id = p.produto_id
      LEFT JOIN unidade_medida uc ON uc.unidade_medida_id = pu.unidade_comercial_id
      LEFT JOIN produto_estoque pe
        ON pe.produto_id = p.produto_id
       AND pe.tenant_id = p.tenant_id
       AND pe.deposito_id = $1
      ${selectWhere}
      ORDER BY ${orderBy}
      LIMIT $${searchValues.length + 2}
      OFFSET $${searchValues.length + 3}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM produto p
      LEFT JOIN produto_fiscal pf ON pf.produto_id = p.produto_id
      ${countWhere}
    `;

    const [listResult, countResult] = await Promise.all([
      client.query(selectSql, [depositoId, ...searchValues, safeLimit, offset]),
      client.query(countSql, searchValues),
    ]);

    const total = countResult.rows[0]?.total || 0;

    return {
      data: listResult.rows.map((row) => ({
        ...row,
        estoque_atual: Number(row.estoque_atual || 0),
        estoque_minimo: Number(row.estoque_minimo || 0),
        estoque_reservado: Number(row.estoque_reservado || 0),
      })),
      page: safePage,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  static async listarMovimentacoes(client, { page = 1, limit = 20, search = "", sort = {} }) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const values = [];
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE em.tenant_id = ${TENANT_CONTEXT_SQL}
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          LOWER(${CODIGO_INTERNO_SQL}) LIKE LOWER($${values.length})
          OR LOWER(p.descricao) LIKE LOWER($${values.length})
          OR LOWER(em.origem) LIKE LOWER($${values.length})
          OR LOWER(COALESCE(em.observacao, '')) LIKE LOWER($${values.length})
        )
      `;
    }

    const orderBy = buildOrderBy(
      sort,
      {
        data_movimento: "em.data_movimento",
        descricao: "p.descricao",
        tipo_movimento: "COALESCE(etm.descricao, em.tipo_movimento)",
        quantidade: "em.quantidade",
      },
      "em.data_movimento DESC"
    );

    const selectSql = `
      SELECT
        em.estoque_movimento_id,
        em.produto_id,
        ${CODIGO_INTERNO_SQL} AS codigo_interno,
        p.descricao AS produto_descricao,
        COALESCE(uc.sigla, '') AS unidade_sigla,
        em.tipo_movimento,
        COALESCE(etm.descricao, em.tipo_movimento) AS tipo_movimento_descricao,
        COALESCE(etm.operacao, CASE WHEN em.quantidade < 0 THEN 'saida' ELSE 'entrada' END) AS operacao,
        em.quantidade,
        em.valor_unitario,
        em.origem,
        em.documento_tipo,
        em.documento_id,
        em.saldo_anterior,
        em.saldo_posterior,
        em.observacao,
        em.data_movimento
      FROM estoque_movimento em
      JOIN produto p ON p.produto_id = em.produto_id
      LEFT JOIN produto_unidade pu ON pu.produto_id = p.produto_id
      LEFT JOIN unidade_medida uc ON uc.unidade_medida_id = pu.unidade_comercial_id
      LEFT JOIN estoque_tipo_movimento etm
        ON etm.estoque_tipo_movimento_id = em.estoque_tipo_movimento_id
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM estoque_movimento em
      JOIN produto p ON p.produto_id = em.produto_id
      ${where}
    `;

    const [listResult, countResult] = await Promise.all([
      client.query(selectSql, [...values, safeLimit, offset]),
      client.query(countSql, values),
    ]);

    const total = countResult.rows[0]?.total || 0;

    return {
      data: listResult.rows.map((row) => ({
        ...row,
        quantidade: Number(row.quantidade || 0),
        valor_unitario: Number(row.valor_unitario || 0),
        saldo_anterior:
          row.saldo_anterior !== null && row.saldo_anterior !== undefined
            ? Number(row.saldo_anterior)
            : null,
        saldo_posterior:
          row.saldo_posterior !== null && row.saldo_posterior !== undefined
            ? Number(row.saldo_posterior)
            : null,
      })),
      page: safePage,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  static async listarProdutosSelect(client, { search = "", limit = 20 } = {}) {
    const values = [];
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 50) : 20;
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE p.tenant_id = ${TENANT_CONTEXT_SQL}
        AND p.ativo = TRUE
        AND p.excluido = FALSE
        AND p.controla_estoque = TRUE
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          LOWER(${CODIGO_INTERNO_SQL}) LIKE LOWER($${values.length})
          OR LOWER(p.descricao) LIKE LOWER($${values.length})
        )
      `;
    }

    values.push(safeLimit);

    const { rows } = await client.query(
      `
        SELECT
          p.produto_id,
          ${CODIGO_INTERNO_SQL} AS codigo_interno,
          p.descricao,
          COALESCE(uc.sigla, '') AS unidade_sigla
        FROM produto p
        LEFT JOIN produto_unidade pu ON pu.produto_id = p.produto_id
        LEFT JOIN unidade_medida uc ON uc.unidade_medida_id = pu.unidade_comercial_id
        ${where}
        ORDER BY p.descricao
        LIMIT $${values.length}
      `,
      values
    );

    return rows;
  }

  static async registrarAjuste(client, payload = {}, usuarioId = null) {
    const produtoId = parseInteger(payload.produto_id, { label: "Produto" });
    const tipoAjuste = normalizeText(payload.tipo_ajuste, 20, {
      required: true,
      label: "Tipo de ajuste",
    });
    const quantidade = parseNumeric(payload.quantidade, { label: "Quantidade" });
    const observacao = normalizeText(payload.observacao, null, { label: "Observação" });

    if (!["entrada", "saida", "saldo"].includes(tipoAjuste)) {
      throw new Error("Tipo de ajuste inválido.");
    }

    if (quantidade < 0) {
      throw new Error("Quantidade não pode ser negativa.");
    }

    if (tipoAjuste !== "saldo" && quantidade <= 0) {
      throw new Error("Quantidade deve ser maior que zero.");
    }

    const depositoId = await this.obterDepositoPadrao(client);

    await client.query("BEGIN");

    try {
      const produtoResult = await client.query(
        `
          SELECT produto_id, descricao
          FROM produto
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND produto_id = $1
            AND ativo = TRUE
            AND excluido = FALSE
            AND controla_estoque = TRUE
          LIMIT 1
        `,
        [produtoId]
      );

      if (!produtoResult.rows[0]) {
        throw new Error("Produto inválido para ajuste de estoque.");
      }

      const saldoResult = await client.query(
        `
          SELECT produto_estoque_id, estoque_atual
          FROM produto_estoque
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND produto_id = $1
            AND deposito_id = $2
          FOR UPDATE
        `,
        [produtoId, depositoId]
      );

      const saldoAnterior = Number(saldoResult.rows[0]?.estoque_atual || 0);
      let quantidadeMovimento = quantidade;
      let saldoPosterior = saldoAnterior;
      let tipoCodigo = "ajuste_entrada";

      if (tipoAjuste === "entrada") {
        saldoPosterior = saldoAnterior + quantidade;
        tipoCodigo = "ajuste_entrada";
      } else if (tipoAjuste === "saida") {
        saldoPosterior = saldoAnterior - quantidade;
        quantidadeMovimento = -quantidade;
        tipoCodigo = "ajuste_saida";
      } else {
        saldoPosterior = quantidade;
        quantidadeMovimento = quantidade - saldoAnterior;
        tipoCodigo = "ajuste_saldo";
      }

      if (saldoPosterior < 0) {
        throw new Error("O ajuste não pode deixar o estoque negativo.");
      }

      const tipoResult = await client.query(
        `
          SELECT estoque_tipo_movimento_id
          FROM estoque_tipo_movimento
          WHERE codigo = $1
          LIMIT 1
        `,
        [tipoCodigo]
      );

      const tipoMovimentoId = tipoResult.rows[0]?.estoque_tipo_movimento_id || null;

      await client.query(
        `
          INSERT INTO produto_estoque (
            tenant_id,
            produto_id,
            deposito_id,
            estoque_atual,
            estoque_minimo,
            estoque_reservado
          )
          VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3, 0, 0)
          ON CONFLICT (produto_id, deposito_id) DO UPDATE
          SET
            estoque_atual = EXCLUDED.estoque_atual,
            atualizado_em = NOW()
        `,
        [produtoId, depositoId, saldoPosterior]
      );

      const movimentoResult = await client.query(
        `
          INSERT INTO estoque_movimento (
            tenant_id,
            produto_id,
            deposito_id,
            estoque_tipo_movimento_id,
            tipo_movimento,
            quantidade,
            valor_unitario,
            origem,
            documento_tipo,
            documento_id,
            saldo_anterior,
            saldo_posterior,
            usuario_id,
            observacao
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            $4,
            $5,
            0,
            'ajuste_manual',
            'ajuste_estoque',
            NULL,
            $6,
            $7,
            $8,
            $9
          )
          RETURNING estoque_movimento_id
        `,
        [
          produtoId,
          depositoId,
          tipoMovimentoId,
          tipoCodigo,
          quantidadeMovimento,
          saldoAnterior,
          saldoPosterior,
          usuarioId || null,
          observacao,
        ]
      );

      await client.query("COMMIT");

      return {
        estoque_movimento_id: movimentoResult.rows[0].estoque_movimento_id,
        produto_id: produtoId,
        saldo_anterior: saldoAnterior,
        saldo_posterior: saldoPosterior,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export default EstoqueDAO;
