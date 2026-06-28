import { TENANT_CONTEXT_SQL } from "../utils/sql.js";
import EstoqueDAO from "./estoqueDAO.js";

const SORT_COLUMNS = {
  devolucao_mercadoria_id: "dm.devolucao_mercadoria_id",
  data_devolucao: "dm.data_devolucao",
  pessoa_nome_razao: "p.pessoa_nome_razao",
  tipo: "dm.tipo",
  total: "dm.total",
  status: "dm.status",
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

const parseNumeric = (value, { label = "Campo" } = {}) => {
  let normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${label} obrigatório.`);

  const hasDot = normalized.includes(".");
  const hasComma = normalized.includes(",");
  if (hasDot && hasComma) {
    normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
  } else {
    normalized = normalized.replace(/,/g, ".");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error(`${label} inválido.`);

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

const normalizeDateValue = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const normalized = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
    const [day, month, year] = normalized.split("/");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return normalized.slice(0, 10);
};

const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));

const buildOrderBy = (sort = {}) => {
  const entries = Object.entries(sort || {})
    .map(([column, direction]) => {
      if (!SORT_COLUMNS[column]) return null;
      const safeDirection = String(direction).toUpperCase() === "DESC" ? "DESC" : "ASC";
      return `${SORT_COLUMNS[column]} ${safeDirection}`;
    })
    .filter(Boolean);

  return entries.length ? entries.join(", ") : "dm.devolucao_mercadoria_id DESC";
};

class DevolucaoMercadoriaDAO {
  static normalizePayload(payload = {}) {
    const tipo = normalizeText(payload.tipo, 20, { required: true, label: "Tipo" });
    if (!["venda", "compra"].includes(tipo)) {
      throw new Error("Tipo de devolução inválido.");
    }

    const origemId =
      tipo === "venda"
        ? parseInteger(payload.pedido_venda_id || payload.origem_id, {
            label: "Pedido de venda",
          })
        : parseInteger(payload.entrada_mercadoria_id || payload.origem_id, {
            label: "Entrada de mercadoria",
          });

    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) {
      throw new Error("Informe ao menos um item para devolução.");
    }

    return {
      tipo,
      origem_id: origemId,
      data_devolucao: normalizeDateValue(payload.data_devolucao),
      motivo: normalizeText(payload.motivo, 180),
      observacao: normalizeText(payload.observacao, null),
      items: items.map((item, index) => ({
        origem_item_id: parseInteger(item.origem_item_id, {
          label: `Item ${index + 1}`,
        }),
        quantidade: parseNumeric(item.quantidade, {
          label: `Quantidade do item ${index + 1}`,
        }),
      })),
    };
  }

  static async buscarOperacaoFiscal(client, tipo) {
    const codigo = tipo === "venda" ? "DEVOLUCAO_VENDA" : "DEVOLUCAO_COMPRA";
    const { rows } = await client.query(
      `
        SELECT operacao_fiscal_id
        FROM operacao_fiscal
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND codigo = $1
          AND ativo = TRUE
          AND excluido = FALSE
        LIMIT 1
      `,
      [codigo]
    );

    return rows[0]?.operacao_fiscal_id || null;
  }

  static async buscarTipoMovimento(client, tipo) {
    const codigo = tipo === "venda" ? "devolucao_entrada" : "devolucao_saida";
    const { rows } = await client.query(
      `
        SELECT estoque_tipo_movimento_id
        FROM estoque_tipo_movimento
        WHERE codigo = $1
        LIMIT 1
      `,
      [codigo]
    );

    return rows[0]?.estoque_tipo_movimento_id || null;
  }

  static async listar(client, { page = 1, limit = 20, search = "", sort = {} } = {}) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const values = [];
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE dm.tenant_id = ${TENANT_CONTEXT_SQL}
        AND dm.excluido = FALSE
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          CAST(dm.devolucao_mercadoria_id AS TEXT) LIKE $${values.length}
          OR LOWER(p.pessoa_nome_razao) LIKE LOWER($${values.length})
          OR LOWER(COALESCE(p.pessoa_cpf_cnpj, '')) LIKE LOWER($${values.length})
          OR LOWER(COALESCE(dm.motivo, '')) LIKE LOWER($${values.length})
        )
      `;
    }

    const orderBy = buildOrderBy(sort);

    const listSql = `
      SELECT
        dm.devolucao_mercadoria_id,
        dm.tipo,
        dm.status,
        dm.data_devolucao,
        dm.motivo,
        dm.total,
        dm.pedido_venda_id,
        dm.entrada_mercadoria_id,
        p.pessoa_nome_razao,
        p.pessoa_cpf_cnpj,
        COUNT(dmi.devolucao_mercadoria_item_id)::int AS total_itens
      FROM devolucao_mercadoria dm
      JOIN pessoa p ON p.pessoa_id = dm.pessoa_id
      LEFT JOIN devolucao_mercadoria_item dmi
        ON dmi.devolucao_mercadoria_id = dm.devolucao_mercadoria_id
      ${where}
      GROUP BY
        dm.devolucao_mercadoria_id,
        p.pessoa_nome_razao,
        p.pessoa_cpf_cnpj
      ORDER BY ${orderBy}
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM devolucao_mercadoria dm
      JOIN pessoa p ON p.pessoa_id = dm.pessoa_id
      ${where}
    `;

    const listResult = await client.query(listSql, [...values, safeLimit, offset]);
    const countResult = await client.query(countSql, values);

    const total = countResult.rows[0]?.total || 0;

    return {
      data: listResult.rows.map((row) => ({
        ...row,
        total: Number(row.total || 0),
      })),
      page: safePage,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  static async listarOrigensSelect(client, { tipo = "venda", search = "", limit = 20 } = {}) {
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 50) : 20;
    const normalizedSearch = String(search || "").trim();
    const values = [];

    if (tipo === "compra") {
      let where = `
        WHERE em.tenant_id = ${TENANT_CONTEXT_SQL}
          AND em.status = 'conferida'
          AND em.excluido = FALSE
      `;

      if (normalizedSearch) {
        values.push(`%${normalizedSearch}%`);
        where += `
          AND (
            CAST(em.entrada_mercadoria_id AS TEXT) LIKE $${values.length}
            OR LOWER(p.pessoa_nome_razao) LIKE LOWER($${values.length})
            OR LOWER(COALESCE(p.pessoa_cpf_cnpj, '')) LIKE LOWER($${values.length})
            OR LOWER(COALESCE(em.numero_nfe, '')) LIKE LOWER($${values.length})
          )
        `;
      }

      values.push(safeLimit);
      const { rows } = await client.query(
        `
          SELECT
            em.entrada_mercadoria_id AS origem_id,
            em.entrada_mercadoria_id,
            em.numero_nfe,
            em.serie_nfe,
            em.total,
            p.pessoa_nome_razao,
            p.pessoa_cpf_cnpj
          FROM entrada_mercadoria em
          JOIN pessoa p ON p.pessoa_id = em.pessoa_id
          ${where}
          ORDER BY em.entrada_mercadoria_id DESC
          LIMIT $${values.length}
        `,
        values
      );

      return rows;
    }

    let where = `
      WHERE pv.tenant_id = ${TENANT_CONTEXT_SQL}
        AND pv.status <> 'cancelado'
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

    values.push(safeLimit);
    const { rows } = await client.query(
      `
        SELECT
          pv.pedido_venda_id AS origem_id,
          pv.pedido_venda_id,
          pv.total,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj
        FROM pedido_venda pv
        JOIN pessoa p ON p.pessoa_id = pv.pessoa_id
        ${where}
        ORDER BY pv.pedido_venda_id DESC
        LIMIT $${values.length}
      `,
      values
    );

    return rows;
  }

  static async buscarOrigem(client, tipo, origemId) {
    if (tipo === "compra") return this.buscarOrigemCompra(client, origemId);
    return this.buscarOrigemVenda(client, origemId);
  }

  static async buscarOrigemVenda(client, pedidoVendaId) {
    const pedidoResult = await client.query(
      `
        SELECT
          pv.pedido_venda_id,
          pv.pessoa_id,
          pv.status,
          pv.total,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj
        FROM pedido_venda pv
        JOIN pessoa p ON p.pessoa_id = pv.pessoa_id
        WHERE pv.tenant_id = ${TENANT_CONTEXT_SQL}
          AND pv.pedido_venda_id = $1
          AND pv.status <> 'cancelado'
          AND pv.excluido = FALSE
        LIMIT 1
      `,
      [pedidoVendaId]
    );

    const origem = pedidoResult.rows[0];
    if (!origem) return null;

    const itemsResult = await client.query(
      `
        SELECT
          pvi.pedido_venda_item_id AS origem_item_id,
          pvi.pedido_venda_item_id,
          pvi.produto_id,
          pvi.codigo_interno,
          pvi.descricao,
          pvi.unidade_sigla,
          pvi.quantidade,
          pvi.valor_unitario,
          pvi.valor_total,
          COALESCE(SUM(dmi.quantidade) FILTER (
            WHERE dm.devolucao_mercadoria_id IS NOT NULL
          ), 0) AS quantidade_devolvida
        FROM pedido_venda_item pvi
        LEFT JOIN devolucao_mercadoria_item dmi
          ON dmi.pedido_venda_item_id = pvi.pedido_venda_item_id
        LEFT JOIN devolucao_mercadoria dm
          ON dm.devolucao_mercadoria_id = dmi.devolucao_mercadoria_id
         AND dm.status <> 'cancelada'
         AND dm.excluido = FALSE
        WHERE pvi.tenant_id = ${TENANT_CONTEXT_SQL}
          AND pvi.pedido_venda_id = $1
        GROUP BY pvi.pedido_venda_item_id
        ORDER BY pvi.pedido_venda_item_id
      `,
      [pedidoVendaId]
    );

    return {
      origem,
      items: itemsResult.rows.map((item) => ({
        ...item,
        quantidade: Number(item.quantidade || 0),
        quantidade_devolvida: Number(item.quantidade_devolvida || 0),
        quantidade_disponivel:
          Number(item.quantidade || 0) - Number(item.quantidade_devolvida || 0),
        valor_unitario: Number(item.valor_unitario || 0),
        valor_total: Number(item.valor_total || 0),
      })),
    };
  }

  static async buscarOrigemCompra(client, entradaMercadoriaId) {
    const entradaResult = await client.query(
      `
        SELECT
          em.entrada_mercadoria_id,
          em.pedido_compra_id,
          em.pessoa_id,
          em.status,
          em.total,
          em.numero_nfe,
          em.serie_nfe,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj
        FROM entrada_mercadoria em
        JOIN pessoa p ON p.pessoa_id = em.pessoa_id
        WHERE em.tenant_id = ${TENANT_CONTEXT_SQL}
          AND em.entrada_mercadoria_id = $1
          AND em.status = 'conferida'
          AND em.excluido = FALSE
        LIMIT 1
      `,
      [entradaMercadoriaId]
    );

    const origem = entradaResult.rows[0];
    if (!origem) return null;

    const itemsResult = await client.query(
      `
        SELECT
          emi.entrada_mercadoria_item_id AS origem_item_id,
          emi.entrada_mercadoria_item_id,
          emi.produto_id,
          emi.codigo_interno,
          emi.descricao,
          emi.unidade_sigla,
          emi.quantidade,
          emi.valor_unitario,
          emi.valor_total,
          COALESCE(SUM(dmi.quantidade) FILTER (
            WHERE dm.devolucao_mercadoria_id IS NOT NULL
          ), 0) AS quantidade_devolvida
        FROM entrada_mercadoria_item emi
        LEFT JOIN devolucao_mercadoria_item dmi
          ON dmi.entrada_mercadoria_item_id = emi.entrada_mercadoria_item_id
        LEFT JOIN devolucao_mercadoria dm
          ON dm.devolucao_mercadoria_id = dmi.devolucao_mercadoria_id
         AND dm.status <> 'cancelada'
         AND dm.excluido = FALSE
        WHERE emi.tenant_id = ${TENANT_CONTEXT_SQL}
          AND emi.entrada_mercadoria_id = $1
        GROUP BY emi.entrada_mercadoria_item_id
        ORDER BY emi.entrada_mercadoria_item_id
      `,
      [entradaMercadoriaId]
    );

    return {
      origem,
      items: itemsResult.rows.map((item) => ({
        ...item,
        quantidade: Number(item.quantidade || 0),
        quantidade_devolvida: Number(item.quantidade_devolvida || 0),
        quantidade_disponivel:
          Number(item.quantidade || 0) - Number(item.quantidade_devolvida || 0),
        valor_unitario: Number(item.valor_unitario || 0),
        valor_total: Number(item.valor_total || 0),
      })),
    };
  }

  static async buscarPorId(client, devolucaoId) {
    const { rows } = await client.query(
      `
        SELECT
          dm.*,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj,
          op.descricao AS operacao_fiscal_descricao
        FROM devolucao_mercadoria dm
        JOIN pessoa p ON p.pessoa_id = dm.pessoa_id
        LEFT JOIN operacao_fiscal op ON op.operacao_fiscal_id = dm.operacao_fiscal_id
        WHERE dm.tenant_id = ${TENANT_CONTEXT_SQL}
          AND dm.devolucao_mercadoria_id = $1
          AND dm.excluido = FALSE
        LIMIT 1
      `,
      [devolucaoId]
    );

    const devolucao = rows[0];
    if (!devolucao) return null;

    const itemsResult = await client.query(
      `
        SELECT *
        FROM devolucao_mercadoria_item
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND devolucao_mercadoria_id = $1
        ORDER BY devolucao_mercadoria_item_id
      `,
      [devolucaoId]
    );

    return {
      devolucao: {
        ...devolucao,
        total: Number(devolucao.total || 0),
      },
      items: itemsResult.rows.map((item) => ({
        ...item,
        quantidade: Number(item.quantidade || 0),
        valor_unitario: Number(item.valor_unitario || 0),
        valor_total: Number(item.valor_total || 0),
      })),
    };
  }

  static async registrarMovimentoEstoque(client, {
    tipo,
    depositoId,
    tipoMovimentoId,
    devolucaoId,
    item,
    quantidade,
    usuarioId,
  }) {
    const saldoResult = await client.query(
      `
        SELECT produto_estoque_id, estoque_atual
        FROM produto_estoque
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND produto_id = $1
          AND deposito_id = $2
        FOR UPDATE
      `,
      [item.produto_id, depositoId]
    );

    const saldoAnterior = Number(saldoResult.rows[0]?.estoque_atual || 0);
    const quantidadeMovimento = tipo === "venda" ? quantidade : -quantidade;
    const saldoPosterior = saldoAnterior + quantidadeMovimento;

    if (saldoPosterior < 0) {
      throw new Error(`A devolução do item "${item.descricao}" deixaria o estoque negativo.`);
    }

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
        SET estoque_atual = EXCLUDED.estoque_atual,
            atualizado_em = NOW()
      `,
      [item.produto_id, depositoId, saldoPosterior]
    );

    await client.query(
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
          $6,
          'devolucao_mercadoria',
          'devolucao_mercadoria',
          $7,
          $8,
          $9,
          $10,
          $11
        )
      `,
      [
        item.produto_id,
        depositoId,
        tipoMovimentoId,
        tipo === "venda" ? "devolucao_entrada" : "devolucao_saida",
        quantidadeMovimento,
        item.valor_unitario,
        devolucaoId,
        saldoAnterior,
        saldoPosterior,
        usuarioId || null,
        tipo === "venda" ? "Devolução de venda" : "Devolução de compra",
      ]
    );
  }

  static async criar(client, { payload, usuarioId }) {
    const data = this.normalizePayload(payload);
    const origemData = await this.buscarOrigem(client, data.tipo, data.origem_id);

    if (!origemData?.origem) {
      throw new Error(data.tipo === "venda" ? "Pedido de venda não encontrado." : "Entrada não encontrada.");
    }

    const itemsMap = new Map(
      (origemData.items || []).map((item) => [Number(item.origem_item_id), item])
    );

    const normalizedItems = data.items.map((item) => {
      const origemItem = itemsMap.get(Number(item.origem_item_id));
      if (!origemItem) {
        throw new Error("Um ou mais itens não pertencem à origem selecionada.");
      }

      if (item.quantidade <= 0 || item.quantidade > Number(origemItem.quantidade_disponivel || 0)) {
        throw new Error(`Revise a quantidade devolvida no item "${origemItem.descricao}".`);
      }

      return {
        ...origemItem,
        quantidade_devolver: item.quantidade,
        valor_total_devolver: roundCurrency(item.quantidade * Number(origemItem.valor_unitario || 0)),
      };
    });

    const total = roundCurrency(
      normalizedItems.reduce((sum, item) => sum + item.valor_total_devolver, 0)
    );

    const depositoId = await EstoqueDAO.obterDepositoPadrao(client);
    const tipoMovimentoId = await this.buscarTipoMovimento(client, data.tipo);
    const operacaoFiscalId = await this.buscarOperacaoFiscal(client, data.tipo);

    if (!tipoMovimentoId) {
      throw new Error("Tipo de movimento de estoque da devolução não encontrado.");
    }

    await client.query("BEGIN");

    try {
      const origem = origemData.origem;
      const devolucaoResult = await client.query(
        `
          INSERT INTO devolucao_mercadoria (
            tenant_id,
            operacao_fiscal_id,
            pedido_venda_id,
            entrada_mercadoria_id,
            pessoa_id,
            usuario_id,
            tipo,
            status,
            data_devolucao,
            motivo,
            observacao,
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
            'registrada',
            $7,
            $8,
            $9,
            $10,
            FALSE
          )
          RETURNING devolucao_mercadoria_id
        `,
        [
          operacaoFiscalId,
          data.tipo === "venda" ? data.origem_id : null,
          data.tipo === "compra" ? data.origem_id : null,
          origem.pessoa_id,
          usuarioId || null,
          data.tipo,
          data.data_devolucao,
          data.motivo,
          data.observacao,
          total,
        ]
      );

      const devolucaoId = Number(devolucaoResult.rows[0].devolucao_mercadoria_id);

      for (const item of normalizedItems) {
        await client.query(
          `
            INSERT INTO devolucao_mercadoria_item (
              tenant_id,
              devolucao_mercadoria_id,
              pedido_venda_item_id,
              entrada_mercadoria_item_id,
              produto_id,
              codigo_interno,
              descricao,
              unidade_sigla,
              quantidade,
              valor_unitario,
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
            devolucaoId,
            data.tipo === "venda" ? item.pedido_venda_item_id : null,
            data.tipo === "compra" ? item.entrada_mercadoria_item_id : null,
            item.produto_id,
            item.codigo_interno,
            item.descricao,
            item.unidade_sigla,
            item.quantidade_devolver,
            item.valor_unitario,
            item.valor_total_devolver,
          ]
        );

        await this.registrarMovimentoEstoque(client, {
          tipo: data.tipo,
          depositoId,
          tipoMovimentoId,
          devolucaoId,
          item,
          quantidade: item.quantidade_devolver,
          usuarioId,
        });
      }

      await client.query("COMMIT");
      return this.buscarPorId(client, devolucaoId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export default DevolucaoMercadoriaDAO;
