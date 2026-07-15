import { TENANT_CONTEXT_SQL } from "../utils/sql.js";
import EstoqueDAO from "./estoqueDAO.js";

const STATUS_CAIXA_VALIDOS = new Set(["aberto", "fechado"]);
const STATUS_VENDA_VALIDOS = new Set(["rascunho", "concluida", "cancelada"]);
const STATUS_NFCE_VALIDOS = new Set([
  "pendente",
  "autorizada",
  "contingencia",
  "cancelada",
  "rejeitada",
]);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toInteger = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
};

const toBooleanFlag = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "sim", "yes", "t"].includes(normalized)) return true;
  if (["false", "0", "nao", "não", "no", "f"].includes(normalized)) return false;
  return fallback;
};

const toText = (value, maxLength = null) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const toEmail = (value, maxLength = 180) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const normalizeCaixaStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return STATUS_CAIXA_VALIDOS.has(normalized) ? normalized : "aberto";
};

const normalizeVendaStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return STATUS_VENDA_VALIDOS.has(normalized) ? normalized : "concluida";
};

const normalizeNfceStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return STATUS_NFCE_VALIDOS.has(normalized) ? normalized : "pendente";
};

class PdvDAO {
  static async ensureTerminal(client, { tenantId, terminalCodigo, terminalNome }) {
    const codigo = toText(terminalCodigo, 40) || "PDV-01";
    const nome = toText(terminalNome, 120) || codigo;
    const { rows } = await client.query(
      `
        INSERT INTO pdv.terminal (
          tenant_id,
          terminal_codigo,
          terminal_nome,
          ativo,
          atualizado_em
        )
        VALUES ($1, $2, $3, TRUE, NOW())
        ON CONFLICT (tenant_id, terminal_codigo) DO UPDATE
        SET
          terminal_nome = EXCLUDED.terminal_nome,
          ativo = TRUE,
          atualizado_em = NOW()
        RETURNING pdv_terminal_id, tenant_id, terminal_codigo, terminal_nome
      `,
      [tenantId, codigo, nome],
    );

    return rows[0];
  }

  static async resolvePessoaId(client, { tenantId, pessoaErpId, documento }) {
    if (toInteger(pessoaErpId)) {
      const byErpId = await client.query(
        `
          SELECT p.pessoa_id
          FROM pessoa p
          JOIN pessoa_tenant pt
            ON pt.pessoa_id = p.pessoa_id
           AND pt.tenant_id = $1
           AND pt.ativo = TRUE
          WHERE p.pessoa_id = $2
          LIMIT 1
        `,
        [tenantId, pessoaErpId],
      );
      if (byErpId.rows[0]?.pessoa_id) return Number(byErpId.rows[0].pessoa_id);
    }

    const digits = String(documento || "").replace(/\D/g, "");
    if (!digits) return null;

    const byDocumento = await client.query(
      `
        SELECT p.pessoa_id
        FROM pessoa p
        JOIN pessoa_tenant pt
          ON pt.pessoa_id = p.pessoa_id
         AND pt.tenant_id = $1
         AND pt.ativo = TRUE
        WHERE REGEXP_REPLACE(COALESCE(p.pessoa_cpf_cnpj, ''), '\\D', '', 'g') = $2
        LIMIT 1
      `,
      [tenantId, digits],
    );

    return byDocumento.rows[0]?.pessoa_id ? Number(byDocumento.rows[0].pessoa_id) : null;
  }

  static async resolveProdutoId(client, { tenantId, produtoErpId, codigoProduto }) {
    if (toInteger(produtoErpId)) {
      const byId = await client.query(
        `
          SELECT produto_id
          FROM produto
          WHERE tenant_id = $1
            AND produto_id = $2
            AND excluido = FALSE
          LIMIT 1
        `,
        [tenantId, produtoErpId],
      );
      if (byId.rows[0]?.produto_id) return Number(byId.rows[0].produto_id);
    }

    const codigo = toText(codigoProduto, 60);
    if (!codigo) return null;

    const byCodigo = await client.query(
      `
        SELECT produto_id
        FROM produto
        WHERE tenant_id = $1
          AND excluido = FALSE
          AND COALESCE(NULLIF(codigo_interno, ''), produto_id::varchar(60)) = $2
        LIMIT 1
      `,
      [tenantId, codigo],
    );

    return byCodigo.rows[0]?.produto_id ? Number(byCodigo.rows[0].produto_id) : null;
  }

  static async upsertCaixa(client, { tenantId, terminal, payload = {} }) {
    const caixaLocalId = toInteger(payload.caixa_id);
    const sessaoCodigo =
      toText(payload.sessao_codigo, 80) ||
      `PDV-${tenantId}-${terminal.terminal_codigo}-${caixaLocalId || Date.now()}`;

    const { rows } = await client.query(
      `
        INSERT INTO pdv.caixa (
          tenant_id,
          pdv_terminal_id,
          caixa_local_id,
          sessao_codigo,
          operador_local_id,
          operador_nome,
          status,
          valor_abertura,
          valor_fechamento,
          diferenca_fechamento,
          observacao_abertura,
          observacao_fechamento,
          aberto_em,
          fechado_em,
          payload_json,
          atualizado_em
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15::jsonb, NOW()
        )
        ON CONFLICT (tenant_id, sessao_codigo) DO UPDATE
        SET
          pdv_terminal_id = EXCLUDED.pdv_terminal_id,
          caixa_local_id = COALESCE(EXCLUDED.caixa_local_id, pdv.caixa.caixa_local_id),
          operador_local_id = COALESCE(EXCLUDED.operador_local_id, pdv.caixa.operador_local_id),
          operador_nome = COALESCE(EXCLUDED.operador_nome, pdv.caixa.operador_nome),
          status = EXCLUDED.status,
          valor_abertura = COALESCE(EXCLUDED.valor_abertura, pdv.caixa.valor_abertura),
          valor_fechamento = COALESCE(EXCLUDED.valor_fechamento, pdv.caixa.valor_fechamento),
          diferenca_fechamento = COALESCE(EXCLUDED.diferenca_fechamento, pdv.caixa.diferenca_fechamento),
          observacao_abertura = COALESCE(EXCLUDED.observacao_abertura, pdv.caixa.observacao_abertura),
          observacao_fechamento = COALESCE(EXCLUDED.observacao_fechamento, pdv.caixa.observacao_fechamento),
          aberto_em = COALESCE(EXCLUDED.aberto_em, pdv.caixa.aberto_em),
          fechado_em = COALESCE(EXCLUDED.fechado_em, pdv.caixa.fechado_em),
          payload_json = EXCLUDED.payload_json,
          atualizado_em = NOW()
        RETURNING pdv_caixa_id, tenant_id, sessao_codigo, caixa_local_id
      `,
      [
        tenantId,
        terminal.pdv_terminal_id,
        caixaLocalId,
        sessaoCodigo,
        toInteger(payload.operador_id),
        toText(payload.operador_nome, 150),
        normalizeCaixaStatus(payload.status),
        toNumber(payload.valor_abertura, 0),
        payload.valor_fechamento == null ? null : toNumber(payload.valor_fechamento, 0),
        payload.diferenca_fechamento == null ? null : toNumber(payload.diferenca_fechamento, 0),
        toText(payload.observacao_abertura),
        toText(payload.observacao_fechamento),
        payload.aberto_em || null,
        payload.fechado_em || null,
        JSON.stringify(payload || {}),
      ],
    );

    return rows[0];
  }

  static async obterCaixaPorLocalId(client, { tenantId, caixaLocalId }) {
    if (!toInteger(caixaLocalId)) return null;

    const { rows } = await client.query(
      `
        SELECT
          c.pdv_caixa_id,
          c.tenant_id,
          c.sessao_codigo,
          c.caixa_local_id,
          t.pdv_terminal_id,
          t.terminal_codigo,
          t.terminal_nome
        FROM pdv.caixa c
        JOIN pdv.terminal t ON t.pdv_terminal_id = c.pdv_terminal_id
        WHERE c.tenant_id = $1
          AND c.caixa_local_id = $2
        ORDER BY c.pdv_caixa_id DESC
        LIMIT 1
      `,
      [tenantId, caixaLocalId],
    );

    return rows[0] || null;
  }

  static async upsertCaixaMovimento(client, { tenantId, pdvCaixaId, payload = {} }) {
    const { rows } = await client.query(
      `
        INSERT INTO pdv.caixa_movimento (
          tenant_id,
          pdv_caixa_id,
          movimento_local_id,
          operador_local_id,
          operador_nome,
          tipo,
          valor,
          motivo,
          criado_em,
          payload_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
        ON CONFLICT (tenant_id, pdv_caixa_id, movimento_local_id) DO UPDATE
        SET
          operador_local_id = COALESCE(EXCLUDED.operador_local_id, pdv.caixa_movimento.operador_local_id),
          operador_nome = COALESCE(EXCLUDED.operador_nome, pdv.caixa_movimento.operador_nome),
          tipo = EXCLUDED.tipo,
          valor = EXCLUDED.valor,
          motivo = EXCLUDED.motivo,
          criado_em = COALESCE(EXCLUDED.criado_em, pdv.caixa_movimento.criado_em),
          payload_json = EXCLUDED.payload_json,
          sincronizado_em = NOW()
        RETURNING pdv_caixa_movimento_id
      `,
      [
        tenantId,
        pdvCaixaId,
        toInteger(payload.movimento_id),
        toInteger(payload.operador_id),
        toText(payload.operador_nome, 150),
        toText(payload.tipo, 20) || "movimento",
        toNumber(payload.valor, 0),
        toText(payload.motivo),
        payload.criado_em || null,
        JSON.stringify(payload || {}),
      ],
    );

    return rows[0] || null;
  }

  static async upsertVenda(client, { tenantId, terminal, caixa = null, payload = {} }) {
    const pessoaId = await this.resolvePessoaId(client, {
      tenantId,
      pessoaErpId: payload.pessoa_erp_id,
      documento: payload.cliente_documento,
    });

    const { rows } = await client.query(
      `
        INSERT INTO pdv.venda (
          tenant_id,
          pdv_terminal_id,
          pdv_caixa_id,
          venda_local_id,
          sessao_codigo,
          pessoa_id,
          cliente_tipo_documento,
          cliente_documento,
          cliente_nome,
          cliente_email,
          status,
          total_produtos,
          total_desconto,
          total_liquido,
          nfce_status,
          nfce_numero,
          nfce_serie,
          nfce_chave_acesso,
          criada_em,
          concluida_em,
          cancelada_em,
          cancelamento_motivo,
          payload_json,
          atualizado_em
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23::jsonb, NOW()
        )
        ON CONFLICT (tenant_id, venda_local_id) DO UPDATE
        SET
          pdv_terminal_id = EXCLUDED.pdv_terminal_id,
          pdv_caixa_id = COALESCE(EXCLUDED.pdv_caixa_id, pdv.venda.pdv_caixa_id),
          sessao_codigo = COALESCE(EXCLUDED.sessao_codigo, pdv.venda.sessao_codigo),
          pessoa_id = COALESCE(EXCLUDED.pessoa_id, pdv.venda.pessoa_id),
          cliente_tipo_documento = EXCLUDED.cliente_tipo_documento,
          cliente_documento = EXCLUDED.cliente_documento,
          cliente_nome = EXCLUDED.cliente_nome,
          cliente_email = EXCLUDED.cliente_email,
          status = EXCLUDED.status,
          total_produtos = EXCLUDED.total_produtos,
          total_desconto = EXCLUDED.total_desconto,
          total_liquido = EXCLUDED.total_liquido,
          nfce_status = EXCLUDED.nfce_status,
          nfce_numero = COALESCE(EXCLUDED.nfce_numero, pdv.venda.nfce_numero),
          nfce_serie = COALESCE(EXCLUDED.nfce_serie, pdv.venda.nfce_serie),
          nfce_chave_acesso = COALESCE(EXCLUDED.nfce_chave_acesso, pdv.venda.nfce_chave_acesso),
          criada_em = COALESCE(EXCLUDED.criada_em, pdv.venda.criada_em),
          concluida_em = COALESCE(EXCLUDED.concluida_em, pdv.venda.concluida_em),
          cancelada_em = COALESCE(EXCLUDED.cancelada_em, pdv.venda.cancelada_em),
          cancelamento_motivo = COALESCE(EXCLUDED.cancelamento_motivo, pdv.venda.cancelamento_motivo),
          payload_json = EXCLUDED.payload_json,
          atualizado_em = NOW()
        RETURNING
          pdv_venda_id,
          tenant_id,
          venda_local_id,
          status,
          estoque_aplicado,
          estoque_estornado
      `,
      [
        tenantId,
        terminal.pdv_terminal_id,
        caixa?.pdv_caixa_id || null,
        toInteger(payload.venda_id),
        toText(payload.sessao_codigo, 80) || caixa?.sessao_codigo || null,
        pessoaId,
        toText(payload.cliente_tipo_documento, 20),
        toText(payload.cliente_documento, 30),
        toText(payload.cliente_nome, 180),
        toEmail(payload.cliente_email, 180),
        normalizeVendaStatus(payload.status),
        toNumber(payload.total_produtos, 0),
        toNumber(payload.total_desconto, 0),
        toNumber(payload.total_liquido, 0),
        normalizeNfceStatus(payload.nfce_status),
        toInteger(payload.nfce_numero),
        toInteger(payload.nfce_serie),
        toText(payload.chave_acesso || payload.nfce_chave_acesso, 80),
        payload.criada_em || null,
        payload.concluida_em || null,
        payload.cancelada_em || null,
        toText(payload.cancelamento_motivo),
        JSON.stringify(payload || {}),
      ],
    );

    return rows[0];
  }

  static async replaceVendaItens(client, { tenantId, pdvVendaId, itens = [] }) {
    await client.query(`DELETE FROM pdv.venda_item WHERE tenant_id = $1 AND pdv_venda_id = $2`, [
      tenantId,
      pdvVendaId,
    ]);

    for (const item of itens) {
      const produtoId = await this.resolveProdutoId(client, {
        tenantId,
        produtoErpId: item.produto_erp_id,
        codigoProduto: item.codigo_produto,
      });

      await client.query(
        `
          INSERT INTO pdv.venda_item (
            tenant_id,
            pdv_venda_id,
            venda_item_local_id,
            produto_id,
            produto_erp_id,
            codigo_produto,
            descricao,
            unidade,
            quantidade,
            valor_unitario,
            valor_total,
            payload_json
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb
          )
        `,
        [
          tenantId,
          pdvVendaId,
          toInteger(item.venda_item_id),
          produtoId,
          toInteger(item.produto_erp_id),
          toText(item.codigo_produto, 60),
          toText(item.descricao, 180) || "ITEM PDV",
          toText(item.unidade, 20),
          toNumber(item.quantidade, 0),
          toNumber(item.valor_unitario, 0),
          toNumber(item.valor_total, 0),
          JSON.stringify(item || {}),
        ],
      );
    }
  }

  static async replaceVendaPagamentos(client, { tenantId, pdvVendaId, pagamentos = [] }) {
    await client.query(
      `DELETE FROM pdv.venda_pagamento WHERE tenant_id = $1 AND pdv_venda_id = $2`,
      [tenantId, pdvVendaId],
    );

    for (const pagamento of pagamentos) {
      await client.query(
        `
          INSERT INTO pdv.venda_pagamento (
            tenant_id,
            pdv_venda_id,
            pagamento_local_id,
            forma,
            valor,
            autorizado,
            criado_em,
            payload_json
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        `,
        [
          tenantId,
          pdvVendaId,
          toInteger(pagamento.pagamento_id),
          toText(pagamento.forma, 40) || "dinheiro",
          toNumber(pagamento.valor, 0),
          toBooleanFlag(pagamento.autorizado, false),
          pagamento.criado_em || null,
          JSON.stringify(pagamento || {}),
        ],
      );
    }
  }

  static async obterTipoMovimentoId(client, codigo) {
    const { rows } = await client.query(
      `
        SELECT estoque_tipo_movimento_id
        FROM estoque_tipo_movimento
        WHERE codigo = $1
        LIMIT 1
      `,
      [codigo],
    );

    return rows[0]?.estoque_tipo_movimento_id ? Number(rows[0].estoque_tipo_movimento_id) : null;
  }

  static async aplicarEstoqueVenda(client, { tenantId, pdvVendaId, tipoCodigo, fator = -1 }) {
    const depositoId = await EstoqueDAO.obterDepositoPadrao(client);
    const tipoMovimentoId = await this.obterTipoMovimentoId(client, tipoCodigo);
    const { rows } = await client.query(
      `
        SELECT
          vi.produto_id,
          vi.quantidade,
          vi.valor_unitario
        FROM pdv.venda_item vi
        WHERE vi.tenant_id = $1
          AND vi.pdv_venda_id = $2
          AND vi.produto_id IS NOT NULL
      `,
      [tenantId, pdvVendaId],
    );

    for (const item of rows) {
      const quantidadeBase = toNumber(item.quantidade, 0);
      if (!quantidadeBase) continue;

      const quantidade = Number((quantidadeBase * fator).toFixed(4));
      const estoqueAtualResult = await client.query(
        `
          SELECT produto_estoque_id, estoque_atual
          FROM produto_estoque
          WHERE tenant_id = $1
            AND deposito_id = $2
            AND produto_id = $3
          LIMIT 1
        `,
        [tenantId, depositoId, item.produto_id],
      );

      let produtoEstoqueId = estoqueAtualResult.rows[0]?.produto_estoque_id
        ? Number(estoqueAtualResult.rows[0].produto_estoque_id)
        : null;
      let saldoAnterior = toNumber(estoqueAtualResult.rows[0]?.estoque_atual, 0);

      if (!produtoEstoqueId) {
        const created = await client.query(
          `
            INSERT INTO produto_estoque (
              tenant_id,
              produto_id,
              deposito_id,
              estoque_atual,
              estoque_reservado,
              estoque_minimo,
              atualizado_em
            )
            VALUES ($1, $2, $3, 0, 0, 0, NOW())
            RETURNING produto_estoque_id
          `,
          [tenantId, item.produto_id, depositoId],
        );
        produtoEstoqueId = Number(created.rows[0].produto_estoque_id);
        saldoAnterior = 0;
      }

      const saldoPosterior = Number((saldoAnterior + quantidade).toFixed(4));

      await client.query(
        `
          UPDATE produto_estoque
          SET estoque_atual = $4,
              atualizado_em = NOW()
          WHERE tenant_id = $1
            AND produto_estoque_id = $2
            AND produto_id = $3
        `,
        [tenantId, produtoEstoqueId, item.produto_id, saldoPosterior],
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
            observacao,
            data_movimento
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, 'pdv', 'pdv_venda', $8, $9, $10, $11, NOW()
          )
        `,
        [
          tenantId,
          item.produto_id,
          depositoId,
          tipoMovimentoId,
          quantidade < 0 ? "saida" : "entrada",
          quantidade,
          toNumber(item.valor_unitario, 0),
          pdvVendaId,
          saldoAnterior,
          saldoPosterior,
          tipoCodigo === "pdv_venda_saida"
            ? "Saída automática pela venda no PDV."
            : "Estorno automático por cancelamento de venda no PDV.",
        ],
      );
    }
  }

  static async marcarControleEstoque(client, { pdvVendaId, aplicado = null, estornado = null }) {
    await client.query(
      `
        UPDATE pdv.venda
        SET
          estoque_aplicado = COALESCE($2, estoque_aplicado),
          estoque_estornado = COALESCE($3, estoque_estornado),
          atualizado_em = NOW()
        WHERE pdv_venda_id = $1
      `,
      [pdvVendaId, aplicado, estornado],
    );
  }

  static async atualizarStatusNfce(client, { tenantId, vendaLocalId, payload = {} }) {
    await client.query(
      `
        UPDATE pdv.venda
        SET
          nfce_status = $3,
          nfce_numero = COALESCE($4, nfce_numero),
          nfce_serie = COALESCE($5, nfce_serie),
          nfce_chave_acesso = COALESCE($6, nfce_chave_acesso),
          payload_json = payload_json || $7::jsonb,
          atualizado_em = NOW()
        WHERE tenant_id = $1
          AND venda_local_id = $2
      `,
      [
        tenantId,
        toInteger(vendaLocalId),
        normalizeNfceStatus(payload.status),
        toInteger(payload.numero),
        toInteger(payload.serie),
        toText(payload.chave_acesso, 80),
        JSON.stringify({ nfce: payload || {} }),
      ],
    );
  }

  static async listarVendas(client, { page = 1, limit = 20, search = "", status = "" }) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const values = [];
    let where = `WHERE v.tenant_id = ${TENANT_CONTEXT_SQL}`;

    if (status) {
      values.push(String(status).trim().toLowerCase());
      where += ` AND v.status = $${values.length}`;
    }

    if (String(search || "").trim()) {
      values.push(`%${String(search).trim().toLowerCase()}%`);
      where += `
        AND (
          CAST(v.venda_local_id AS TEXT) LIKE $${values.length}
          OR LOWER(COALESCE(v.cliente_nome, '')) LIKE $${values.length}
          OR LOWER(COALESCE(v.cliente_documento, '')) LIKE $${values.length}
          OR LOWER(COALESCE(t.terminal_nome, '')) LIKE $${values.length}
          OR CAST(v.total_liquido AS TEXT) LIKE $${values.length}
        )
      `;
    }

    const listSql = `
      SELECT
        v.pdv_venda_id,
        v.venda_local_id,
        v.status,
        v.total_produtos,
        v.total_desconto,
        v.total_liquido,
        v.nfce_status,
        v.nfce_numero,
        v.nfce_serie,
        v.cliente_tipo_documento,
        v.cliente_documento,
        v.cliente_nome,
        v.cliente_email,
        v.criada_em,
        v.concluida_em,
        v.cancelada_em,
        v.cancelamento_motivo,
        t.terminal_codigo,
        t.terminal_nome,
        c.sessao_codigo,
        c.operador_nome
      FROM pdv.venda v
      JOIN pdv.terminal t ON t.pdv_terminal_id = v.pdv_terminal_id
      LEFT JOIN pdv.caixa c ON c.pdv_caixa_id = v.pdv_caixa_id
      ${where}
      ORDER BY COALESCE(v.concluida_em, v.criada_em, v.criado_em) DESC, v.pdv_venda_id DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM pdv.venda v
      JOIN pdv.terminal t ON t.pdv_terminal_id = v.pdv_terminal_id
      LEFT JOIN pdv.caixa c ON c.pdv_caixa_id = v.pdv_caixa_id
      ${where}
    `;

    const [listResult, countResult] = await Promise.all([
      client.query(listSql, [...values, safeLimit, offset]),
      client.query(countSql, values),
    ]);

    const total = Number(countResult.rows[0]?.total || 0);
    return {
      data: listResult.rows,
      page: safePage,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  static async obterVenda(client, pdvVendaId) {
    const vendaResult = await client.query(
      `
        SELECT
          v.*,
          t.terminal_codigo,
          t.terminal_nome,
          c.sessao_codigo,
          c.operador_nome,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj
        FROM pdv.venda v
        JOIN pdv.terminal t ON t.pdv_terminal_id = v.pdv_terminal_id
        LEFT JOIN pdv.caixa c ON c.pdv_caixa_id = v.pdv_caixa_id
        LEFT JOIN pessoa p ON p.pessoa_id = v.pessoa_id
        WHERE v.tenant_id = ${TENANT_CONTEXT_SQL}
          AND v.pdv_venda_id = $1
        LIMIT 1
      `,
      [pdvVendaId],
    );

    const venda = vendaResult.rows[0] || null;
    if (!venda) return null;

    const [itensResult, pagamentosResult] = await Promise.all([
      client.query(
        `
          SELECT *
          FROM pdv.venda_item
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND pdv_venda_id = $1
          ORDER BY venda_item_local_id ASC
        `,
        [pdvVendaId],
      ),
      client.query(
        `
          SELECT *
          FROM pdv.venda_pagamento
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND pdv_venda_id = $1
          ORDER BY pagamento_local_id ASC
        `,
        [pdvVendaId],
      ),
    ]);

    return {
      ...venda,
      itens: itensResult.rows,
      pagamentos: pagamentosResult.rows,
    };
  }

  static async listarCaixas(client, { page = 1, limit = 20, search = "", status = "" }) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const values = [];
    let where = `WHERE c.tenant_id = ${TENANT_CONTEXT_SQL}`;

    if (status) {
      values.push(String(status).trim().toLowerCase());
      where += ` AND c.status = $${values.length}`;
    }

    if (String(search || "").trim()) {
      values.push(`%${String(search).trim().toLowerCase()}%`);
      where += `
        AND (
          LOWER(COALESCE(t.terminal_codigo, '')) LIKE $${values.length}
          OR LOWER(COALESCE(t.terminal_nome, '')) LIKE $${values.length}
          OR LOWER(COALESCE(c.operador_nome, '')) LIKE $${values.length}
          OR LOWER(COALESCE(c.sessao_codigo, '')) LIKE $${values.length}
        )
      `;
    }

    const listSql = `
      SELECT
        c.pdv_caixa_id,
        c.caixa_local_id,
        c.sessao_codigo,
        c.status,
        c.valor_abertura,
        c.valor_fechamento,
        c.diferenca_fechamento,
        c.operador_nome,
        c.aberto_em,
        c.fechado_em,
        t.terminal_codigo,
        t.terminal_nome,
        COALESCE(v.total_vendido, 0) AS total_vendido,
        COALESCE(v.total_cancelado, 0) AS total_cancelado,
        COALESCE(v.quantidade_vendas, 0) AS quantidade_vendas,
        COALESCE(v.quantidade_canceladas, 0) AS quantidade_canceladas,
        COALESCE(m.total_sangria, 0) AS total_sangria,
        COALESCE(m.total_suprimento, 0) AS total_suprimento
      FROM pdv.caixa c
      JOIN pdv.terminal t ON t.pdv_terminal_id = c.pdv_terminal_id
      LEFT JOIN LATERAL (
        SELECT
          SUM(CASE WHEN status = 'concluida' THEN total_liquido ELSE 0 END) AS total_vendido,
          SUM(CASE WHEN status = 'cancelada' THEN total_liquido ELSE 0 END) AS total_cancelado,
          SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) AS quantidade_vendas,
          SUM(CASE WHEN status = 'cancelada' THEN 1 ELSE 0 END) AS quantidade_canceladas
        FROM pdv.venda
        WHERE pdv_caixa_id = c.pdv_caixa_id
      ) v ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          SUM(CASE WHEN tipo = 'sangria' THEN valor ELSE 0 END) AS total_sangria,
          SUM(CASE WHEN tipo = 'suprimento' THEN valor ELSE 0 END) AS total_suprimento
        FROM pdv.caixa_movimento
        WHERE pdv_caixa_id = c.pdv_caixa_id
      ) m ON TRUE
      ${where}
      ORDER BY COALESCE(c.aberto_em, c.criado_em) DESC, c.pdv_caixa_id DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM pdv.caixa c
      JOIN pdv.terminal t ON t.pdv_terminal_id = c.pdv_terminal_id
      ${where}
    `;

    const [listResult, countResult] = await Promise.all([
      client.query(listSql, [...values, safeLimit, offset]),
      client.query(countSql, values),
    ]);

    const total = Number(countResult.rows[0]?.total || 0);
    return {
      data: listResult.rows,
      page: safePage,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  static async obterCaixa(client, pdvCaixaId) {
    const caixaResult = await client.query(
      `
        SELECT
          c.*,
          t.terminal_codigo,
          t.terminal_nome
        FROM pdv.caixa c
        JOIN pdv.terminal t ON t.pdv_terminal_id = c.pdv_terminal_id
        WHERE c.tenant_id = ${TENANT_CONTEXT_SQL}
          AND c.pdv_caixa_id = $1
        LIMIT 1
      `,
      [pdvCaixaId],
    );

    const caixa = caixaResult.rows[0] || null;
    if (!caixa) return null;

    const [movimentosResult, vendasResult] = await Promise.all([
      client.query(
        `
          SELECT *
          FROM pdv.caixa_movimento
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND pdv_caixa_id = $1
          ORDER BY criado_em ASC, pdv_caixa_movimento_id ASC
        `,
        [pdvCaixaId],
      ),
      client.query(
        `
          SELECT
            pdv_venda_id,
            venda_local_id,
            status,
            total_liquido,
            cliente_nome,
            concluida_em,
            cancelada_em
          FROM pdv.venda
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND pdv_caixa_id = $1
          ORDER BY COALESCE(concluida_em, criada_em, criado_em) DESC, pdv_venda_id DESC
        `,
        [pdvCaixaId],
      ),
    ]);

    return {
      ...caixa,
      movimentos: movimentosResult.rows,
      vendas: vendasResult.rows,
    };
  }
}

export default PdvDAO;
