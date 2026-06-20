import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

const mapRow = (row = {}) => ({
  produto_id: row.produto_id,
  codigo_interno: row.codigo_interno,
  descricao: row.descricao,
  descricao_fiscal: row.descricao_fiscal,
  gtin: row.gtin,
  marca: row.marca,
  tipo_produto: row.tipo_produto,
  controla_estoque: row.controla_estoque,
  permite_fracionar: row.permite_fracionar,
  ativo: row.ativo,
  ncm: row.ncm,
  cest: row.cest,
  origem_mercadoria: row.origem_mercadoria,
  unidade_comercial_sigla: row.unidade_comercial_sigla,
  unidade_tributavel_sigla: row.unidade_tributavel_sigla,
  preco_venda:
    row.preco_venda !== null && row.preco_venda !== undefined ? Number(row.preco_venda) : 0,
  preco_custo:
    row.preco_custo !== null && row.preco_custo !== undefined ? Number(row.preco_custo) : 0,
  margem:
    row.margem !== null && row.margem !== undefined ? Number(row.margem) : 0,
  estoque_atual:
    row.estoque_atual !== null && row.estoque_atual !== undefined
      ? Number(row.estoque_atual)
      : 0,
  estoque_minimo:
    row.estoque_minimo !== null && row.estoque_minimo !== undefined
      ? Number(row.estoque_minimo)
      : 0,
  criado_em: row.criado_em,
  atualizado_em: row.atualizado_em,
});

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "sim", "yes"].includes(normalized)) return true;
  if (["false", "0", "nao", "não", "no"].includes(normalized)) return false;
  return defaultValue;
};

const parseInteger = (value, { allowNull = false, min = 1, label = "Campo" } = {}) => {
  if (value === null || value === undefined || value === "") {
    if (allowNull) return null;
    throw new Error(`${label} obrigatório.`);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(`${label} inválido.`);
  }

  return parsed;
};

const parseNumeric = (
  value,
  { allowNull = false, defaultValue = null, label = "Campo" } = {}
) => {
  if (value === null || value === undefined || value === "") {
    if (allowNull) return null;
    if (defaultValue !== null) return defaultValue;
    throw new Error(`${label} obrigatório.`);
  }

  let normalized = String(value).trim();
  if (!normalized) {
    if (allowNull) return null;
    if (defaultValue !== null) return defaultValue;
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
    if (required) {
      throw new Error(`${label} obrigatório não informado.`);
    }
    return null;
  }

  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const calcMargem = (precoVenda, precoCusto) => {
  if (!precoCusto || precoCusto <= 0 || !precoVenda || precoVenda <= 0) {
    return 0;
  }
  return Number((((precoVenda - precoCusto) / precoCusto) * 100).toFixed(4));
};

const CODIGO_INTERNO_SQL = "COALESCE(NULLIF(p.codigo_interno, ''), p.produto_id::varchar(60))";

class ProdutoDAO {
  static async listar(client, { page = 1, limit = 20, search = "", sort = {} }) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const values = [];
    const normalizedSearch = String(search || "").trim();

    let where = `WHERE p.tenant_id = ${TENANT_CONTEXT_SQL} AND p.excluido = FALSE`;

    if (normalizedSearch) {
      const likeValue = `%${normalizedSearch}%`;
      values.push(likeValue);
      const index = values.length;
      where += `
        AND (
          LOWER(${CODIGO_INTERNO_SQL}) LIKE LOWER($${index})
          OR LOWER(p.descricao) LIKE LOWER($${index})
          OR LOWER(p.descricao_fiscal) LIKE LOWER($${index})
          OR LOWER(COALESCE(pf.ncm, '')) LIKE LOWER($${index})
        )
      `;
    }

    const sortableColumns = {
      produto_id: "p.produto_id",
      codigo_interno: CODIGO_INTERNO_SQL,
      descricao: "p.descricao",
      ncm: "pf.ncm",
      preco_venda: "pp.preco_venda",
      estoque_atual: "pe.estoque_atual",
      ativo: "p.ativo",
    };

    const orderEntries = Object.entries(sort || {})
      .filter(([column]) => sortableColumns[column])
      .map(([column, direction]) => {
        const safeDirection = String(direction).toUpperCase() === "DESC" ? "DESC" : "ASC";
        return `${sortableColumns[column]} ${safeDirection}`;
      });

    const orderBy = orderEntries.length ? orderEntries.join(", ") : "p.descricao ASC";

    const selectSql = `
      SELECT
        p.produto_id,
        ${CODIGO_INTERNO_SQL} AS codigo_interno,
        p.descricao,
        p.descricao_fiscal,
        p.gtin,
        p.marca,
        p.tipo_produto,
        p.controla_estoque,
        p.permite_fracionar,
        p.ativo,
        p.criado_em,
        p.atualizado_em,
        pf.ncm,
        pf.cest,
        pf.origem_mercadoria,
        uc.sigla AS unidade_comercial_sigla,
        ut.sigla AS unidade_tributavel_sigla,
        pp.preco_venda,
        pp.preco_custo,
        pp.margem,
        pe.estoque_atual,
        pe.estoque_minimo
      FROM produto p
      LEFT JOIN produto_fiscal pf ON pf.produto_id = p.produto_id
      LEFT JOIN produto_unidade pu ON pu.produto_id = p.produto_id
      LEFT JOIN unidade_medida uc ON uc.unidade_medida_id = pu.unidade_comercial_id
      LEFT JOIN unidade_medida ut ON ut.unidade_medida_id = pu.unidade_tributavel_id
      LEFT JOIN tabela_preco tp
        ON tp.tenant_id = p.tenant_id
       AND tp.padrao = TRUE
       AND tp.excluido = FALSE
      LEFT JOIN produto_preco pp
        ON pp.produto_id = p.produto_id
       AND pp.tabela_preco_id = tp.tabela_preco_id
       AND pp.ativo = TRUE
       AND (pp.data_fim IS NULL OR pp.data_fim >= CURRENT_DATE)
      LEFT JOIN deposito d
        ON d.tenant_id = p.tenant_id
       AND d.padrao = TRUE
       AND d.excluido = FALSE
      LEFT JOIN produto_estoque pe
        ON pe.produto_id = p.produto_id
       AND pe.deposito_id = d.deposito_id
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM produto p
      LEFT JOIN produto_fiscal pf ON pf.produto_id = p.produto_id
      ${where}
    `;

    const [result, countResult] = await Promise.all([
      client.query(selectSql, [...values, safeLimit, offset]),
      client.query(countSql, values),
    ]);

    const total = countResult.rows[0]?.total || 0;
    return {
      data: result.rows.map(mapRow),
      page: safePage,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  static async listarUnidades(client) {
    const { rows } = await client.query(
      `
        SELECT unidade_medida_id, sigla, descricao
        FROM unidade_medida
        WHERE ativo = TRUE
        ORDER BY sigla
      `
    );
    return rows;
  }

  static async obterTabelaPrecoPadrao(client) {
    const { rows } = await client.query(
      `
        SELECT tabela_preco_id, nome
        FROM tabela_preco
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND padrao = TRUE
          AND excluido = FALSE
        ORDER BY tabela_preco_id
        LIMIT 1
      `
    );
    return rows[0] || null;
  }

  static async obterDepositosPadrao(client) {
    const { rows } = await client.query(
      `
        SELECT deposito_id, nome
        FROM deposito
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND padrao = TRUE
          AND excluido = FALSE
        ORDER BY deposito_id
        LIMIT 1
      `
    );
    return rows[0] || null;
  }

  static async obterSupportData(client) {
    const [unidades, tabelaPrecoPadrao, depositoPadrao] = await Promise.all([
      this.listarUnidades(client),
      this.obterTabelaPrecoPadrao(client),
      this.obterDepositosPadrao(client),
    ]);

    return {
      unidades,
      tabelaPrecoPadrao,
      depositoPadrao,
    };
  }

  static async buscarPorId(client, produtoId) {
    const { rows } = await client.query(
      `
        SELECT
          p.produto_id,
          ${CODIGO_INTERNO_SQL} AS codigo_interno,
          p.descricao,
          p.descricao_fiscal,
          p.gtin,
          p.marca,
          p.tipo_produto,
          p.controla_estoque,
          p.permite_fracionar,
          p.ativo,
          pf.ncm,
          pf.cest,
          pf.extipi,
          pf.origem_mercadoria,
          pf.cbenef,
          pf.fci,
          pf.cfop_venda_interna,
          pf.cfop_venda_interestadual,
          pf.cfop_compra,
          pf.ind_escala,
          pf.cnpj_fabricante,
          pf.exige_lote,
          pf.exige_validade,
          pu.unidade_comercial_id,
          pu.unidade_tributavel_id,
          pu.fator_conversao,
          pu.casas_decimais_comercial,
          pu.casas_decimais_tributavel,
          pp.preco_venda,
          pp.preco_custo,
          pp.margem,
          pe.estoque_atual,
          pe.estoque_minimo,
          pe.estoque_reservado
        FROM produto p
        LEFT JOIN produto_fiscal pf ON pf.produto_id = p.produto_id
        LEFT JOIN produto_unidade pu ON pu.produto_id = p.produto_id
        LEFT JOIN tabela_preco tp
          ON tp.tenant_id = p.tenant_id
         AND tp.padrao = TRUE
         AND tp.excluido = FALSE
        LEFT JOIN produto_preco pp
          ON pp.produto_id = p.produto_id
         AND pp.tabela_preco_id = tp.tabela_preco_id
         AND pp.ativo = TRUE
         AND (pp.data_fim IS NULL OR pp.data_fim >= CURRENT_DATE)
        LEFT JOIN deposito d
          ON d.tenant_id = p.tenant_id
         AND d.padrao = TRUE
         AND d.excluido = FALSE
        LEFT JOIN produto_estoque pe
          ON pe.produto_id = p.produto_id
         AND pe.deposito_id = d.deposito_id
        WHERE p.produto_id = $1
          AND p.tenant_id = ${TENANT_CONTEXT_SQL}
          AND p.excluido = FALSE
        LIMIT 1
      `,
      [produtoId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
      produto_id: row.produto_id,
      codigo_interno: row.codigo_interno,
      descricao: row.descricao,
      descricao_fiscal: row.descricao_fiscal,
      gtin: row.gtin,
      marca: row.marca,
      tipo_produto: row.tipo_produto,
      controla_estoque: row.controla_estoque,
      permite_fracionar: row.permite_fracionar,
      ativo: row.ativo,
      ncm: row.ncm,
      cest: row.cest,
      extipi: row.extipi,
      origem_mercadoria: row.origem_mercadoria,
      cbenef: row.cbenef,
      fci: row.fci,
      cfop_venda_interna: row.cfop_venda_interna,
      cfop_venda_interestadual: row.cfop_venda_interestadual,
      cfop_compra: row.cfop_compra,
      ind_escala: row.ind_escala,
      cnpj_fabricante: row.cnpj_fabricante,
      exige_lote: row.exige_lote,
      exige_validade: row.exige_validade,
      unidade_comercial_id: row.unidade_comercial_id,
      unidade_tributavel_id: row.unidade_tributavel_id,
      fator_conversao:
        row.fator_conversao !== null && row.fator_conversao !== undefined
          ? Number(row.fator_conversao)
          : 1,
      casas_decimais_comercial: row.casas_decimais_comercial ?? 2,
      casas_decimais_tributavel: row.casas_decimais_tributavel ?? 2,
      preco_venda:
        row.preco_venda !== null && row.preco_venda !== undefined ? Number(row.preco_venda) : 0,
      preco_custo:
        row.preco_custo !== null && row.preco_custo !== undefined ? Number(row.preco_custo) : 0,
      margem: row.margem !== null && row.margem !== undefined ? Number(row.margem) : 0,
      estoque_atual:
        row.estoque_atual !== null && row.estoque_atual !== undefined
          ? Number(row.estoque_atual)
          : 0,
      estoque_minimo:
        row.estoque_minimo !== null && row.estoque_minimo !== undefined
          ? Number(row.estoque_minimo)
          : 0,
      estoque_reservado:
        row.estoque_reservado !== null && row.estoque_reservado !== undefined
          ? Number(row.estoque_reservado)
          : 0,
    };
  }

  static normalizePayload(payload = {}) {
    const produto = {
      descricao: normalizeText(payload.descricao, 180, {
        required: true,
        label: "Descrição interna",
      }),
      descricao_fiscal: normalizeText(payload.descricao_fiscal, 240, {
        required: true,
        label: "Descrição fiscal / NF-e",
      }),
      gtin: normalizeText(payload.gtin, 20),
      marca: normalizeText(payload.marca, 120),
      tipo_produto: normalizeText(payload.tipo_produto, 20, {
        required: true,
        label: "Tipo de produto",
      }),
      controla_estoque: parseBoolean(payload.controla_estoque, true),
      permite_fracionar: parseBoolean(payload.permite_fracionar, false),
      ativo: parseBoolean(payload.ativo, true),
      fiscal: {
        ncm: normalizeText(payload.ncm, 8, { required: true, label: "NCM" }),
        cest: normalizeText(payload.cest, 7),
        extipi: normalizeText(payload.extipi, 3),
        origem_mercadoria: normalizeText(payload.origem_mercadoria, 1, {
          required: true,
          label: "Origem da mercadoria",
        }),
        cbenef: normalizeText(payload.cbenef, 10),
        fci: normalizeText(payload.fci, 36),
        cfop_venda_interna: normalizeText(payload.cfop_venda_interna, 4),
        cfop_venda_interestadual: normalizeText(payload.cfop_venda_interestadual, 4),
        cfop_compra: normalizeText(payload.cfop_compra, 4),
        ind_escala: normalizeText(payload.ind_escala, 1),
        cnpj_fabricante: normalizeText(payload.cnpj_fabricante, 14),
        exige_lote: parseBoolean(payload.exige_lote, false),
        exige_validade: parseBoolean(payload.exige_validade, false),
      },
      unidade: {
        unidade_comercial_id: parseInteger(payload.unidade_comercial_id, {
          label: "Unidade comercial",
        }),
        fator_conversao: 1,
        casas_decimais_comercial: 2,
        casas_decimais_tributavel: 2,
      },
      preco: {
        preco_venda: parseNumeric(payload.preco_venda, {
          defaultValue: 0,
          label: "Preço de venda",
        }),
        preco_custo: parseNumeric(payload.preco_custo, {
          defaultValue: 0,
          label: "Preço de custo",
        }),
        margem:
          payload.margem === null || payload.margem === undefined || payload.margem === ""
            ? null
            : parseNumeric(payload.margem, { allowNull: true, label: "Margem" }),
      },
      estoque: {
        estoque_atual: parseNumeric(payload.estoque_atual, {
          defaultValue: 0,
          label: "Estoque atual",
        }),
        estoque_minimo: parseNumeric(payload.estoque_minimo, {
          defaultValue: 0,
          label: "Estoque mínimo",
        }),
        estoque_reservado: parseNumeric(payload.estoque_reservado, {
          defaultValue: 0,
          label: "Estoque reservado",
        }),
      },
    };

    if (produto.unidade.casas_decimais_comercial < 0 || produto.unidade.casas_decimais_comercial > 6) {
      throw new Error("Casas decimais comercial inválida.");
    }

    if (produto.unidade.casas_decimais_tributavel < 0 || produto.unidade.casas_decimais_tributavel > 6) {
      throw new Error("Casas decimais tributável inválida.");
    }

    if (produto.preco.margem === null) {
      produto.preco.margem = calcMargem(produto.preco.preco_venda, produto.preco.preco_custo);
    }

    produto.unidade.unidade_tributavel_id = produto.unidade.unidade_comercial_id;

    return produto;
  }

  static async validarUnidades(client, unidadeComercialId, unidadeTributavelId) {
    const { rows } = await client.query(
      `
        SELECT unidade_medida_id
        FROM unidade_medida
        WHERE unidade_medida_id = ANY($1::int[])
          AND ativo = TRUE
      `,
      [[unidadeComercialId, unidadeTributavelId]]
    );

    const ids = rows.map((row) => Number(row.unidade_medida_id));
    if (!ids.includes(unidadeComercialId) || !ids.includes(unidadeTributavelId)) {
      throw new Error("Unidade comercial ou tributável inválida.");
    }
  }

  static async criar(client, payload) {
    const data = this.normalizePayload(payload);
    const supportData = await this.obterSupportData(client);

    if (!supportData.tabelaPrecoPadrao || !supportData.depositoPadrao) {
      throw new Error("Tabela de preço ou depósito padrão não configurados para a filial.");
    }

    await this.validarUnidades(
      client,
      data.unidade.unidade_comercial_id,
      data.unidade.unidade_tributavel_id
    );

    await client.query("BEGIN");

    try {
      const produtoResult = await client.query(
        `
          INSERT INTO produto (
            tenant_id,
            descricao,
            descricao_fiscal,
            gtin,
            marca,
            tipo_produto,
            controla_estoque,
            permite_fracionar,
            ativo,
            excluido
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            FALSE
          )
          RETURNING produto_id
        `,
        [
          data.descricao,
          data.descricao_fiscal,
          data.gtin,
          data.marca,
          data.tipo_produto,
          data.controla_estoque,
          data.permite_fracionar,
          data.ativo,
        ]
      );

      const produtoId = Number(produtoResult.rows[0].produto_id);

      await client.query(
        `
          UPDATE produto
          SET codigo_interno = produto_id::varchar(60)
          WHERE produto_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
        `,
        [produtoId]
      );

      await client.query(
        `
          INSERT INTO produto_fiscal (
            tenant_id,
            produto_id,
            ncm,
            cest,
            extipi,
            origem_mercadoria,
            cbenef,
            fci,
            cfop_venda_interna,
            cfop_venda_interestadual,
            cfop_compra,
            ind_escala,
            cnpj_fabricante,
            exige_lote,
            exige_validade
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14
          )
        `,
        [
          produtoId,
          data.fiscal.ncm,
          data.fiscal.cest,
          data.fiscal.extipi,
          data.fiscal.origem_mercadoria,
          data.fiscal.cbenef,
          data.fiscal.fci,
          data.fiscal.cfop_venda_interna,
          data.fiscal.cfop_venda_interestadual,
          data.fiscal.cfop_compra,
          data.fiscal.ind_escala,
          data.fiscal.cnpj_fabricante,
          data.fiscal.exige_lote,
          data.fiscal.exige_validade,
        ]
      );

      await client.query(
        `
          INSERT INTO produto_unidade (
            tenant_id,
            produto_id,
            unidade_comercial_id,
            unidade_tributavel_id,
            fator_conversao,
            casas_decimais_comercial,
            casas_decimais_tributavel
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
        `,
        [
          produtoId,
          data.unidade.unidade_comercial_id,
          data.unidade.unidade_tributavel_id,
          data.unidade.fator_conversao,
          data.unidade.casas_decimais_comercial,
          data.unidade.casas_decimais_tributavel,
        ]
      );

      await client.query(
        `
          INSERT INTO produto_preco (
            tenant_id,
            produto_id,
            tabela_preco_id,
            preco_venda,
            preco_custo,
            margem,
            data_inicio,
            ativo
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            $4,
            $5,
            CURRENT_DATE,
            TRUE
          )
        `,
        [
          produtoId,
          supportData.tabelaPrecoPadrao.tabela_preco_id,
          data.preco.preco_venda,
          data.preco.preco_custo,
          data.preco.margem,
        ]
      );

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
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            $4,
            $5
          )
        `,
        [
          produtoId,
          supportData.depositoPadrao.deposito_id,
          data.estoque.estoque_atual,
          data.estoque.estoque_minimo,
          data.estoque.estoque_reservado,
        ]
      );

      await client.query("COMMIT");
      return this.buscarPorId(client, produtoId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async atualizar(client, produtoId, payload) {
    const existing = await this.buscarPorId(client, produtoId);
    if (!existing) {
      throw new Error("Produto não encontrado.");
    }

    const data = this.normalizePayload(payload);
    const supportData = await this.obterSupportData(client);

    if (!supportData.tabelaPrecoPadrao || !supportData.depositoPadrao) {
      throw new Error("Tabela de preço ou depósito padrão não configurados para a filial.");
    }

    await this.validarUnidades(
      client,
      data.unidade.unidade_comercial_id,
      data.unidade.unidade_tributavel_id
    );

    await client.query("BEGIN");

    try {
      await client.query(
        `
          UPDATE produto
          SET
            descricao = $1,
            descricao_fiscal = $2,
            gtin = $3,
            marca = $4,
            tipo_produto = $5,
            controla_estoque = $6,
            permite_fracionar = $7,
            ativo = $8,
            atualizado_em = NOW()
          WHERE produto_id = $9
            AND tenant_id = ${TENANT_CONTEXT_SQL}
            AND excluido = FALSE
        `,
        [
          data.descricao,
          data.descricao_fiscal,
          data.gtin,
          data.marca,
          data.tipo_produto,
          data.controla_estoque,
          data.permite_fracionar,
          data.ativo,
          produtoId,
        ]
      );

      await client.query(
        `
          INSERT INTO produto_fiscal (
            tenant_id,
            produto_id,
            ncm,
            cest,
            extipi,
            origem_mercadoria,
            cbenef,
            fci,
            cfop_venda_interna,
            cfop_venda_interestadual,
            cfop_compra,
            ind_escala,
            cnpj_fabricante,
            exige_lote,
            exige_validade
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14
          )
          ON CONFLICT (produto_id)
          DO UPDATE SET
            ncm = EXCLUDED.ncm,
            cest = EXCLUDED.cest,
            extipi = EXCLUDED.extipi,
            origem_mercadoria = EXCLUDED.origem_mercadoria,
            cbenef = EXCLUDED.cbenef,
            fci = EXCLUDED.fci,
            cfop_venda_interna = EXCLUDED.cfop_venda_interna,
            cfop_venda_interestadual = EXCLUDED.cfop_venda_interestadual,
            cfop_compra = EXCLUDED.cfop_compra,
            ind_escala = EXCLUDED.ind_escala,
            cnpj_fabricante = EXCLUDED.cnpj_fabricante,
            exige_lote = EXCLUDED.exige_lote,
            exige_validade = EXCLUDED.exige_validade,
            atualizado_em = NOW()
        `,
        [
          produtoId,
          data.fiscal.ncm,
          data.fiscal.cest,
          data.fiscal.extipi,
          data.fiscal.origem_mercadoria,
          data.fiscal.cbenef,
          data.fiscal.fci,
          data.fiscal.cfop_venda_interna,
          data.fiscal.cfop_venda_interestadual,
          data.fiscal.cfop_compra,
          data.fiscal.ind_escala,
          data.fiscal.cnpj_fabricante,
          data.fiscal.exige_lote,
          data.fiscal.exige_validade,
        ]
      );

      await client.query(
        `
          INSERT INTO produto_unidade (
            tenant_id,
            produto_id,
            unidade_comercial_id,
            unidade_tributavel_id,
            fator_conversao,
            casas_decimais_comercial,
            casas_decimais_tributavel
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
          ON CONFLICT (produto_id)
          DO UPDATE SET
            unidade_comercial_id = EXCLUDED.unidade_comercial_id,
            unidade_tributavel_id = EXCLUDED.unidade_tributavel_id,
            fator_conversao = EXCLUDED.fator_conversao,
            casas_decimais_comercial = EXCLUDED.casas_decimais_comercial,
            casas_decimais_tributavel = EXCLUDED.casas_decimais_tributavel,
            atualizado_em = NOW()
        `,
        [
          produtoId,
          data.unidade.unidade_comercial_id,
          data.unidade.unidade_tributavel_id,
          data.unidade.fator_conversao,
          data.unidade.casas_decimais_comercial,
          data.unidade.casas_decimais_tributavel,
        ]
      );

      await client.query(
        `
          INSERT INTO produto_preco (
            tenant_id,
            produto_id,
            tabela_preco_id,
            preco_venda,
            preco_custo,
            margem,
            data_inicio,
            ativo
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            $4,
            $5,
            CURRENT_DATE,
            TRUE
          )
          ON CONFLICT DO NOTHING
        `,
        [
          produtoId,
          supportData.tabelaPrecoPadrao.tabela_preco_id,
          data.preco.preco_venda,
          data.preco.preco_custo,
          data.preco.margem,
        ]
      );

      await client.query(
        `
          UPDATE produto_preco
          SET
            preco_venda = $1,
            preco_custo = $2,
            margem = $3,
            ativo = TRUE,
            atualizado_em = NOW()
          WHERE produto_id = $4
            AND tabela_preco_id = $5
            AND tenant_id = ${TENANT_CONTEXT_SQL}
        `,
        [
          data.preco.preco_venda,
          data.preco.preco_custo,
          data.preco.margem,
          produtoId,
          supportData.tabelaPrecoPadrao.tabela_preco_id,
        ]
      );

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
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            $4,
            $5
          )
          ON CONFLICT (produto_id, deposito_id)
          DO UPDATE SET
            estoque_atual = EXCLUDED.estoque_atual,
            estoque_minimo = EXCLUDED.estoque_minimo,
            estoque_reservado = EXCLUDED.estoque_reservado,
            atualizado_em = NOW()
        `,
        [
          produtoId,
          supportData.depositoPadrao.deposito_id,
          data.estoque.estoque_atual,
          data.estoque.estoque_minimo,
          data.estoque.estoque_reservado,
        ]
      );

      await client.query("COMMIT");
      return this.buscarPorId(client, produtoId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async excluir(client, produtoId) {
    const existing = await this.buscarPorId(client, produtoId);
    if (!existing) {
      throw new Error("Produto não encontrado.");
    }

    await client.query("BEGIN");

    try {
      await client.query(
        `
          UPDATE produto
          SET
            ativo = FALSE,
            excluido = TRUE,
            atualizado_em = NOW()
          WHERE produto_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
        `,
        [produtoId]
      );

      await client.query(
        `
          UPDATE produto_preco
          SET
            ativo = FALSE,
            data_fim = CURRENT_DATE,
            atualizado_em = NOW()
          WHERE produto_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
            AND ativo = TRUE
        `,
        [produtoId]
      );

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export default ProdutoDAO;
