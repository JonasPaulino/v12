import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

const SORT_COLUMNS = {
  pedido_compra_id: "pc.pedido_compra_id",
  data_emissao: "pc.data_emissao",
  pessoa_nome_razao: "p.pessoa_nome_razao",
  total: "pc.total",
  status: "pc.status",
  financeiro_status: "ft.status",
};

const normalizeText = (value, maxLength, { required = false, label = "Campo" } = {}) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    if (required) throw new Error(`${label} obrigatório.`);
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

const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));

const normalizeDateValue = (value) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const normalized = String(value).trim();
  if (!normalized) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

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

const buildOrderBy = (sort = {}) => {
  const entries = Object.entries(sort || {})
    .map(([column, direction]) => {
      if (!SORT_COLUMNS[column]) return null;
      const safeDirection = String(direction).toUpperCase() === "DESC" ? "DESC" : "ASC";
      return `${SORT_COLUMNS[column]} ${safeDirection}`;
    })
    .filter(Boolean);

  return entries.length ? entries.join(", ") : "pc.pedido_compra_id DESC";
};

const buildStatusParcela = (dataVencimento) => {
  const today = new Date().toISOString().slice(0, 10);
  return dataVencimento < today ? "vencida" : "aberta";
};

class CompraDAO {
  static async listar(client, { page = 1, limit = 20, search = "", sort = {} }) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const values = [];
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE pc.tenant_id = ${TENANT_CONTEXT_SQL}
        AND pc.excluido = FALSE
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          CAST(pc.pedido_compra_id AS TEXT) LIKE $${values.length}
          OR LOWER(p.pessoa_nome_razao) LIKE LOWER($${values.length})
          OR LOWER(COALESCE(p.pessoa_cpf_cnpj, '')) LIKE LOWER($${values.length})
        )
      `;
    }

    const orderBy = buildOrderBy(sort);

    const listSql = `
      SELECT
        pc.pedido_compra_id,
        pc.data_emissao,
        pc.data_previsao,
        pc.status,
        pc.total,
        pc.subtotal,
        pc.desconto,
        pc.acrescimo,
        p.pessoa_id,
        p.pessoa_nome_razao,
        p.pessoa_cpf_cnpj,
        cp.descricao AS condicao_pagamento_descricao,
        ft.financeiro_titulo_id,
        ft.status AS financeiro_status,
        ft.data_vencimento AS financeiro_data_vencimento
      FROM pedido_compra pc
      JOIN pessoa p ON p.pessoa_id = pc.pessoa_id
      LEFT JOIN financeiro_condicao_pagamento cp
        ON cp.financeiro_condicao_pagamento_id = pc.financeiro_condicao_pagamento_id
      LEFT JOIN financeiro_titulo ft
        ON ft.pedido_compra_id = pc.pedido_compra_id
       AND ft.tenant_id = pc.tenant_id
       AND ft.excluido = FALSE
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM pedido_compra pc
      JOIN pessoa p ON p.pessoa_id = pc.pessoa_id
      ${where}
    `;

    const [listResult, countResult] = await Promise.all([
      client.query(listSql, [...values, safeLimit, offset]),
      client.query(countSql, values),
    ]);

    const total = countResult.rows[0]?.total || 0;

    return {
      data: listResult.rows,
      page: safePage,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  static async listarFornecedoresSelect(client, { search = "", limit = 20 } = {}) {
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

  static async listarProdutosSelect(client, { search = "", limit = 20 } = {}) {
    const values = [];
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 50) : 20;
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE p.tenant_id = ${TENANT_CONTEXT_SQL}
        AND p.ativo = TRUE
        AND p.excluido = FALSE
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          LOWER(COALESCE(p.codigo_interno, p.produto_id::text)) LIKE LOWER($${values.length})
          OR LOWER(unaccent(p.descricao)) LIKE LOWER(unaccent($${values.length}))
        )
      `;
    }

    values.push(safeLimit);

    const { rows } = await client.query(
      `
        SELECT
          p.produto_id,
          COALESCE(NULLIF(p.codigo_interno, ''), p.produto_id::varchar(60)) AS codigo_interno,
          p.descricao,
          COALESCE(um.sigla, '') AS unidade_sigla,
          COALESCE(pp.preco_custo, 0)::numeric AS preco_compra
        FROM produto p
        LEFT JOIN produto_unidade pu ON pu.produto_id = p.produto_id
        LEFT JOIN unidade_medida um ON um.unidade_medida_id = pu.unidade_comercial_id
        LEFT JOIN tabela_preco tp
          ON tp.tenant_id = p.tenant_id
         AND tp.padrao = TRUE
         AND tp.excluido = FALSE
        LEFT JOIN produto_preco pp
          ON pp.produto_id = p.produto_id
         AND pp.tabela_preco_id = tp.tabela_preco_id
         AND pp.ativo = TRUE
         AND (pp.data_fim IS NULL OR pp.data_fim >= CURRENT_DATE)
        ${where}
        ORDER BY p.descricao
        LIMIT $${values.length}
      `,
      values
    );

    return rows.map((row) => ({
      ...row,
      preco_compra: Number(row.preco_compra || 0),
    }));
  }

  static async listarCondicoesPagamento(client) {
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
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND ativo = TRUE
          AND (tipo = 'pagar' OR tipo = 'ambos')
        ORDER BY padrao DESC, descricao
      `
    );

    return rows.map((row) => ({
      ...row,
      percentual_entrada: Number(row.percentual_entrada || 0),
    }));
  }

  static async obterSupportData(client) {
    const condicoesPagamento = await this.listarCondicoesPagamento(client);

    return {
      condicoesPagamento,
      condicaoPagamentoPadrao:
        condicoesPagamento.find((item) => item.padrao) || condicoesPagamento[0] || null,
    };
  }

  static normalizeItem(item = {}, index = 0) {
    const produtoId = parseInteger(item.produto_id, {
      label: `Produto do item ${index + 1}`,
    });
    const quantidade = parseNumeric(item.quantidade, {
      defaultValue: 0,
      label: `Quantidade do item ${index + 1}`,
    });
    const valorUnitario = parseNumeric(item.valor_unitario, {
      defaultValue: 0,
      label: `Valor unitário do item ${index + 1}`,
    });
    const desconto = parseNumeric(item.desconto, {
      defaultValue: 0,
      label: `Desconto do item ${index + 1}`,
    });
    const acrescimo = parseNumeric(item.acrescimo, {
      defaultValue: 0,
      label: `Acréscimo do item ${index + 1}`,
    });

    if (quantidade <= 0) {
      throw new Error(`Quantidade inválida no item ${index + 1}.`);
    }

    if (valorUnitario < 0) {
      throw new Error(`Valor unitário inválido no item ${index + 1}.`);
    }

    return {
      produto_id: produtoId,
      quantidade,
      valor_unitario: valorUnitario,
      desconto,
      acrescimo,
      valor_total: roundCurrency(quantidade * valorUnitario - desconto + acrescimo),
    };
  }

  static normalizePayload(payload = {}) {
    const pessoaId = parseInteger(payload.pessoa_id, {
      label: "Fornecedor",
    });
    const condicaoPagamentoId = parseInteger(payload.financeiro_condicao_pagamento_id, {
      label: "Condição de pagamento",
    });
    const status = normalizeText(payload.status, 20, { label: "Status do pedido" }) || "aberto";
    const dataEmissao = normalizeDateValue(payload.data_emissao);
    const dataPrimeiroVencimento = normalizeDateValue(payload.data_primeiro_vencimento);
    const dataPrevisao = normalizeDateValue(payload.data_previsao);
    const observacao = normalizeText(payload.observacao, null);
    const desconto = parseNumeric(payload.desconto, {
      defaultValue: 0,
      label: "Desconto do pedido",
    });
    const acrescimo = parseNumeric(payload.acrescimo, {
      defaultValue: 0,
      label: "Acréscimo do pedido",
    });
    const items = Array.isArray(payload.items)
      ? payload.items.map((item, index) => this.normalizeItem(item, index))
      : [];

    if (!dataEmissao) {
      throw new Error("Data de emissão obrigatória.");
    }

    if (!dataPrimeiroVencimento) {
      throw new Error("Primeiro vencimento obrigatório.");
    }

    if (!items.length) {
      throw new Error("Adicione ao menos um item no pedido.");
    }

    const subtotal = roundCurrency(items.reduce((sum, item) => sum + item.valor_total, 0));
    const total = roundCurrency(subtotal - desconto + acrescimo);

    if (total <= 0) {
      throw new Error("O total do pedido precisa ser maior que zero.");
    }

    return {
      pessoa_id: pessoaId,
      financeiro_condicao_pagamento_id: condicaoPagamentoId,
      status: ["aberto", "recebido"].includes(status) ? status : "aberto",
      data_emissao: dataEmissao,
      data_primeiro_vencimento: dataPrimeiroVencimento,
      data_previsao: dataPrevisao,
      observacao,
      desconto,
      acrescimo,
      subtotal,
      total,
      items,
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
      throw new Error("Fornecedor selecionado inválido para esta filial.");
    }
  }

  static async buscarProdutosMap(client, produtoIds = []) {
    const { rows } = await client.query(
      `
        SELECT
          p.produto_id,
          COALESCE(NULLIF(p.codigo_interno, ''), p.produto_id::varchar(60)) AS codigo_interno,
          p.descricao,
          COALESCE(um.sigla, '') AS unidade_sigla
        FROM produto p
        LEFT JOIN produto_unidade pu ON pu.produto_id = p.produto_id
        LEFT JOIN unidade_medida um ON um.unidade_medida_id = pu.unidade_comercial_id
        WHERE p.tenant_id = ${TENANT_CONTEXT_SQL}
          AND p.excluido = FALSE
          AND p.ativo = TRUE
          AND p.produto_id = ANY($1::int[])
      `,
      [produtoIds]
    );

    return new Map(rows.map((row) => [Number(row.produto_id), row]));
  }

  static async buscarCondicaoPagamento(client, condicaoPagamentoId) {
    const { rows } = await client.query(
      `
        SELECT
          financeiro_condicao_pagamento_id,
          descricao,
          quantidade_parcelas,
          dias_primeiro_vencimento,
          intervalo_dias,
          percentual_entrada
        FROM financeiro_condicao_pagamento
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND ativo = TRUE
          AND (tipo = 'pagar' OR tipo = 'ambos')
          AND financeiro_condicao_pagamento_id = $1
        LIMIT 1
      `,
      [condicaoPagamentoId]
    );

    return rows[0]
      ? {
          ...rows[0],
          percentual_entrada: Number(rows[0].percentual_entrada || 0),
        }
      : null;
  }

  static gerarParcelas({ total, dataEmissao, primeiroVencimento, condicao }) {
    const totalPedido = roundCurrency(total);
    const percentualEntrada = Number(condicao.percentual_entrada || 0);
    const quantidadeParcelas = Number(condicao.quantidade_parcelas || 1);
    const diasPrimeiroVencimento = Number(condicao.dias_primeiro_vencimento || 0);
    const intervaloDias = Number(condicao.intervalo_dias || 30);
    const dataPrimeiroVencimento =
      normalizeDateValue(primeiroVencimento) || addDays(dataEmissao, diasPrimeiroVencimento);
    const parcelas = [];

    let restante = totalPedido;
    let numeroParcela = 1;

    if (percentualEntrada > 0) {
      const valorEntrada = roundCurrency((totalPedido * percentualEntrada) / 100);
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

      parcelas.push({
        numero_parcela: numeroParcela,
        valor_parcela: valorParcela,
        data_vencimento: addDays(dataPrimeiroVencimento, intervaloDias * index),
        status: buildStatusParcela(addDays(dataPrimeiroVencimento, intervaloDias * index)),
      });

      numeroParcela += 1;
    }

    return parcelas;
  }

  static async substituirItensPedido(client, pedidoCompraId, items, produtosMap) {
    await client.query(
      `
        DELETE FROM pedido_compra_item
        WHERE pedido_compra_id = $1
          AND tenant_id = ${TENANT_CONTEXT_SQL}
      `,
      [pedidoCompraId]
    );

    for (const item of items) {
      const produto = produtosMap.get(Number(item.produto_id));
      if (!produto) {
        throw new Error("Produto informado não pertence à filial ativa.");
      }

      await client.query(
        `
          INSERT INTO pedido_compra_item (
            tenant_id,
            pedido_compra_id,
            produto_id,
            codigo_interno,
            descricao,
            unidade_sigla,
            quantidade,
            valor_unitario,
            desconto,
            acrescimo,
            valor_total
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
            $10
          )
        `,
        [
          pedidoCompraId,
          item.produto_id,
          produto.codigo_interno,
          produto.descricao,
          produto.unidade_sigla,
          item.quantidade,
          item.valor_unitario,
          item.desconto,
          item.acrescimo,
          item.valor_total,
        ]
      );
    }
  }

  static async verificarTituloComBaixas(client, pedidoCompraId) {
    const { rowCount } = await client.query(
      `
        SELECT 1
        FROM financeiro_titulo_baixa fb
        JOIN financeiro_titulo ft
          ON ft.financeiro_titulo_id = fb.financeiro_titulo_id
         AND ft.tenant_id = fb.tenant_id
        WHERE ft.pedido_compra_id = $1
          AND ft.tenant_id = ${TENANT_CONTEXT_SQL}
          AND ft.excluido = FALSE
          AND fb.excluido = FALSE
        LIMIT 1
      `,
      [pedidoCompraId]
    );

    return rowCount > 0;
  }

  static async buscarPorId(client, pedidoCompraId) {
    const pedidoResult = await client.query(
      `
        SELECT
          pc.*,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj,
          cp.descricao AS condicao_pagamento_descricao
        FROM pedido_compra pc
        JOIN pessoa p ON p.pessoa_id = pc.pessoa_id
        LEFT JOIN financeiro_condicao_pagamento cp
          ON cp.financeiro_condicao_pagamento_id = pc.financeiro_condicao_pagamento_id
        WHERE pc.tenant_id = ${TENANT_CONTEXT_SQL}
          AND pc.excluido = FALSE
          AND pc.pedido_compra_id = $1
        LIMIT 1
      `,
      [pedidoCompraId]
    );

    const pedido = pedidoResult.rows[0];
    if (!pedido) return null;

    const [itemsResult, tituloResult, parcelasResult] = await Promise.all([
      client.query(
        `
          SELECT
            pedido_compra_item_id,
            produto_id,
            codigo_interno,
            descricao,
            unidade_sigla,
            quantidade,
            valor_unitario,
            desconto,
            acrescimo,
            valor_total
          FROM pedido_compra_item
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND pedido_compra_id = $1
          ORDER BY pedido_compra_item_id
        `,
        [pedidoCompraId]
      ),
      client.query(
        `
          SELECT
            financeiro_titulo_id,
            status,
            valor_original,
            desconto,
            acrescimo,
            valor_final,
            data_emissao,
            data_vencimento,
            observacao
          FROM financeiro_titulo
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND pedido_compra_id = $1
            AND excluido = FALSE
          LIMIT 1
        `,
        [pedidoCompraId]
      ),
      client.query(
        `
          SELECT
            ftp.financeiro_titulo_parcela_id,
            ftp.numero_parcela,
            ftp.valor_parcela,
            ftp.valor_recebido,
            ftp.data_vencimento,
            ftp.data_pagamento,
            ftp.status
          FROM financeiro_titulo_parcela ftp
          JOIN financeiro_titulo ft
            ON ft.financeiro_titulo_id = ftp.financeiro_titulo_id
           AND ft.tenant_id = ftp.tenant_id
          WHERE ft.tenant_id = ${TENANT_CONTEXT_SQL}
            AND ft.pedido_compra_id = $1
            AND ft.excluido = FALSE
          ORDER BY ftp.numero_parcela
        `,
        [pedidoCompraId]
      ),
    ]);

    return {
      pedido: {
        ...pedido,
        subtotal: Number(pedido.subtotal || 0),
        desconto: Number(pedido.desconto || 0),
        acrescimo: Number(pedido.acrescimo || 0),
        total: Number(pedido.total || 0),
        data_emissao: normalizeDateValue(pedido.data_emissao),
        data_previsao: normalizeDateValue(pedido.data_previsao),
      },
      items: itemsResult.rows.map((item) => ({
        ...item,
        quantidade: Number(item.quantidade || 0),
        valor_unitario: Number(item.valor_unitario || 0),
        desconto: Number(item.desconto || 0),
        acrescimo: Number(item.acrescimo || 0),
        valor_total: Number(item.valor_total || 0),
      })),
      titulo: tituloResult.rows[0]
        ? {
            ...tituloResult.rows[0],
            valor_original: Number(tituloResult.rows[0].valor_original || 0),
            desconto: Number(tituloResult.rows[0].desconto || 0),
            acrescimo: Number(tituloResult.rows[0].acrescimo || 0),
            valor_final: Number(tituloResult.rows[0].valor_final || 0),
            data_emissao: normalizeDateValue(tituloResult.rows[0].data_emissao),
            data_vencimento: normalizeDateValue(tituloResult.rows[0].data_vencimento),
          }
        : null,
      parcelas: parcelasResult.rows.map((parcela) => ({
        ...parcela,
        valor_parcela: Number(parcela.valor_parcela || 0),
        valor_recebido: Number(parcela.valor_recebido || 0),
        data_vencimento: normalizeDateValue(parcela.data_vencimento),
        data_pagamento: normalizeDateValue(parcela.data_pagamento),
      })),
    };
  }

  static async salvar(client, { pedidoCompraId = null, payload, usuarioId }) {
    const data = this.normalizePayload(payload);
    const produtoIds = [...new Set(data.items.map((item) => Number(item.produto_id)))];
    const produtosMap = await this.buscarProdutosMap(client, produtoIds);
    const condicaoPagamento = await this.buscarCondicaoPagamento(
      client,
      data.financeiro_condicao_pagamento_id
    );

    if (!condicaoPagamento) {
      throw new Error("Condição de pagamento inválida para compras.");
    }

    await this.validarPessoa(client, data.pessoa_id);

    if (produtosMap.size !== produtoIds.length) {
      throw new Error("Um ou mais produtos não pertencem à filial ativa.");
    }

    if (pedidoCompraId) {
      const existing = await this.buscarPorId(client, pedidoCompraId);
      if (!existing) throw new Error("Pedido de compra não encontrado.");

      const possuiBaixas = await this.verificarTituloComBaixas(client, pedidoCompraId);
      if (possuiBaixas) {
        throw new Error("Este pedido possui baixas financeiras e não pode mais ser alterado.");
      }
    }

    await client.query("BEGIN");

    try {
      let finalPedidoCompraId = pedidoCompraId;

      if (finalPedidoCompraId) {
        await client.query(
          `
            UPDATE pedido_compra
            SET
              pessoa_id = $2,
              usuario_id = $3,
              financeiro_condicao_pagamento_id = $4,
              status = $5,
              data_emissao = $6,
              data_previsao = $7,
              observacao = $8,
              subtotal = $9,
              desconto = $10,
              acrescimo = $11,
              total = $12
            WHERE pedido_compra_id = $1
              AND tenant_id = ${TENANT_CONTEXT_SQL}
              AND excluido = FALSE
          `,
          [
            finalPedidoCompraId,
            data.pessoa_id,
            usuarioId || null,
            data.financeiro_condicao_pagamento_id,
            data.status,
            data.data_emissao,
            data.data_previsao,
            data.observacao,
            data.subtotal,
            data.desconto,
            data.acrescimo,
            data.total,
          ]
        );
      } else {
        const pedidoResult = await client.query(
          `
            INSERT INTO pedido_compra (
              tenant_id,
              pessoa_id,
              usuario_id,
              financeiro_condicao_pagamento_id,
              status,
              data_emissao,
              data_previsao,
              observacao,
              subtotal,
              desconto,
              acrescimo,
              total,
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
              $9,
              $10,
              $11,
              FALSE
            )
            RETURNING pedido_compra_id
          `,
          [
            data.pessoa_id,
            usuarioId || null,
            data.financeiro_condicao_pagamento_id,
            data.status,
            data.data_emissao,
            data.data_previsao,
            data.observacao,
            data.subtotal,
            data.desconto,
            data.acrescimo,
            data.total,
          ]
        );

        finalPedidoCompraId = Number(pedidoResult.rows[0].pedido_compra_id);
      }

      await this.substituirItensPedido(client, finalPedidoCompraId, data.items, produtosMap);

      await client.query("COMMIT");
      return this.buscarPorId(client, finalPedidoCompraId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async cancelar(client, pedidoCompraId) {
    const existing = await this.buscarPorId(client, pedidoCompraId);
    if (!existing) {
      throw new Error("Pedido de compra não encontrado.");
    }

    const possuiBaixas = await this.verificarTituloComBaixas(client, pedidoCompraId);
    if (possuiBaixas) {
      throw new Error("Este pedido possui baixas financeiras e não pode ser cancelado.");
    }

    await client.query("BEGIN");

    try {
      await client.query(
        `
          UPDATE pedido_compra
          SET status = 'cancelado', excluido = TRUE
          WHERE pedido_compra_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
        `,
        [pedidoCompraId]
      );

      await client.query(
        `
          UPDATE financeiro_titulo
          SET status = 'cancelado', excluido = TRUE
          WHERE pedido_compra_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
        `,
        [pedidoCompraId]
      );

      await client.query(
        `
          UPDATE financeiro_titulo_parcela ftp
          SET status = 'cancelada'
          FROM financeiro_titulo ft
          WHERE ft.financeiro_titulo_id = ftp.financeiro_titulo_id
            AND ft.pedido_compra_id = $1
            AND ft.tenant_id = ${TENANT_CONTEXT_SQL}
            AND ftp.tenant_id = ${TENANT_CONTEXT_SQL}
        `,
        [pedidoCompraId]
      );

      await client.query("COMMIT");
      return { pedido_compra_id: pedidoCompraId };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export default CompraDAO;
