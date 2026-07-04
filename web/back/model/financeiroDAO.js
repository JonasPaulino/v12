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
      throw new Error(`${label} obrigatório não informado.`);
    }

    return null;
  }

  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const parseInteger = (value, { allowNull = false, min = 1, label = "Campo" } = {}) => {
  if (value === undefined || value === null || value === "") {
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
  { defaultValue = null, allowNull = false, label = "Campo" } = {}
) => {
  if (value === undefined || value === null || value === "") {
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

const roundCurrency = (value) => Number((Number(value || 0)).toFixed(2));

const normalizeDateValue = (value) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const normalized = String(value).trim();
  if (!normalized) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
    const [day, month, year] = normalized.split("/");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return normalized.slice(0, 10);
};

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
  static async listarFormasPagamento(client, { tipo = "receber" } = {}) {
    const values = [];
    let where = `
      WHERE tenant_id = ${TENANT_CONTEXT_SQL}
        AND ativo = TRUE
        AND LOWER(unaccent(descricao)) NOT LIKE '%boleto%'
    `;

    if (tipo) {
      values.push(tipo);
      where += ` AND (tipo = $${values.length} OR tipo = 'ambos')`;
    }

    const { rows } = await client.query(
      `
        SELECT
          financeiro_forma_pagamento_id,
          descricao,
          tipo,
          padrao,
          ordem
        FROM financeiro_forma_pagamento
        ${where}
        ORDER BY padrao DESC, ordem ASC, descricao ASC
      `,
      values
    );

    return rows;
  }

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
          gera_boleto,
          padrao
        FROM financeiro_condicao_pagamento
        ${where}
        ORDER BY padrao DESC, descricao
      `,
      values
    );

    return rows.map((row) => ({
      ...row,
      gera_boleto: !!row.gera_boleto,
      percentual_entrada: Number(row.percentual_entrada || 0),
    }));
  }

  static async obterSupportData(client, { tipo = "receber" } = {}) {
    const condicoesPagamento = await this.listarCondicoesPagamento(client, { tipo });
    const formasPagamento = await this.listarFormasPagamento(client, { tipo });

    return {
      condicoesPagamento,
      condicaoPagamentoPadrao:
        condicoesPagamento.find((item) => item.padrao) || condicoesPagamento[0] || null,
      formasPagamento,
      formaPagamentoPadrao:
        formasPagamento.find((item) => item.padrao) || formasPagamento[0] || null,
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

    const listResult = await client.query(listSql, [...values, safeLimit, offset]);
    const countResult = await client.query(countSql, values);
    const resumoResult = await client.query(resumoSql, values);

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

    const baixasResult = await client.query(
      `
        SELECT
          fb.financeiro_titulo_baixa_id,
          fb.financeiro_titulo_parcela_id,
          ftp.numero_parcela,
          fb.financeiro_forma_pagamento_id,
          fp.descricao AS forma_pagamento_descricao,
          fb.valor_baixa,
          fb.data_baixa,
          fb.criado_em,
          fb.estornado_em,
          fb.excluido,
          fb.usuario_baixa_id,
          ub.usuario_nome AS usuario_baixa_nome,
          fb.usuario_estorno_id,
          ue.usuario_nome AS usuario_estorno_nome,
          fb.observacao
        FROM financeiro_titulo_baixa fb
        LEFT JOIN financeiro_titulo_parcela ftp
          ON ftp.financeiro_titulo_parcela_id = fb.financeiro_titulo_parcela_id
         AND ftp.tenant_id = fb.tenant_id
        LEFT JOIN financeiro_forma_pagamento fp
          ON fp.financeiro_forma_pagamento_id = fb.financeiro_forma_pagamento_id
         AND fp.tenant_id = fb.tenant_id
        LEFT JOIN usuario ub
          ON ub.usuario_id = fb.usuario_baixa_id
        LEFT JOIN usuario ue
          ON ue.usuario_id = fb.usuario_estorno_id
        WHERE fb.tenant_id = ${TENANT_CONTEXT_SQL}
          AND fb.financeiro_titulo_id = $1
        ORDER BY COALESCE(fb.data_baixa, fb.criado_em) DESC, fb.financeiro_titulo_baixa_id DESC
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
        data_emissao: normalizeDateValue(titulo.data_emissao),
        data_vencimento: normalizeDateValue(titulo.data_vencimento),
        saldo: roundCurrency(Number(titulo.valor_final || 0) - Number(titulo.valor_baixado || 0)),
      },
      parcelas: parcelasResult.rows.map((parcela) => ({
        ...parcela,
        valor_parcela: Number(parcela.valor_parcela || 0),
        valor_recebido: Number(parcela.valor_recebido || 0),
        data_vencimento: normalizeDateValue(parcela.data_vencimento),
        data_pagamento: normalizeDateValue(parcela.data_pagamento),
        saldo: roundCurrency(
          Number(parcela.valor_parcela || 0) - Number(parcela.valor_recebido || 0)
        ),
      })),
      baixas: baixasResult.rows.map((baixa) => ({
        ...baixa,
        excluido: !!baixa.excluido,
        numero_parcela:
          baixa.numero_parcela !== null && baixa.numero_parcela !== undefined
            ? Number(baixa.numero_parcela)
            : null,
        valor_baixa: Number(baixa.valor_baixa || 0),
      })),
    };
  }

  static async buscarFormaPagamento(client, financeiroFormaPagamentoId, { tipo = "" } = {}) {
    const values = [financeiroFormaPagamentoId];
    let where = `
      WHERE tenant_id = ${TENANT_CONTEXT_SQL}
        AND ativo = TRUE
        AND financeiro_forma_pagamento_id = $1
    `;

    if (tipo) {
      values.push(tipo);
      where += ` AND (tipo = $${values.length} OR tipo = 'ambos')`;
    }

    const { rows } = await client.query(
      `
        SELECT
          financeiro_forma_pagamento_id,
          descricao,
          tipo
        FROM financeiro_forma_pagamento
        ${where}
        LIMIT 1
      `,
      values
    );

    return rows[0] || null;
  }

  static async prepararCobrancaPix(client, { financeiroTituloId, payload = {} } = {}) {
    return this.prepararCobrancaGateway(client, {
      financeiroTituloId,
      payload,
      billingType: "PIX",
    });
  }

  static async prepararCobrancaBoleto(client, { financeiroTituloId, payload = {} } = {}) {
    return this.prepararCobrancaGateway(client, {
      financeiroTituloId,
      payload,
      billingType: "BOLETO",
    });
  }

  static async prepararCobrancaGateway(
    client,
    { financeiroTituloId, payload = {}, billingType = "PIX" } = {}
  ) {
    const detail = await this.buscarPorId(client, financeiroTituloId);

    if (!detail?.titulo) {
      throw new Error("Título financeiro não encontrado.");
    }

    if (detail.titulo.tipo !== "receber") {
      throw new Error("A cobrança só pode ser gerada para contas a receber.");
    }

    const tituloStatus = String(detail.titulo.status || "").toLowerCase();
    if (["quitado", "cancelado"].includes(tituloStatus)) {
      throw new Error("Este título não pode gerar cobrança no status atual.");
    }

    const formaPagamentoId = parseInteger(payload.financeiro_forma_pagamento_id, {
      allowNull: true,
      label: "Forma de pagamento",
    });
    const formaPagamento = formaPagamentoId
      ? await this.buscarFormaPagamento(client, formaPagamentoId, {
          tipo: "receber",
        })
      : null;

    if (billingType === "PIX" && !formaPagamento) {
      throw new Error("Forma de pagamento inválida para cobrança.");
    }

    if (billingType === "PIX" && !/pix/i.test(String(formaPagamento.descricao || ""))) {
      throw new Error("Selecione uma forma de pagamento PIX para gerar o QR Code.");
    }

    if (
      billingType === "BOLETO" &&
      formaPagamento &&
      !/boleto/i.test(String(formaPagamento.descricao || ""))
    ) {
      throw new Error("Selecione uma forma de pagamento boleto para gerar a cobrança.");
    }

    const parcelasDisponiveis = (detail.parcelas || []).filter(
      (item) => item.status !== "cancelada" && Number(item.saldo || 0) > 0
    );

    let parcelaSelecionada = null;

    if (payload.financeiro_titulo_parcela_id) {
      parcelaSelecionada =
        parcelasDisponiveis.find(
          (item) =>
            Number(item.financeiro_titulo_parcela_id) ===
            Number(payload.financeiro_titulo_parcela_id)
        ) || null;

      if (!parcelaSelecionada) {
        throw new Error("Parcela inválida para gerar a cobrança.");
      }
    } else if (parcelasDisponiveis.length === 1) {
      parcelaSelecionada = parcelasDisponiveis[0];
    } else if (parcelasDisponiveis.length > 1) {
      throw new Error("Selecione a parcela que receberá a cobrança.");
    }

    const saldoBase = roundCurrency(
      parcelaSelecionada ? parcelaSelecionada.saldo : detail.titulo.saldo
    );

    if (saldoBase <= 0) {
      throw new Error("O título não possui saldo disponível para gerar cobrança.");
    }

    const valorCobranca = payload.valor_cobranca
      ? roundCurrency(
          parseNumeric(payload.valor_cobranca, {
            label: billingType === "PIX" ? "Valor da cobrança PIX" : "Valor do boleto",
          })
        )
      : saldoBase;

    if (valorCobranca <= 0) {
      throw new Error("O valor da cobrança precisa ser maior que zero.");
    }

    if (valorCobranca > saldoBase) {
      throw new Error("O valor da cobrança não pode ser maior que o saldo selecionado.");
    }

    const pessoaResult = await client.query(
      `
        SELECT
          pessoa_id,
          pessoa_nome_razao,
          pessoa_cpf_cnpj,
          pessoa_email,
          pessoa_telefone,
          pessoa_whatsapp
        FROM pessoa
        WHERE pessoa_id = $1
        LIMIT 1
      `,
      [detail.titulo.pessoa_id]
    );

    const pessoa = pessoaResult.rows[0];
    if (!pessoa) {
      throw new Error("Pessoa vinculada ao título não encontrada.");
    }

    return {
      titulo: {
        financeiro_titulo_id: Number(detail.titulo.financeiro_titulo_id),
        descricao:
          detail.titulo.descricao ||
          `Título financeiro #${detail.titulo.financeiro_titulo_id}`,
        data_vencimento:
          parcelaSelecionada?.data_vencimento || detail.titulo.data_vencimento,
      },
      parcela: parcelaSelecionada
        ? {
            financeiro_titulo_parcela_id: Number(
              parcelaSelecionada.financeiro_titulo_parcela_id
            ),
            numero_parcela: Number(parcelaSelecionada.numero_parcela),
            data_vencimento: parcelaSelecionada.data_vencimento,
            saldo: Number(parcelaSelecionada.saldo || 0),
          }
        : null,
      pessoa: {
        pessoa_id: Number(pessoa.pessoa_id),
        pessoa_nome_razao: pessoa.pessoa_nome_razao,
        pessoa_cpf_cnpj: pessoa.pessoa_cpf_cnpj,
        pessoa_email: pessoa.pessoa_email || "",
        pessoa_telefone: pessoa.pessoa_telefone || "",
        pessoa_whatsapp: pessoa.pessoa_whatsapp || "",
      },
      forma_pagamento: {
        financeiro_forma_pagamento_id: Number(
          formaPagamento.financeiro_forma_pagamento_id
        ),
        descricao: formaPagamento.descricao,
      },
      cobranca: {
        valor: valorCobranca,
        data_vencimento:
          parcelaSelecionada?.data_vencimento || detail.titulo.data_vencimento,
        descricao:
          normalizeText(payload.observacao, 500) ||
          detail.titulo.descricao ||
          `Cobrança do título financeiro #${detail.titulo.financeiro_titulo_id}`,
      },
    };
  }

  static async buscarParcelaDoTitulo(client, { financeiroTituloId, financeiroTituloParcelaId }) {
    const { rows } = await client.query(
      `
        SELECT
          financeiro_titulo_parcela_id,
          financeiro_titulo_id,
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
          AND financeiro_titulo_parcela_id = $2
        LIMIT 1
      `,
      [financeiroTituloId, financeiroTituloParcelaId]
    );

    return rows[0]
      ? {
          ...rows[0],
          valor_parcela: Number(rows[0].valor_parcela || 0),
          valor_recebido: Number(rows[0].valor_recebido || 0),
        }
      : null;
  }

  static async criarParcelaUnicaDoTitulo(client, existing) {
    const titulo = existing?.titulo || null;
    if (!titulo) {
      throw new Error("Título financeiro não encontrado.");
    }

    const saldoTitulo = roundCurrency(titulo.saldo ?? titulo.valor_final);
    if (saldoTitulo <= 0) {
      throw new Error("O título não possui saldo disponível para baixa.");
    }

    const dataVencimento = String(titulo.data_vencimento || titulo.data_emissao || "")
      .trim()
      .slice(0, 10);
    const status = buildStatusParcela(dataVencimento);

    const { rows } = await client.query(
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
          1,
          $2,
          0,
          $3,
          $4,
          NULL
        )
        RETURNING
          financeiro_titulo_parcela_id,
          financeiro_titulo_id,
          numero_parcela,
          valor_parcela,
          valor_recebido,
          data_vencimento,
          data_pagamento,
          status,
          observacao
      `,
      [titulo.financeiro_titulo_id, saldoTitulo, dataVencimento, status]
    );

    return rows[0]
      ? {
          ...rows[0],
          valor_parcela: Number(rows[0].valor_parcela || 0),
          valor_recebido: Number(rows[0].valor_recebido || 0),
        }
      : null;
  }

  static async recalcularParcela(client, financeiroTituloParcelaId) {
    const { rows } = await client.query(
      `
        SELECT
          ftp.financeiro_titulo_parcela_id,
          ftp.valor_parcela,
          ftp.data_vencimento,
          COALESCE(SUM(CASE WHEN fb.excluido = FALSE THEN fb.valor_baixa ELSE 0 END), 0) AS valor_recebido,
          MAX(CASE WHEN fb.excluido = FALSE THEN fb.data_baixa::date ELSE NULL END) AS ultima_data_baixa
        FROM financeiro_titulo_parcela ftp
        LEFT JOIN financeiro_titulo_baixa fb
          ON fb.financeiro_titulo_parcela_id = ftp.financeiro_titulo_parcela_id
         AND fb.tenant_id = ftp.tenant_id
        WHERE ftp.tenant_id = ${TENANT_CONTEXT_SQL}
          AND ftp.financeiro_titulo_parcela_id = $1
        GROUP BY ftp.financeiro_titulo_parcela_id, ftp.valor_parcela, ftp.data_vencimento
        LIMIT 1
      `,
      [financeiroTituloParcelaId]
    );

    const parcela = rows[0];
    if (!parcela) return null;

    const valorParcela = Number(parcela.valor_parcela || 0);
    const valorRecebido = roundCurrency(Number(parcela.valor_recebido || 0));
    const saldo = roundCurrency(valorParcela - valorRecebido);
    const today = new Date().toISOString().slice(0, 10);
    let status = "aberta";
    let dataPagamento = null;

    if (saldo <= 0 && valorRecebido > 0) {
      status = "quitada";
      dataPagamento = parcela.ultima_data_baixa || null;
    } else if (valorRecebido > 0) {
      status = "parcial";
    } else if (String(parcela.data_vencimento || "") < today) {
      status = "vencida";
    }

    await client.query(
      `
        UPDATE financeiro_titulo_parcela
        SET
          valor_recebido = $2,
          data_pagamento = $3,
          status = $4,
          atualizado_em = NOW()
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND financeiro_titulo_parcela_id = $1
      `,
      [financeiroTituloParcelaId, Math.max(valorRecebido, 0), dataPagamento, status]
    );

    return {
      valorRecebido,
      saldo,
      status,
      dataPagamento,
    };
  }

  static async recalcularTitulo(client, financeiroTituloId) {
    const { rows } = await client.query(
      `
        SELECT
          ft.financeiro_titulo_id,
          COUNT(*) FILTER (WHERE ftp.status <> 'cancelada')::int AS total_ativas,
          COUNT(*) FILTER (WHERE ftp.status = 'quitada')::int AS quitadas,
          COUNT(*) FILTER (WHERE ftp.status = 'parcial')::int AS parciais,
          COUNT(*) FILTER (WHERE ftp.status = 'vencida')::int AS vencidas,
          COALESCE(SUM(ftp.valor_recebido), 0) AS valor_recebido_total
        FROM financeiro_titulo ft
        LEFT JOIN financeiro_titulo_parcela ftp
          ON ftp.financeiro_titulo_id = ft.financeiro_titulo_id
         AND ftp.tenant_id = ft.tenant_id
        WHERE ft.tenant_id = ${TENANT_CONTEXT_SQL}
          AND ft.financeiro_titulo_id = $1
        GROUP BY ft.financeiro_titulo_id
        LIMIT 1
      `,
      [financeiroTituloId]
    );

    const resumo = rows[0];
    if (!resumo) return null;

    const totalAtivas = Number(resumo.total_ativas || 0);
    const quitadas = Number(resumo.quitadas || 0);
    const parciais = Number(resumo.parciais || 0);
    const vencidas = Number(resumo.vencidas || 0);
    const valorRecebidoTotal = Number(resumo.valor_recebido_total || 0);
    let status = "aberto";

    if (totalAtivas > 0 && quitadas === totalAtivas) {
      status = "quitado";
    } else if (parciais > 0 || valorRecebidoTotal > 0) {
      status = "parcial";
    } else if (vencidas > 0) {
      status = "vencido";
    }

    await client.query(
      `
        UPDATE financeiro_titulo
        SET
          status = $2,
          atualizado_em = NOW()
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND financeiro_titulo_id = $1
          AND excluido = FALSE
      `,
      [financeiroTituloId, status]
    );

    return status;
  }

  static normalizeManualPayload(payload = {}) {
    const tipo = String(payload.tipo || "receber").trim().toLowerCase();
    const pessoaId = parseInteger(payload.pessoa_id, { label: "Pessoa" });
    const condicaoPagamentoId = parseInteger(payload.financeiro_condicao_pagamento_id, {
      label: "Condição de pagamento",
    });
    const descricao = normalizeText(payload.descricao, 180, {
      required: true,
      label: "Descrição",
    });
    const numeroDocumento = normalizeText(payload.numero_documento, 40, {
      label: "Número do documento",
    });
    const dataEmissao = normalizeText(payload.data_emissao, 10, {
      required: true,
      label: "Data de emissão",
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
      label: "Acréscimo",
    });

    if (!["receber", "pagar"].includes(tipo)) {
      throw new Error("Tipo do título inválido.");
    }

    if (valorOriginal <= 0) {
      throw new Error("Valor original inválido.");
    }

    const valorFinal = roundCurrency(valorOriginal - desconto + acrescimo);
    if (valorFinal <= 0) {
      throw new Error("O valor final do título precisa ser maior que zero.");
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
      throw new Error("Pessoa selecionada inválida para esta filial.");
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
      throw new Error("Condição de pagamento inválida para o tipo informado.");
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
      throw new Error("Título financeiro não encontrado.");
    }

    if (existing.titulo?.pedido_venda_id) {
      throw new Error("Títulos gerados por pedido de venda devem ser alterados pela tela de vendas.");
    }

    const possuiBaixas = await this.verificarTituloComBaixas(client, financeiroTituloId);
    if (possuiBaixas) {
      throw new Error("Este título possui baixas financeiras e não pode mais ser alterado.");
    }

    const data = this.normalizeManualPayload(payload);
    const condicao = await this.buscarCondicaoPagamento(
      client,
      data.financeiro_condicao_pagamento_id,
      { tipo: data.tipo }
    );

    if (!condicao) {
      throw new Error("Condição de pagamento inválida para o tipo informado.");
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

  static async registrarBaixa(client, { financeiroTituloId, payload = {}, actorUserId = null }) {
    const existing = await this.buscarPorId(client, financeiroTituloId);
    if (!existing) {
      throw new Error("Título financeiro não encontrado.");
    }

    if (existing.titulo?.status === "cancelado") {
      throw new Error("Título cancelado não pode receber novas baixas.");
    }

    let parcelaId = parseInteger(payload.financeiro_titulo_parcela_id, {
      allowNull: true,
      label: "Parcela",
    });
    const formaPagamentoId = parseInteger(payload.financeiro_forma_pagamento_id, {
      allowNull: true,
      label: "Forma de pagamento",
    });
    const dataBaixa = normalizeText(payload.data_baixa, 10, {
      required: true,
      label: "Data da baixa",
    });
    const valorBaixa = parseNumeric(payload.valor_baixa, {
      label: "Valor da baixa",
    });
    const observacao = normalizeText(payload.observacao, null);

    if (valorBaixa <= 0) {
      throw new Error("O valor da baixa precisa ser maior que zero.");
    }

    let parcela = null;

    if (parcelaId) {
      parcela = await this.buscarParcelaDoTitulo(client, {
        financeiroTituloId,
        financeiroTituloParcelaId: parcelaId,
      });
    } else {
      const parcelasDisponiveis = (existing.parcelas || []).filter(
        (item) => item.status !== "cancelada" && Number(item.saldo || 0) > 0
      );

      if (!existing.parcelas?.length) {
        parcela = await this.criarParcelaUnicaDoTitulo(client, existing);
      } else if (parcelasDisponiveis.length === 1) {
        parcela = parcelasDisponiveis[0];
      } else if (parcelasDisponiveis.length > 1) {
        throw new Error("Selecione a parcela que será baixada.");
      } else {
        throw new Error("Não há parcela disponível para registrar esta baixa.");
      }
    }

    if (!parcela) {
      throw new Error("Parcela inválida para este título.");
    }

    parcelaId = Number(parcela.financeiro_titulo_parcela_id);

    if (parcela.status === "cancelada") {
      throw new Error("Parcela cancelada não pode receber baixa.");
    }

    const saldoParcela = roundCurrency(parcela.valor_parcela - parcela.valor_recebido);
    if (saldoParcela <= 0) {
      throw new Error("A parcela selecionada já está quitada.");
    }

    if (valorBaixa > saldoParcela) {
      throw new Error("O valor informado é maior que o saldo da parcela.");
    }

    let formaPagamento = null;

    if (formaPagamentoId) {
      formaPagamento = await this.buscarFormaPagamento(client, formaPagamentoId, {
        tipo: existing.titulo.tipo,
      });

      if (!formaPagamento) {
        throw new Error("Forma de pagamento inválida para o tipo do título.");
      }
    } else if (actorUserId !== null) {
      throw new Error("Forma de pagamento obrigatória.");
    }

    await client.query("BEGIN");

    try {
      const lockedParcelaResult = await client.query(
        `
          SELECT
            valor_parcela,
            valor_recebido,
            status
          FROM financeiro_titulo_parcela
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND financeiro_titulo_id = $1
            AND financeiro_titulo_parcela_id = $2
          FOR UPDATE
        `,
        [financeiroTituloId, parcelaId]
      );
      const lockedParcela = lockedParcelaResult.rows[0];

      if (!lockedParcela) {
        throw new Error("Parcela inválida para este título.");
      }

      if (lockedParcela.status === "cancelada") {
        throw new Error("Parcela cancelada não pode receber baixa.");
      }

      const saldoAtualParcela = roundCurrency(
        Number(lockedParcela.valor_parcela || 0) - Number(lockedParcela.valor_recebido || 0)
      );

      if (saldoAtualParcela <= 0) {
        throw new Error("A parcela selecionada já está quitada.");
      }

      if (valorBaixa > saldoAtualParcela) {
        throw new Error("O valor informado é maior que o saldo da parcela.");
      }

      await client.query(
        `
          INSERT INTO financeiro_titulo_baixa (
            tenant_id,
            financeiro_titulo_id,
            financeiro_titulo_parcela_id,
            financeiro_forma_pagamento_id,
            usuario_baixa_id,
            valor_baixa,
            data_baixa,
            observacao,
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
            FALSE
          )
        `,
        [
          financeiroTituloId,
          parcelaId,
          formaPagamentoId,
          actorUserId,
          valorBaixa,
          dataBaixa,
          observacao,
        ]
      );

      await this.recalcularParcela(client, parcelaId);
      await this.recalcularTitulo(client, financeiroTituloId);

      await client.query("COMMIT");
      return this.buscarPorId(client, financeiroTituloId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async estornarBaixa(client, { financeiroTituloBaixaId, actorUserId = null }) {
    const { rows } = await client.query(
      `
        SELECT
          financeiro_titulo_baixa_id,
          financeiro_titulo_id,
          financeiro_titulo_parcela_id,
          excluido
        FROM financeiro_titulo_baixa
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND financeiro_titulo_baixa_id = $1
        LIMIT 1
      `,
      [financeiroTituloBaixaId]
    );

    const baixa = rows[0];
    if (!baixa) {
      throw new Error("Baixa financeira não encontrada.");
    }

    if (baixa.excluido) {
      throw new Error("Esta baixa já foi estornada.");
    }

    await client.query("BEGIN");

    try {
      await client.query(
        `
          UPDATE financeiro_titulo_baixa
          SET
            excluido = TRUE,
            usuario_estorno_id = $2,
            estornado_em = NOW(),
            atualizado_em = NOW()
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND financeiro_titulo_baixa_id = $1
        `,
        [financeiroTituloBaixaId, actorUserId]
      );

      if (baixa.financeiro_titulo_parcela_id) {
        await this.recalcularParcela(client, Number(baixa.financeiro_titulo_parcela_id));
      }
      await this.recalcularTitulo(client, Number(baixa.financeiro_titulo_id));

      await client.query("COMMIT");
      return this.buscarPorId(client, Number(baixa.financeiro_titulo_id));
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async cancelarTitulo(client, { financeiroTituloId }) {
    const existing = await this.buscarPorId(client, financeiroTituloId);
    if (!existing) {
      throw new Error("Título financeiro não encontrado.");
    }

    if (existing.baixas?.length) {
      throw new Error("Títulos com baixa registrada não podem ser cancelados.");
    }

    if (existing.titulo?.status === "cancelado") {
      throw new Error("Este título já está cancelado.");
    }

    await client.query("BEGIN");

    try {
      await client.query(
        `
          UPDATE financeiro_titulo
          SET
            status = 'cancelado',
            excluido = TRUE,
            atualizado_em = NOW()
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND financeiro_titulo_id = $1
        `,
        [financeiroTituloId]
      );

      await client.query(
        `
          UPDATE financeiro_titulo_parcela
          SET
            status = 'cancelada',
            atualizado_em = NOW()
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND financeiro_titulo_id = $1
        `,
        [financeiroTituloId]
      );

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export default FinanceiroDAO;
