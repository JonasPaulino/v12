import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

const SORT_COLUMNS = {
  financeiro_titulo_id: "ft.financeiro_titulo_id",
  tipo: "ft.tipo",
  pessoa_nome_razao: "p.pessoa_nome_razao",
  data_emissao: "ft.data_emissao",
  data_vencimento: "ft.data_vencimento",
  valor_final: "ft.valor_final",
  saldo: "saldo",
  status: "status_calculado",
};

const buildOrderBy = (sort = {}) => {
  const entries = Object.entries(sort)
    .map(([column, direction]) => {
      if (!SORT_COLUMNS[column]) return null;
      const safeDirection = String(direction).toUpperCase() === "DESC" ? "DESC" : "ASC";
      return `${SORT_COLUMNS[column]} ${safeDirection}`;
    })
    .filter(Boolean);

  return entries.length ? entries.join(", ") : "ft.data_vencimento ASC, ft.financeiro_titulo_id DESC";
};

const normalizeText = (value, maxLength, { required = false, label = "Campo" } = {}) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    if (required) {
      throw new Error(`${label} obrigatorio nao informado.`);
    }

    return null;
  }

  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const parseInteger = (value, { allowNull = false, min = 1, label = "Campo" } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (allowNull) return null;
    throw new Error(`${label} obrigatorio.`);
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(`${label} invalido.`);
  }

  return parsed;
};

const parseNumeric = (
  value,
  { defaultValue = null, allowNull = false, label = "Campo" } = {}
) => {
  if (value === undefined || value === null || value === "") {
    if (allowNull) return null;
    if (defaultValue !== null) return defaultValue;
    throw new Error(`${label} obrigatorio.`);
  }

  let normalized = String(value).trim();
  if (!normalized) {
    if (allowNull) return null;
    if (defaultValue !== null) return defaultValue;
    throw new Error(`${label} obrigatorio.`);
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
    throw new Error(`${label} invalido.`);
  }

  return parsed;
};

const roundCurrency = (value) => Number((Number(value || 0)).toFixed(2));

const addDays = (baseDate, days) => {
  const date = new Date(`${baseDate}T12:00:00`);
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

const buildStatusParcela = (dataVencimento) => {
  const today = new Date().toISOString().slice(0, 10);
  return dataVencimento < today ? "vencida" : "aberta";
};

class FinanceiroDAO {
  static async listarPessoasSelect(client, { search = "", limit = 20 } = {}) {
    const values = [];
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 50) : 20;
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE p.pessoa_ativo = TRUE
        AND p.pessoa_excluido = FALSE
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          LOWER(unaccent(p.pessoa_nome_razao)) LIKE LOWER(unaccent($${values.length}))
          OR LOWER(unaccent(COALESCE(p.pessoa_cpf_cnpj, ''))) LIKE LOWER(unaccent($${values.length}))
        )
      `;
    }

    values.push(safeLimit);

    const { rows } = await client.query(
      `
        SELECT
          p.pessoa_id,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj
        FROM pessoa p
        JOIN pessoa_tenant pt
          ON pt.pessoa_id = p.pessoa_id
         AND pt.tenant_id = ${TENANT_CONTEXT_SQL}
         AND pt.ativo = TRUE
        ${where}
        ORDER BY p.pessoa_nome_razao
        LIMIT $${values.length}
      `,
      values
    );

    return rows;
  }

  static async listarCondicoesPagamento(client, { tipo = "receber" } = {}) {
    const values = [];
    let where = `
      WHERE tenant_id = ${TENANT_CONTEXT_SQL}
        AND ativo = TRUE
    `;

    if (tipo) {
      values.push(tipo);
      where += ` AND (tipo = $${values.length} OR tipo = 'ambos')`;
    }

    const { rows } = await client.query(
      `
        SELECT
          financeiro_condicao_pagamento_id,
          descricao,
          tipo,
          quantidade_parcelas,
          dias_primeiro_vencimento,
          intervalo_dias,
          percentual_entrada,
          padrao
        FROM financeiro_condicao_pagamento
        ${where}
        ORDER BY padrao DESC, descricao
      `,
      values
    );

    return rows.map((row) => ({
      ...row,
      percentual_entrada: Number(row.percentual_entrada || 0),
    }));
  }

  static async obterSupportData(client, { tipo = "receber" } = {}) {
    const condicoesPagamento = await this.listarCondicoesPagamento(client, { tipo });

    return {
      condicoesPagamento,
      condicaoPagamentoPadrao:
        condicoesPagamento.find((item) => item.padrao) || condicoesPagamento[0] || null,
    };
  }

  static buildFilters({ search = "", tipo = "", status = "" } = {}) {
    const values = [];
    let where = `
      WHERE ft.tenant_id = ${TENANT_CONTEXT_SQL}
        AND ft.excluido = FALSE
    `;

    const normalizedTipo = String(tipo || "").trim().toLowerCase();
    if (["receber", "pagar"].includes(normalizedTipo)) {
      values.push(normalizedTipo);
      where += ` AND ft.tipo = $${values.length}`;
    }

    const normalizedSearch = String(search || "").trim();
    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          CAST(ft.financeiro_titulo_id AS TEXT) LIKE $${values.length}
          OR LOWER(unaccent(COALESCE(p.pessoa_nome_razao, ''))) LIKE LOWER(unaccent($${values.length}))
          OR LOWER(unaccent(COALESCE(p.pessoa_cpf_cnpj, ''))) LIKE LOWER(unaccent($${values.length}))
          OR LOWER(unaccent(COALESCE(ft.numero_documento, ''))) LIKE LOWER(unaccent($${values.length}))
          OR LOWER(unaccent(COALESCE(ft.descricao, ''))) LIKE LOWER(unaccent($${values.length}))
        )
      `;
    }

    const normalizedStatus = String(status || "").trim().toLowerCase();
    if (normalizedStatus && normalizedStatus !== "todos") {
      if (normalizedStatus === "vencido") {
        where += `
          AND ft.status IN ('aberto', 'parcial', 'vencido')
          AND ft.data_vencimento < CURRENT_DATE
        `;
      } else if (normalizedStatus === "aberto") {
        values.push(normalizedStatus);
        where += `
          AND ft.status = $${values.length}
          AND ft.data_vencimento >= CURRENT_DATE
        `;
      } else if (normalizedStatus === "parcial") {
        values.push(normalizedStatus);
        where += `
          AND ft.status = $${values.length}
          AND ft.data_vencimento >= CURRENT_DATE
        `;
      } else {
        values.push(normalizedStatus);
        where += ` AND ft.status = $${values.length}`;
      }
    }

    return { where, values };
  }

  static async listar(client, { page = 1, limit = 20, search = "", tipo = "", status = "", sort = {} }) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const { where, values } = this.buildFilters({ search, tipo, status });
    const orderBy = buildOrderBy(sort);

    const baseFrom = `
      FROM financeiro_titulo ft
      JOIN pessoa p ON p.pessoa_id = ft.pessoa_id
      LEFT JOIN financeiro_condicao_pagamento cp
        ON cp.financeiro_condicao_pagamento_id = ft.financeiro_condicao_pagamento_id
      LEFT JOIN (
        SELECT
          financeiro_titulo_id,
          COALESCE(SUM(valor_baixa), 0) AS valor_baixado
        FROM financeiro_titulo_baixa
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND excluido = FALSE
        GROUP BY financeiro_titulo_id
      ) fb ON fb.financeiro_titulo_id = ft.financeiro_titulo_id
      ${where}
    `;

    const statusCalculadoSql = `
      CASE
        WHEN ft.status IN ('quitado', 'cancelado') THEN ft.status
        WHEN ft.data_vencimento < CURRENT_DATE THEN 'vencido'
        ELSE ft.status
      END
    `;

    const listSql = `
      SELECT
        ft.financeiro_titulo_id,
        ft.pedido_venda_id,
        ft.pessoa_id,
        p.pessoa_nome_razao,
        p.pessoa_cpf_cnpj,
        ft.financeiro_condicao_pagamento_id,
        cp.descricao AS condicao_pagamento_descricao,
        ft.numero_documento,
        ft.descricao,
        ft.tipo,
        ft.status,
        ${statusCalculadoSql} AS status_calculado,
        ft.valor_original,
        ft.desconto,
        ft.acrescimo,
        ft.valor_final,
        COALESCE(fb.valor_baixado, 0) AS valor_baixado,
        GREATEST(ft.valor_final - COALESCE(fb.valor_baixado, 0), 0) AS saldo,
        ft.data_emissao,
        ft.data_vencimento,
        ft.observacao
      ${baseFrom}
      ORDER BY ${orderBy}
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      ${baseFrom}
    `;

    const resumoSql = `
      SELECT
        COUNT(*)::int AS quantidade_titulos,
        COALESCE(SUM(CASE WHEN ft.tipo = 'receber' THEN GREATEST(ft.valor_final - COALESCE(fb.valor_baixado, 0), 0) ELSE 0 END), 0) AS total_receber,
        COALESCE(SUM(CASE WHEN ft.tipo = 'pagar' THEN GREATEST(ft.valor_final - COALESCE(fb.valor_baixado, 0), 0) ELSE 0 END), 0) AS total_pagar,
        COALESCE(SUM(CASE WHEN ft.status IN ('aberto', 'parcial', 'vencido') AND ft.data_vencimento < CURRENT_DATE THEN GREATEST(ft.valor_final - COALESCE(fb.valor_baixado, 0), 0) ELSE 0 END), 0) AS total_vencido
      ${baseFrom}
    `;

    const [listResult, countResult, resumoResult] = await Promise.all([
      client.query(listSql, [...values, safeLimit, offset]),
      client.query(countSql, values),
      client.query(resumoSql, values),
    ]);

    const total = countResult.rows[0]?.total || 0;
    const resumo = resumoResult.rows[0] || {};

    return {
      data: listResult.rows.map((row) => ({
        ...row,
        valor_original: Number(row.valor_original || 0),
        desconto: Number(row.desconto || 0),
        acrescimo: Number(row.acrescimo || 0),
        valor_final: Number(row.valor_final || 0),
        valor_baixado: Number(row.valor_baixado || 0),
        saldo: Number(row.saldo || 0),
      })),
      page: safePage,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      resumo: {
        quantidadeTitulos: Number(resumo.quantidade_titulos || 0),
        totalReceber: Number(resumo.total_receber || 0),
        totalPagar: Number(resumo.total_pagar || 0),
        totalVencido: Number(resumo.total_vencido || 0),
      },
    };
  }

  static async verificarTituloComBaixas(client, financeiroTituloId) {
    const { rowCount } = await client.query(
      `
        SELECT 1
        FROM financeiro_titulo_baixa
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND financeiro_titulo_id = $1
          AND excluido = FALSE
        LIMIT 1
      `,
      [financeiroTituloId]
    );

    return rowCount > 0;
  }

  static async buscarPorId(client, financeiroTituloId) {
    const tituloResult = await client.query(
      `
        SELECT
          ft.financeiro_titulo_id,
          ft.pedido_venda_id,
          ft.pessoa_id,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj,
          ft.financeiro_condicao_pagamento_id,
          cp.descricao AS condicao_pagamento_descricao,
          ft.numero_documento,
          ft.descricao,
          ft.tipo,
          ft.status,
          ft.valor_original,
          ft.desconto,
          ft.acrescimo,
          ft.valor_final,
          ft.data_emissao,
          ft.data_vencimento,
          ft.observacao,
          COALESCE(fb.valor_baixado, 0) AS valor_baixado
        FROM financeiro_titulo ft
        JOIN pessoa p ON p.pessoa_id = ft.pessoa_id
        LEFT JOIN financeiro_condicao_pagamento cp
          ON cp.financeiro_condicao_pagamento_id = ft.financeiro_condicao_pagamento_id
        LEFT JOIN (
          SELECT
            financeiro_titulo_id,
            COALESCE(SUM(valor_baixa), 0) AS valor_baixado
          FROM financeiro_titulo_baixa
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND excluido = FALSE
          GROUP BY financeiro_titulo_id
        ) fb ON fb.financeiro_titulo_id = ft.financeiro_titulo_id
        WHERE ft.tenant_id = ${TENANT_CONTEXT_SQL}
          AND ft.excluido = FALSE
          AND ft.financeiro_titulo_id = $1
        LIMIT 1
      `,
      [financeiroTituloId]
    );

    const titulo = tituloResult.rows[0];
    if (!titulo) return null;

    const parcelasResult = await client.query(
      `
        SELECT
          financeiro_titulo_parcela_id,
          numero_parcela,
          valor_parcela,
          valor_recebido,
          data_vencimento,
          data_pagamento,
          status,
          observacao
        FROM financeiro_titulo_parcela
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND financeiro_titulo_id = $1
        ORDER BY numero_parcela
      `,
      [financeiroTituloId]
    );

    return {
      titulo: {
        ...titulo,
        valor_original: Number(titulo.valor_original || 0),
        desconto: Number(titulo.desconto || 0),
        acrescimo: Number(titulo.acrescimo || 0),
        valor_final: Number(titulo.valor_final || 0),
        valor_baixado: Number(titulo.valor_baixado || 0),
      },
      parcelas: parcelasResult.rows.map((parcela) => ({
        ...parcela,
        valor_parcela: Number(parcela.valor_parcela || 0),
        valor_recebido: Number(parcela.valor_recebido || 0),
      })),
    };
  }

  static normalizeManualPayload(payload = {}) {
    const tipo = String(payload.tipo || "receber").trim().toLowerCase();
    const pessoaId = parseInteger(payload.pessoa_id, { label: "Pessoa" });
    const condicaoPagamentoId = parseInteger(payload.financeiro_condicao_pagamento_id, {
      label: "Condicao de pagamento",
    });
    const descricao = normalizeText(payload.descricao, 180, {
      required: true,
      label: "Descricao",
    });
    const numeroDocumento = normalizeText(payload.numero_documento, 40, {
      label: "Numero do documento",
    });
    const dataEmissao = normalizeText(payload.data_emissao, 10, {
      required: true,
      label: "Data de emissao",
    });
    const observacao = normalizeText(payload.observacao, null);
    const valorOriginal = parseNumeric(payload.valor_original, {
      label: "Valor original",
    });
    const desconto = parseNumeric(payload.desconto, {
      defaultValue: 0,
      label: "Desconto",
    });
    const acrescimo = parseNumeric(payload.acrescimo, {
      defaultValue: 0,
      label: "Acrescimo",
    });

    if (!["receber", "pagar"].includes(tipo)) {
      throw new Error("Tipo do titulo invalido.");
    }

    if (valorOriginal <= 0) {
      throw new Error("Valor original invalido.");
    }

    const valorFinal = roundCurrency(valorOriginal - desconto + acrescimo);
    if (valorFinal <= 0) {
      throw new Error("O valor final do titulo precisa ser maior que zero.");
    }

    return {
      tipo,
      pessoa_id: pessoaId,
      financeiro_condicao_pagamento_id: condicaoPagamentoId,
      descricao,
      numero_documento: numeroDocumento,
      data_emissao: dataEmissao,
      observacao,
      valor_original: valorOriginal,
      desconto,
      acrescimo,
      valor_final: valorFinal,
    };
  }

  static async validarPessoa(client, pessoaId) {
    const { rowCount } = await client.query(
      `
        SELECT 1
        FROM pessoa p
        JOIN pessoa_tenant pt
          ON pt.pessoa_id = p.pessoa_id
         AND pt.tenant_id = ${TENANT_CONTEXT_SQL}
         AND pt.ativo = TRUE
        WHERE p.pessoa_id = $1
          AND p.pessoa_ativo = TRUE
          AND p.pessoa_excluido = FALSE
        LIMIT 1
      `,
      [pessoaId]
    );

    if (!rowCount) {
      throw new Error("Pessoa selecionada invalida para esta filial.");
    }
  }

  static async buscarCondicaoPagamento(client, condicaoPagamentoId, { tipo = "" } = {}) {
    const values = [condicaoPagamentoId];
    let where = `
      WHERE tenant_id = ${TENANT_CONTEXT_SQL}
        AND ativo = TRUE
        AND financeiro_condicao_pagamento_id = $1
    `;

    if (tipo) {
      values.push(tipo);
      where += ` AND (tipo = $${values.length} OR tipo = 'ambos')`;
    }

    const { rows } = await client.query(
      `
        SELECT
          financeiro_condicao_pagamento_id,
          descricao,
          tipo,
          quantidade_parcelas,
          dias_primeiro_vencimento,
          intervalo_dias,
          percentual_entrada
        FROM financeiro_condicao_pagamento
        ${where}
        LIMIT 1
      `,
      values
    );

    return rows[0]
      ? {
          ...rows[0],
          percentual_entrada: Number(rows[0].percentual_entrada || 0),
        }
      : null;
  }

  static gerarParcelas({ total, dataEmissao, condicao }) {
    const totalTitulo = roundCurrency(total);
    const percentualEntrada = Number(condicao.percentual_entrada || 0);
    const quantidadeParcelas = Number(condicao.quantidade_parcelas || 1);
    const diasPrimeiroVencimento = Number(condicao.dias_primeiro_vencimento || 0);
    const intervaloDias = Number(condicao.intervalo_dias || 30);
    const parcelas = [];

    let restante = totalTitulo;
    let numeroParcela = 1;

    if (percentualEntrada > 0) {
      const valorEntrada = roundCurrency((totalTitulo * percentualEntrada) / 100);
      restante = roundCurrency(restante - valorEntrada);

      parcelas.push({
        numero_parcela: numeroParcela,
        valor_parcela: valorEntrada,
        data_vencimento: dataEmissao,
        status: buildStatusParcela(dataEmissao),
      });

      numeroParcela += 1;
    }

    const qtdParcelasRestantes = Math.max(quantidadeParcelas, 1);
    let acumulado = 0;

    for (let index = 0; index < qtdParcelasRestantes; index += 1) {
      const isLast = index === qtdParcelasRestantes - 1;
      const valorBase = roundCurrency(restante / qtdParcelasRestantes);
      const valorParcela = isLast ? roundCurrency(restante - acumulado) : valorBase;

      acumulado = roundCurrency(acumulado + valorParcela);
      const daysOffset = diasPrimeiroVencimento + intervaloDias * index;
      const dataVencimento = addDays(dataEmissao, daysOffset);

      parcelas.push({
        numero_parcela: numeroParcela,
        valor_parcela: valorParcela,
        data_vencimento: dataVencimento,
        status: buildStatusParcela(dataVencimento),
      });

      numeroParcela += 1;
    }

    return parcelas;
  }

  static async inserirParcelasTitulo(client, financeiroTituloId, parcelas = []) {
    for (const parcela of parcelas) {
      await client.query(
        `
          INSERT INTO financeiro_titulo_parcela (
            tenant_id,
            financeiro_titulo_id,
            numero_parcela,
            valor_parcela,
            valor_recebido,
            data_vencimento,
            status,
            observacao
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            0,
            $4,
            $5,
            NULL
          )
        `,
        [
          financeiroTituloId,
          parcela.numero_parcela,
          parcela.valor_parcela,
          parcela.data_vencimento,
          parcela.status,
        ]
      );
    }
  }

  static async criarManual(client, { payload }) {
    const data = this.normalizeManualPayload(payload);
    const condicao = await this.buscarCondicaoPagamento(
      client,
      data.financeiro_condicao_pagamento_id,
      { tipo: data.tipo }
    );

    if (!condicao) {
      throw new Error("Condicao de pagamento invalida para o tipo informado.");
    }

    await this.validarPessoa(client, data.pessoa_id);

    const parcelas = this.gerarParcelas({
      total: data.valor_final,
      dataEmissao: data.data_emissao,
      condicao,
    });

    await client.query("BEGIN");

    try {
      const tituloResult = await client.query(
        `
          INSERT INTO financeiro_titulo (
            tenant_id,
            pedido_venda_id,
            pessoa_id,
            financeiro_condicao_pagamento_id,
            numero_documento,
            descricao,
            tipo,
            status,
            valor_original,
            desconto,
            acrescimo,
            data_emissao,
            data_vencimento,
            observacao,
            excluido
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            NULL,
            $1,
            $2,
            $3,
            $4,
            $5,
            'aberto',
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            FALSE
          )
          RETURNING financeiro_titulo_id
        `,
        [
          data.pessoa_id,
          data.financeiro_condicao_pagamento_id,
          data.numero_documento,
          data.descricao,
          data.tipo,
          data.valor_original,
          data.desconto,
          data.acrescimo,
          data.data_emissao,
          parcelas[0]?.data_vencimento || data.data_emissao,
          data.observacao,
        ]
      );

      const financeiroTituloId = Number(tituloResult.rows[0].financeiro_titulo_id);

      await this.inserirParcelasTitulo(client, financeiroTituloId, parcelas);

      await client.query("COMMIT");

      return {
        financeiro_titulo_id: financeiroTituloId,
        parcelas,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async atualizarManual(client, { financeiroTituloId, payload }) {
    const existing = await this.buscarPorId(client, financeiroTituloId);
    if (!existing) {
      throw new Error("Titulo financeiro nao encontrado.");
    }

    if (existing.titulo?.pedido_venda_id) {
      throw new Error("Titulos gerados por pedido de venda devem ser alterados pela tela de vendas.");
    }

    const possuiBaixas = await this.verificarTituloComBaixas(client, financeiroTituloId);
    if (possuiBaixas) {
      throw new Error("Este titulo possui baixas financeiras e nao pode mais ser alterado.");
    }

    const data = this.normalizeManualPayload(payload);
    const condicao = await this.buscarCondicaoPagamento(
      client,
      data.financeiro_condicao_pagamento_id,
      { tipo: data.tipo }
    );

    if (!condicao) {
      throw new Error("Condicao de pagamento invalida para o tipo informado.");
    }

    await this.validarPessoa(client, data.pessoa_id);

    const parcelas = this.gerarParcelas({
      total: data.valor_final,
      dataEmissao: data.data_emissao,
      condicao,
    });

    await client.query("BEGIN");

    try {
      await client.query(
        `
          UPDATE financeiro_titulo
          SET
            pessoa_id = $2,
            financeiro_condicao_pagamento_id = $3,
            numero_documento = $4,
            descricao = $5,
            tipo = $6,
            status = 'aberto',
            valor_original = $7,
            desconto = $8,
            acrescimo = $9,
            data_emissao = $10,
            data_vencimento = $11,
            observacao = $12
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND financeiro_titulo_id = $1
            AND excluido = FALSE
        `,
        [
          financeiroTituloId,
          data.pessoa_id,
          data.financeiro_condicao_pagamento_id,
          data.numero_documento,
          data.descricao,
          data.tipo,
          data.valor_original,
          data.desconto,
          data.acrescimo,
          data.data_emissao,
          parcelas[0]?.data_vencimento || data.data_emissao,
          data.observacao,
        ]
      );

      await client.query(
        `
          DELETE FROM financeiro_titulo_parcela
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND financeiro_titulo_id = $1
        `,
        [financeiroTituloId]
      );

      await this.inserirParcelasTitulo(client, financeiroTituloId, parcelas);

      await client.query("COMMIT");
      return this.buscarPorId(client, financeiroTituloId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export default FinanceiroDAO;
