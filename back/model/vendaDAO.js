import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

const SORT_COLUMNS = {
  pedido_venda_id: "pv.pedido_venda_id",
  data_emissao: "pv.data_emissao",
  pessoa_nome_razao: "p.pessoa_nome_razao",
  total: "pv.total",
  status: "pv.status",
  financeiro_status: "ft.status",
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

const buildOrderBy = (sort = {}) => {
  const entries = Object.entries(sort)
    .map(([column, direction]) => {
      if (!SORT_COLUMNS[column]) return null;
      const normalizedDirection = String(direction).toUpperCase() === "DESC" ? "DESC" : "ASC";
      return `${SORT_COLUMNS[column]} ${normalizedDirection}`;
    })
    .filter(Boolean);

  return entries.length ? entries.join(", ") : "pv.pedido_venda_id DESC";
};

const buildStatusParcela = (dataVencimento) => {
  const today = new Date().toISOString().slice(0, 10);
  return dataVencimento < today ? "vencida" : "aberta";
};

class VendaDAO {
  static async listar(client, { page = 1, limit = 20, search = "", sort = {} }) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const values = [];
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE pv.tenant_id = ${TENANT_CONTEXT_SQL}
        AND pv.excluido = FALSE
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          CAST(pv.pedido_venda_id AS TEXT) LIKE $${values.length}
          OR LOWER(p.pessoa_nome_razao) LIKE LOWER($${values.length})
          OR LOWER(COALESCE(p.pessoa_cpf_cnpj, '')) LIKE LOWER($${values.length})
        )
      `;
    }

    const orderBy = buildOrderBy(sort);

    const listSql = `
      SELECT
        pv.pedido_venda_id,
        pv.data_emissao,
        pv.status,
        pv.total,
        pv.subtotal,
        pv.desconto,
        pv.acrescimo,
        p.pessoa_id,
        p.pessoa_nome_razao,
        p.pessoa_cpf_cnpj,
        cp.descricao AS condicao_pagamento_descricao,
        ft.financeiro_titulo_id,
        ft.status AS financeiro_status,
        ft.data_vencimento AS financeiro_data_vencimento
      FROM pedido_venda pv
      JOIN pessoa p ON p.pessoa_id = pv.pessoa_id
      LEFT JOIN financeiro_condicao_pagamento cp
        ON cp.financeiro_condicao_pagamento_id = pv.financeiro_condicao_pagamento_id
      LEFT JOIN financeiro_titulo ft
        ON ft.pedido_venda_id = pv.pedido_venda_id
       AND ft.tenant_id = pv.tenant_id
       AND ft.excluido = FALSE
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM pedido_venda pv
      JOIN pessoa p ON p.pessoa_id = pv.pessoa_id
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
          COALESCE(pp.preco_venda, 0) AS preco_venda
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
      preco_venda: Number(row.preco_venda || 0),
    }));
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

  static async obterSupportData(client) {
    const condicoesPagamento = await this.listarCondicoesPagamento(client, {
      tipo: "receber",
    });

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
      label: `Valor unitario do item ${index + 1}`,
    });
    const desconto = parseNumeric(item.desconto, {
      defaultValue: 0,
      label: `Desconto do item ${index + 1}`,
    });
    const acrescimo = parseNumeric(item.acrescimo, {
      defaultValue: 0,
      label: `Acrescimo do item ${index + 1}`,
    });

    if (quantidade <= 0) {
      throw new Error(`Quantidade invalida no item ${index + 1}.`);
    }

    if (valorUnitario < 0) {
      throw new Error(`Valor unitario invalido no item ${index + 1}.`);
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
      label: "Cliente",
    });
    const condicaoPagamentoId = parseInteger(payload.financeiro_condicao_pagamento_id, {
      label: "Condicao de pagamento",
    });
    const status = normalizeText(payload.status, 20, { label: "Status do pedido" }) || "aberto";
    const dataEmissao = normalizeText(payload.data_emissao, 10, {
      required: true,
      label: "Data de emissao",
    });
    const dataEntrega = normalizeText(payload.data_entrega, 10);
    const observacao = normalizeText(payload.observacao, null);
    const desconto = parseNumeric(payload.desconto, {
      defaultValue: 0,
      label: "Desconto do pedido",
    });
    const acrescimo = parseNumeric(payload.acrescimo, {
      defaultValue: 0,
      label: "Acrescimo do pedido",
    });
    const items = Array.isArray(payload.items)
      ? payload.items.map((item, index) => this.normalizeItem(item, index))
      : [];

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
      status: ["aberto", "faturado"].includes(status) ? status : "aberto",
      data_emissao: dataEmissao,
      data_entrega: dataEntrega,
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
      throw new Error("Pessoa selecionada invalida para esta filial.");
    }
  }

  static async buscarProdutosMap(client, produtoIds = []) {
    const { rows } = await client.query(
      `
        SELECT
          p.produto_id,
          p.codigo_interno,
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

  static gerarParcelas({ total, dataEmissao, condicao }) {
    const totalPedido = roundCurrency(total);
    const percentualEntrada = Number(condicao.percentual_entrada || 0);
    const quantidadeParcelas = Number(condicao.quantidade_parcelas || 1);
    const diasPrimeiroVencimento = Number(condicao.dias_primeiro_vencimento || 0);
    const intervaloDias = Number(condicao.intervalo_dias || 30);
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
      const valorParcela = isLast
        ? roundCurrency(restante - acumulado)
        : valorBase;

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

  static async substituirItensPedido(client, pedidoVendaId, items, produtosMap) {
    await client.query(
      `
        DELETE FROM pedido_venda_item
        WHERE pedido_venda_id = $1
          AND tenant_id = ${TENANT_CONTEXT_SQL}
      `,
      [pedidoVendaId]
    );

    for (const item of items) {
      const produto = produtosMap.get(Number(item.produto_id));
      if (!produto) {
        throw new Error("Produto informado nao pertence a filial ativa.");
      }

      await client.query(
        `
          INSERT INTO pedido_venda_item (
            tenant_id,
            pedido_venda_id,
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
          pedidoVendaId,
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

  static async substituirFinanceiroPedido(client, {
    pedidoVendaId,
    pessoaId,
    condicao,
    dataEmissao,
    observacao,
    valorOriginal,
    desconto,
    acrescimo,
  }) {
    const parcelas = this.gerarParcelas({
      total: roundCurrency(valorOriginal - desconto + acrescimo),
      dataEmissao,
      condicao,
    });

    const tituloExistente = await client.query(
      `
        SELECT financeiro_titulo_id
        FROM financeiro_titulo
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND pedido_venda_id = $1
          AND excluido = FALSE
        LIMIT 1
      `,
      [pedidoVendaId]
    );

    let financeiroTituloId = tituloExistente.rows[0]?.financeiro_titulo_id || null;

    if (!financeiroTituloId) {
      const result = await client.query(
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
            $1,
            $2,
            $3,
            $4,
            $5,
            'receber',
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
          pedidoVendaId,
          pessoaId,
          condicao.financeiro_condicao_pagamento_id,
          String(pedidoVendaId),
          `Pedido de venda #${pedidoVendaId}`,
          valorOriginal,
          desconto,
          acrescimo,
          dataEmissao,
          parcelas[0]?.data_vencimento || dataEmissao,
          observacao,
        ]
      );

      financeiroTituloId = result.rows[0].financeiro_titulo_id;
    } else {
      await client.query(
        `
          UPDATE financeiro_titulo
          SET
            pessoa_id = $2,
            financeiro_condicao_pagamento_id = $3,
            numero_documento = $4,
            descricao = $5,
            status = 'aberto',
            valor_original = $6,
            desconto = $7,
            acrescimo = $8,
            data_emissao = $9,
            data_vencimento = $10,
            observacao = $11,
            excluido = FALSE
          WHERE financeiro_titulo_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
        `,
        [
          financeiroTituloId,
          pessoaId,
          condicao.financeiro_condicao_pagamento_id,
          String(pedidoVendaId),
          `Pedido de venda #${pedidoVendaId}`,
          valorOriginal,
          desconto,
          acrescimo,
          dataEmissao,
          parcelas[0]?.data_vencimento || dataEmissao,
          observacao,
        ]
      );

      await client.query(
        `
          DELETE FROM financeiro_titulo_parcela
          WHERE financeiro_titulo_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
        `,
        [financeiroTituloId]
      );
    }

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
            status
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            0,
            $4,
            $5
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

    return { financeiro_titulo_id: financeiroTituloId, parcelas };
  }

  static async verificarTituloComBaixas(client, pedidoVendaId) {
    const { rowCount } = await client.query(
      `
        SELECT 1
        FROM financeiro_titulo_baixa fb
        JOIN financeiro_titulo ft
          ON ft.financeiro_titulo_id = fb.financeiro_titulo_id
         AND ft.tenant_id = fb.tenant_id
        WHERE ft.pedido_venda_id = $1
          AND ft.tenant_id = ${TENANT_CONTEXT_SQL}
          AND ft.excluido = FALSE
          AND fb.excluido = FALSE
        LIMIT 1
      `,
      [pedidoVendaId]
    );

    return rowCount > 0;
  }

  static async buscarPorId(client, pedidoVendaId) {
    const pedidoResult = await client.query(
      `
        SELECT
          pv.*,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj,
          cp.descricao AS condicao_pagamento_descricao
        FROM pedido_venda pv
        JOIN pessoa p ON p.pessoa_id = pv.pessoa_id
        LEFT JOIN financeiro_condicao_pagamento cp
          ON cp.financeiro_condicao_pagamento_id = pv.financeiro_condicao_pagamento_id
        WHERE pv.tenant_id = ${TENANT_CONTEXT_SQL}
          AND pv.excluido = FALSE
          AND pv.pedido_venda_id = $1
        LIMIT 1
      `,
      [pedidoVendaId]
    );

    const pedido = pedidoResult.rows[0];
    if (!pedido) return null;

    const [itemsResult, tituloResult, parcelasResult] = await Promise.all([
      client.query(
        `
          SELECT
            pedido_venda_item_id,
            produto_id,
            codigo_interno,
            descricao,
            unidade_sigla,
            quantidade,
            valor_unitario,
            desconto,
            acrescimo,
            valor_total
          FROM pedido_venda_item
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND pedido_venda_id = $1
          ORDER BY pedido_venda_item_id
        `,
        [pedidoVendaId]
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
            AND pedido_venda_id = $1
            AND excluido = FALSE
          LIMIT 1
        `,
        [pedidoVendaId]
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
            AND ft.pedido_venda_id = $1
            AND ft.excluido = FALSE
          ORDER BY ftp.numero_parcela
        `,
        [pedidoVendaId]
      ),
    ]);

    return {
      pedido: {
        ...pedido,
        subtotal: Number(pedido.subtotal || 0),
        desconto: Number(pedido.desconto || 0),
        acrescimo: Number(pedido.acrescimo || 0),
        total: Number(pedido.total || 0),
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
          }
        : null,
      parcelas: parcelasResult.rows.map((parcela) => ({
        ...parcela,
        valor_parcela: Number(parcela.valor_parcela || 0),
        valor_recebido: Number(parcela.valor_recebido || 0),
      })),
    };
  }

  static async criar(client, { payload, usuarioId }) {
    const data = this.normalizePayload(payload);
    const produtoIds = [...new Set(data.items.map((item) => Number(item.produto_id)))];
    const produtosMap = await this.buscarProdutosMap(client, produtoIds);
    const condicao = await this.buscarCondicaoPagamento(client, data.financeiro_condicao_pagamento_id);

    if (!condicao) {
      throw new Error("Condicao de pagamento invalida para a filial ativa.");
    }

    await this.validarPessoa(client, data.pessoa_id);

    if (produtosMap.size !== produtoIds.length) {
      throw new Error("Um ou mais produtos nao pertencem a filial ativa.");
    }

    await client.query("BEGIN");

    try {
      const pedidoResult = await client.query(
        `
          INSERT INTO pedido_venda (
            tenant_id,
            pessoa_id,
            usuario_id,
            financeiro_condicao_pagamento_id,
            status,
            data_emissao,
            data_entrega,
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
          RETURNING pedido_venda_id
        `,
        [
          data.pessoa_id,
          usuarioId || null,
          data.financeiro_condicao_pagamento_id,
          data.status,
          data.data_emissao,
          data.data_entrega,
          data.observacao,
          data.subtotal,
          data.desconto,
          data.acrescimo,
          data.total,
        ]
      );

      const pedidoVendaId = Number(pedidoResult.rows[0].pedido_venda_id);

      await this.substituirItensPedido(client, pedidoVendaId, data.items, produtosMap);
      await this.substituirFinanceiroPedido(client, {
        pedidoVendaId,
        pessoaId: data.pessoa_id,
        condicao,
        dataEmissao: data.data_emissao,
        observacao: data.observacao,
        valorOriginal: data.subtotal,
        desconto: data.desconto,
        acrescimo: data.acrescimo,
      });

      await client.query("COMMIT");
      return this.buscarPorId(client, pedidoVendaId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async atualizar(client, { pedidoVendaId, payload, usuarioId }) {
    const existing = await this.buscarPorId(client, pedidoVendaId);
    if (!existing) {
      throw new Error("Pedido de venda nao encontrado.");
    }

    const possuiBaixas = await this.verificarTituloComBaixas(client, pedidoVendaId);
    if (possuiBaixas) {
      throw new Error("Este pedido possui baixas financeiras e nao pode mais ser alterado.");
    }

    const data = this.normalizePayload(payload);
    const produtoIds = [...new Set(data.items.map((item) => Number(item.produto_id)))];
    const produtosMap = await this.buscarProdutosMap(client, produtoIds);
    const condicao = await this.buscarCondicaoPagamento(client, data.financeiro_condicao_pagamento_id);

    if (!condicao) {
      throw new Error("Condicao de pagamento invalida para a filial ativa.");
    }

    await this.validarPessoa(client, data.pessoa_id);

    if (produtosMap.size !== produtoIds.length) {
      throw new Error("Um ou mais produtos nao pertencem a filial ativa.");
    }

    await client.query("BEGIN");

    try {
      await client.query(
        `
          UPDATE pedido_venda
          SET
            pessoa_id = $2,
            usuario_id = $3,
            financeiro_condicao_pagamento_id = $4,
            status = $5,
            data_emissao = $6,
            data_entrega = $7,
            observacao = $8,
            subtotal = $9,
            desconto = $10,
            acrescimo = $11,
            total = $12
          WHERE pedido_venda_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
            AND excluido = FALSE
        `,
        [
          pedidoVendaId,
          data.pessoa_id,
          usuarioId || existing?.pedido?.usuario_id || null,
          data.financeiro_condicao_pagamento_id,
          data.status,
          data.data_emissao,
          data.data_entrega,
          data.observacao,
          data.subtotal,
          data.desconto,
          data.acrescimo,
          data.total,
        ]
      );

      await this.substituirItensPedido(client, pedidoVendaId, data.items, produtosMap);
      await this.substituirFinanceiroPedido(client, {
        pedidoVendaId,
        pessoaId: data.pessoa_id,
        condicao,
        dataEmissao: data.data_emissao,
        observacao: data.observacao,
        valorOriginal: data.subtotal,
        desconto: data.desconto,
        acrescimo: data.acrescimo,
      });

      await client.query("COMMIT");
      return this.buscarPorId(client, pedidoVendaId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async excluir(client, pedidoVendaId) {
    const existing = await this.buscarPorId(client, pedidoVendaId);
    if (!existing) {
      throw new Error("Pedido de venda nao encontrado.");
    }

    const possuiBaixas = await this.verificarTituloComBaixas(client, pedidoVendaId);
    if (possuiBaixas) {
      throw new Error("Este pedido possui baixas financeiras e nao pode ser removido.");
    }

    await client.query("BEGIN");

    try {
      await client.query(
        `
          UPDATE pedido_venda
          SET status = 'cancelado', excluido = TRUE
          WHERE pedido_venda_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
        `,
        [pedidoVendaId]
      );

      await client.query(
        `
          UPDATE financeiro_titulo
          SET status = 'cancelado', excluido = TRUE
          WHERE pedido_venda_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
        `,
        [pedidoVendaId]
      );

      await client.query(
        `
          UPDATE financeiro_titulo_parcela ftp
          SET status = 'cancelada'
          WHERE ftp.tenant_id = ${TENANT_CONTEXT_SQL}
            AND ftp.financeiro_titulo_id IN (
              SELECT financeiro_titulo_id
              FROM financeiro_titulo
              WHERE pedido_venda_id = $1
                AND tenant_id = ${TENANT_CONTEXT_SQL}
            )
        `,
        [pedidoVendaId]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export default VendaDAO;
