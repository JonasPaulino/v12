import EstoqueDAO from "./estoqueDAO.js";
import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

const SORT_COLUMNS = {
  entrada_mercadoria_id: "em.entrada_mercadoria_id",
  data_entrada: "em.data_entrada",
  pedido_compra_id: "em.pedido_compra_id",
  pessoa_nome_razao: "p.pessoa_nome_razao",
  total: "em.total",
  status: "em.status",
};

const parseInteger = (value, { min = 1, label = "Campo" } = {}) => {
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

  return entries.length ? entries.join(", ") : "em.entrada_mercadoria_id DESC";
};

class EntradaMercadoriaDAO {
  static async listar(client, { page = 1, limit = 20, search = "", sort = {} }) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const values = [];
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE em.tenant_id = ${TENANT_CONTEXT_SQL}
        AND em.excluido = FALSE
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          CAST(em.entrada_mercadoria_id AS TEXT) LIKE $${values.length}
          OR CAST(em.pedido_compra_id AS TEXT) LIKE $${values.length}
          OR LOWER(p.pessoa_nome_razao) LIKE LOWER($${values.length})
          OR LOWER(COALESCE(p.pessoa_cpf_cnpj, '')) LIKE LOWER($${values.length})
        )
      `;
    }

    const orderBy = buildOrderBy(sort);

    const listSql = `
      SELECT
        em.entrada_mercadoria_id,
        em.pedido_compra_id,
        em.data_entrada,
        em.status,
        em.total,
        p.pessoa_nome_razao,
        p.pessoa_cpf_cnpj,
        COUNT(emi.entrada_mercadoria_item_id)::int AS total_itens
      FROM entrada_mercadoria em
      JOIN pessoa p ON p.pessoa_id = em.pessoa_id
      LEFT JOIN entrada_mercadoria_item emi
        ON emi.entrada_mercadoria_id = em.entrada_mercadoria_id
       AND emi.tenant_id = em.tenant_id
      ${where}
      GROUP BY
        em.entrada_mercadoria_id,
        em.pedido_compra_id,
        em.data_entrada,
        em.status,
        em.total,
        p.pessoa_nome_razao,
        p.pessoa_cpf_cnpj
      ORDER BY ${orderBy}
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM entrada_mercadoria em
      JOIN pessoa p ON p.pessoa_id = em.pessoa_id
      ${where}
    `;

    const [listResult, countResult] = await Promise.all([
      client.query(listSql, [...values, safeLimit, offset]),
      client.query(countSql, values),
    ]);

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

  static async listarPedidosCompraSelect(client, { search = "", limit = 20 } = {}) {
    const values = [];
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 50) : 20;
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE pc.tenant_id = ${TENANT_CONTEXT_SQL}
        AND pc.excluido = FALSE
        AND pc.status = 'aberto'
        AND NOT EXISTS (
          SELECT 1
          FROM entrada_mercadoria em
          WHERE em.tenant_id = pc.tenant_id
            AND em.pedido_compra_id = pc.pedido_compra_id
            AND em.status <> 'cancelada'
            AND em.excluido = FALSE
        )
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

    values.push(safeLimit);

    const { rows } = await client.query(
      `
        SELECT
          pc.pedido_compra_id,
          pc.data_emissao,
          pc.total,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj
        FROM pedido_compra pc
        JOIN pessoa p ON p.pessoa_id = pc.pessoa_id
        ${where}
        ORDER BY pc.pedido_compra_id DESC
        LIMIT $${values.length}
      `,
      values
    );

    return rows.map((row) => ({
      ...row,
      total: Number(row.total || 0),
    }));
  }

  static async buscarPedidoCompra(client, pedidoCompraId) {
    const pedidoResult = await client.query(
      `
        SELECT
          pc.pedido_compra_id,
          pc.pessoa_id,
          pc.data_emissao,
          pc.data_previsao,
          pc.status,
          pc.total,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj
        FROM pedido_compra pc
        JOIN pessoa p ON p.pessoa_id = pc.pessoa_id
        WHERE pc.tenant_id = ${TENANT_CONTEXT_SQL}
          AND pc.excluido = FALSE
          AND pc.pedido_compra_id = $1
        LIMIT 1
      `,
      [pedidoCompraId]
    );

    const pedido = pedidoResult.rows[0];
    if (!pedido) return null;

    const itemsResult = await client.query(
      `
        SELECT
          pci.pedido_compra_item_id,
          pci.produto_id,
          pci.codigo_interno,
          pci.descricao,
          pci.unidade_sigla,
          pci.quantidade,
          pci.valor_unitario,
          pci.valor_total,
          p.controla_estoque
        FROM pedido_compra_item pci
        JOIN produto p ON p.produto_id = pci.produto_id
        WHERE pci.tenant_id = ${TENANT_CONTEXT_SQL}
          AND pci.pedido_compra_id = $1
        ORDER BY pci.pedido_compra_item_id
      `,
      [pedidoCompraId]
    );

    return {
      pedido: {
        ...pedido,
        total: Number(pedido.total || 0),
        data_emissao: normalizeDateValue(pedido.data_emissao),
        data_previsao: normalizeDateValue(pedido.data_previsao),
      },
      items: itemsResult.rows.map((item) => ({
        ...item,
        quantidade: Number(item.quantidade || 0),
        valor_unitario: Number(item.valor_unitario || 0),
        valor_total: Number(item.valor_total || 0),
        controla_estoque: !!item.controla_estoque,
      })),
    };
  }

  static normalizePayload(payload = {}) {
    const pedidoCompraId = parseInteger(payload.pedido_compra_id, {
      label: "Pedido de compra",
    });
    const dataEntrada = normalizeDateValue(payload.data_entrada);
    const observacao = normalizeText(payload.observacao, null);
    const items = Array.isArray(payload.items) ? payload.items : [];

    if (!dataEntrada) {
      throw new Error("Data de entrada obrigatória.");
    }

    if (!items.length) {
      throw new Error("A entrada precisa ter ao menos um item.");
    }

    return {
      pedido_compra_id: pedidoCompraId,
      data_entrada: dataEntrada,
      observacao,
      items: items.map((item, index) => {
        const pedidoCompraItemId = parseInteger(item.pedido_compra_item_id, {
          label: `Item ${index + 1}`,
        });
        const quantidade = parseNumeric(item.quantidade, {
          label: `Quantidade do item ${index + 1}`,
        });

        if (quantidade <= 0) {
          throw new Error(`Quantidade inválida no item ${index + 1}.`);
        }

        return {
          pedido_compra_item_id: pedidoCompraItemId,
          quantidade,
        };
      }),
    };
  }

  static async buscarTipoMovimentoCompra(client) {
    const { rows } = await client.query(
      `
        SELECT estoque_tipo_movimento_id
        FROM estoque_tipo_movimento
        WHERE codigo = 'compra_entrada'
        LIMIT 1
      `
    );

    return rows[0]?.estoque_tipo_movimento_id || null;
  }

  static async registrarMovimentoEntrada(client, {
    depositoId,
    entradaMercadoriaId,
    item,
    quantidade,
    usuarioId,
    tipoMovimentoId,
  }) {
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
        VALUES (${TENANT_CONTEXT_SQL}, $1, $2, 0, 0, 0)
        ON CONFLICT (produto_id, deposito_id) DO NOTHING
      `,
      [item.produto_id, depositoId]
    );

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
    const saldoPosterior = saldoAnterior + quantidade;

    await client.query(
      `
        UPDATE produto_estoque
        SET estoque_atual = $3,
            atualizado_em = NOW()
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND produto_id = $1
          AND deposito_id = $2
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
          'compra_entrada',
          $4,
          $5,
          'entrada_mercadoria',
          'entrada_mercadoria',
          $6,
          $7,
          $8,
          $9,
          $10
        )
      `,
      [
        item.produto_id,
        depositoId,
        tipoMovimentoId,
        quantidade,
        item.valor_unitario,
        entradaMercadoriaId,
        saldoAnterior,
        saldoPosterior,
        usuarioId || null,
        `Entrada vinculada ao pedido de compra #${item.pedido_compra_id}`,
      ]
    );
  }

  static async criar(client, { payload, usuarioId }) {
    const data = this.normalizePayload(payload);
    const pedido = await this.buscarPedidoCompra(client, data.pedido_compra_id);

    if (!pedido) {
      throw new Error("Pedido de compra não encontrado.");
    }

    if (pedido.pedido.status !== "aberto") {
      throw new Error("Apenas pedidos de compra em aberto podem receber entrada.");
    }

    const entradaExistente = await client.query(
      `
        SELECT 1
        FROM entrada_mercadoria
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND pedido_compra_id = $1
          AND status <> 'cancelada'
          AND excluido = FALSE
        LIMIT 1
      `,
      [data.pedido_compra_id]
    );

    if (entradaExistente.rowCount) {
      throw new Error("Este pedido de compra já possui entrada registrada.");
    }

    const itemsMap = new Map(
      pedido.items.map((item) => [Number(item.pedido_compra_item_id), item])
    );

    const normalizedItems = data.items.map((item) => {
      const pedidoItem = itemsMap.get(Number(item.pedido_compra_item_id));
      if (!pedidoItem) {
        throw new Error("Um ou mais itens não pertencem ao pedido selecionado.");
      }

      if (!pedidoItem.controla_estoque) {
        throw new Error(`O produto "${pedidoItem.descricao}" não controla estoque.`);
      }

      if (item.quantidade > Number(pedidoItem.quantidade || 0)) {
        throw new Error(`Quantidade recebida maior que a comprada no item "${pedidoItem.descricao}".`);
      }

      return {
        ...pedidoItem,
        pedido_compra_id: data.pedido_compra_id,
        quantidade_recebida: item.quantidade,
        valor_total_recebido: roundCurrency(item.quantidade * Number(pedidoItem.valor_unitario || 0)),
      };
    });

    const total = roundCurrency(
      normalizedItems.reduce((sum, item) => sum + item.valor_total_recebido, 0)
    );

    const depositoId = await EstoqueDAO.obterDepositoPadrao(client);
    const tipoMovimentoId = await this.buscarTipoMovimentoCompra(client);

    await client.query("BEGIN");

    try {
      const entradaResult = await client.query(
        `
          INSERT INTO entrada_mercadoria (
            tenant_id,
            pedido_compra_id,
            pessoa_id,
            usuario_id,
            status,
            data_entrada,
            observacao,
            total,
            excluido
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            'conferida',
            $4,
            $5,
            $6,
            FALSE
          )
          RETURNING entrada_mercadoria_id
        `,
        [
          data.pedido_compra_id,
          pedido.pedido.pessoa_id,
          usuarioId || null,
          data.data_entrada,
          data.observacao,
          total,
        ]
      );

      const entradaMercadoriaId = Number(entradaResult.rows[0].entrada_mercadoria_id);

      for (const item of normalizedItems) {
        await client.query(
          `
            INSERT INTO entrada_mercadoria_item (
              tenant_id,
              entrada_mercadoria_id,
              pedido_compra_item_id,
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
              $9
            )
          `,
          [
            entradaMercadoriaId,
            item.pedido_compra_item_id,
            item.produto_id,
            item.codigo_interno,
            item.descricao,
            item.unidade_sigla,
            item.quantidade_recebida,
            item.valor_unitario,
            item.valor_total_recebido,
          ]
        );

        await this.registrarMovimentoEntrada(client, {
          depositoId,
          entradaMercadoriaId,
          item,
          quantidade: item.quantidade_recebida,
          usuarioId,
          tipoMovimentoId,
        });
      }

      await client.query(
        `
          UPDATE pedido_compra
          SET status = 'recebido'
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND pedido_compra_id = $1
        `,
        [data.pedido_compra_id]
      );

      await client.query("COMMIT");
      return this.buscarPorId(client, entradaMercadoriaId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async buscarPorId(client, entradaMercadoriaId) {
    const entradaResult = await client.query(
      `
        SELECT
          em.*,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj
        FROM entrada_mercadoria em
        JOIN pessoa p ON p.pessoa_id = em.pessoa_id
        WHERE em.tenant_id = ${TENANT_CONTEXT_SQL}
          AND em.excluido = FALSE
          AND em.entrada_mercadoria_id = $1
        LIMIT 1
      `,
      [entradaMercadoriaId]
    );

    const entrada = entradaResult.rows[0];
    if (!entrada) return null;

    const itemsResult = await client.query(
      `
        SELECT
          entrada_mercadoria_item_id,
          pedido_compra_item_id,
          produto_id,
          codigo_interno,
          descricao,
          unidade_sigla,
          quantidade,
          valor_unitario,
          valor_total
        FROM entrada_mercadoria_item
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND entrada_mercadoria_id = $1
        ORDER BY entrada_mercadoria_item_id
      `,
      [entradaMercadoriaId]
    );

    return {
      entrada: {
        ...entrada,
        total: Number(entrada.total || 0),
        data_entrada: normalizeDateValue(entrada.data_entrada),
      },
      items: itemsResult.rows.map((item) => ({
        ...item,
        quantidade: Number(item.quantidade || 0),
        valor_unitario: Number(item.valor_unitario || 0),
        valor_total: Number(item.valor_total || 0),
      })),
    };
  }
}

export default EntradaMercadoriaDAO;
