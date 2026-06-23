import crypto from "crypto";
import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

const SORT_COLUMNS = {
  nfe_id: "n.nfe_id",
  criado_em: "n.criado_em",
  chave_acesso: "n.chave_acesso",
  status: "n.status",
  numero: "n.numero",
  pedido_venda_id: "n.pedido_venda_id",
  destinatario_nome: "d.pessoa_nome_razao",
};

const NFE_STATUS = [
  "rascunho",
  "pronta",
  "processando",
  "autorizada",
  "rejeitada",
  "cancelamento_pendente",
  "cancelada",
  "denegada",
  "importada",
  "erro_integracao",
];

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

const parseStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return NFE_STATUS.includes(normalized) ? normalized : null;
};

const buildOrderBy = (sort = {}) => {
  const entries = Object.entries(sort)
    .map(([column, direction]) => {
      if (!SORT_COLUMNS[column]) return null;
      const normalizedDirection = String(direction).toUpperCase() === "DESC" ? "DESC" : "ASC";
      return `${SORT_COLUMNS[column]} ${normalizedDirection}`;
    })
    .filter(Boolean);

  return entries.length ? entries.join(", ") : "n.nfe_id DESC";
};

const detectKeyFromXml = (xmlContent) => {
  const normalized = String(xmlContent || "");
  const byTag = normalized.match(/<chNFe>(\d{44})<\/chNFe>/i);
  if (byTag?.[1]) return byTag[1];

  const byDigits = normalized.match(/\b\d{44}\b/);
  return byDigits?.[0] || null;
};

const sha256 = (value) =>
  crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");

class NfeDAO {
  static async listarPedidosSelect(client, { search = "", limit = 20 } = {}) {
    const values = [];
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 50) : 20;
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE pv.tenant_id = ${TENANT_CONTEXT_SQL}
        AND pv.excluido = FALSE
        AND pv.status <> 'cancelado'
        AND NOT EXISTS (
          SELECT 1
          FROM fiscal.nfe n
          WHERE n.tenant_id = pv.tenant_id
            AND n.pedido_venda_id = pv.pedido_venda_id
            AND n.status NOT IN ('cancelada', 'denegada')
        )
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          CAST(pv.pedido_venda_id AS TEXT) LIKE $${values.length}
          OR LOWER(unaccent(p.pessoa_nome_razao)) LIKE LOWER(unaccent($${values.length}))
          OR LOWER(unaccent(COALESCE(p.pessoa_cpf_cnpj, ''))) LIKE LOWER(unaccent($${values.length}))
        )
      `;
    }

    values.push(safeLimit);

    const { rows } = await client.query(
      `
        SELECT
          pv.pedido_venda_id,
          pv.data_emissao,
          pv.total,
          pv.status,
          p.pessoa_id,
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

  static async listar(client, { page = 1, limit = 20, search = "", status = "", sort = {} }) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const values = [];
    const normalizedSearch = String(search || "").trim();
    const normalizedStatus = parseStatus(status);

    let where = `
      WHERE n.tenant_id = ${TENANT_CONTEXT_SQL}
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          CAST(n.nfe_id AS TEXT) LIKE $${values.length}
          OR CAST(COALESCE(n.numero, 0) AS TEXT) LIKE $${values.length}
          OR LOWER(COALESCE(n.chave_acesso, '')) LIKE LOWER($${values.length})
          OR LOWER(unaccent(COALESCE(d.pessoa_nome_razao, ''))) LIKE LOWER(unaccent($${values.length}))
        )
      `;
    }

    if (normalizedStatus) {
      values.push(normalizedStatus);
      where += ` AND n.status = $${values.length}`;
    }

    const orderBy = buildOrderBy(sort);

    const [listResult, countResult] = await Promise.all([
      client.query(
        `
          SELECT
            n.nfe_id,
            n.pedido_venda_id,
            n.modelo,
            n.serie,
            n.numero,
            n.chave_acesso,
            n.natureza_operacao,
            n.tipo_operacao,
            n.finalidade,
            n.status,
            n.status_sefaz,
            n.ambiente_nfe,
            n.valor_total,
            n.criado_em,
            d.pessoa_nome_razao AS destinatario_nome_razao,
            d.pessoa_cpf_cnpj AS destinatario_cpf_cnpj
          FROM fiscal.nfe n
          LEFT JOIN pessoa d ON d.pessoa_id = n.destinatario_pessoa_id
          ${where}
          ORDER BY ${orderBy}
          LIMIT $${values.length + 1}
          OFFSET $${values.length + 2}
        `,
        [...values, safeLimit, offset]
      ),
      client.query(
        `
          SELECT COUNT(*)::int AS total
          FROM fiscal.nfe n
          LEFT JOIN pessoa d ON d.pessoa_id = n.destinatario_pessoa_id
          ${where}
        `,
        values
      ),
    ]);

    const total = countResult.rows[0]?.total || 0;

    return {
      data: listResult.rows,
      page: safePage,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  static async obterSupportData(client) {
    const { rows } = await client.query(
      `
        SELECT
          t.tenant_id,
          t.tenant_nome,
          t.pessoa_id,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj,
          p.pessoa_inscricao_estadual,
          cfg.nfe_habilitada,
          cfg.ambiente_nfe,
          cfg.serie_nfe_padrao,
          cfg.proximo_numero_nfe,
          cfg.natureza_operacao_padrao,
          cert.nome_arquivo AS certificado_nome_arquivo,
          cert.importado_em AS certificado_importado_em
        FROM tenant t
        LEFT JOIN pessoa p ON p.pessoa_id = t.pessoa_id
        LEFT JOIN tenant_configuracao_fiscal cfg ON cfg.tenant_id = t.tenant_id
        LEFT JOIN tenant_certificado_a1 cert ON cert.tenant_id = t.tenant_id
        WHERE t.tenant_id = ${TENANT_CONTEXT_SQL}
        LIMIT 1
      `
    );

    const data = rows[0] || null;
    if (!data) return null;

    return {
      tenant: {
        tenant_id: data.tenant_id,
        tenant_nome: data.tenant_nome,
      },
      emitente: {
        pessoa_id: data.pessoa_id,
        pessoa_nome_razao: data.pessoa_nome_razao,
        pessoa_cpf_cnpj: data.pessoa_cpf_cnpj,
        pessoa_inscricao_estadual: data.pessoa_inscricao_estadual,
      },
      configuracao: {
        nfe_habilitada: !!data.nfe_habilitada,
        ambiente_nfe: data.ambiente_nfe || "2",
        serie_nfe_padrao: Number(data.serie_nfe_padrao || 1),
        proximo_numero_nfe: Number(data.proximo_numero_nfe || 1),
        natureza_operacao_padrao: data.natureza_operacao_padrao || "",
      },
      certificado: {
        configurado: !!data.certificado_nome_arquivo,
        nome_arquivo: data.certificado_nome_arquivo || "",
        importado_em: data.certificado_importado_em || null,
      },
      pronto_para_emitir: Boolean(
        data.pessoa_id &&
          data.pessoa_cpf_cnpj &&
          data.pessoa_inscricao_estadual &&
          data.nfe_habilitada
      ),
    };
  }

  static async buscarPorId(client, nfeId) {
    const safeNfeId = parseInteger(nfeId, { label: "NF-e" });

    const { rows } = await client.query(
      `
        SELECT
          n.*,
          e.pessoa_nome_razao AS emitente_nome_razao,
          e.pessoa_cpf_cnpj AS emitente_cpf_cnpj,
          d.pessoa_nome_razao AS destinatario_nome_razao,
          d.pessoa_cpf_cnpj AS destinatario_cpf_cnpj
        FROM fiscal.nfe n
        LEFT JOIN pessoa e ON e.pessoa_id = n.emitente_pessoa_id
        LEFT JOIN pessoa d ON d.pessoa_id = n.destinatario_pessoa_id
        WHERE n.nfe_id = $1
          AND n.tenant_id = ${TENANT_CONTEXT_SQL}
        LIMIT 1
      `,
      [safeNfeId]
    );

    const data = rows[0];
    if (!data) return null;

    const [itemsResult, impostosResult, eventosResult, xmlsResult] = await Promise.all([
      client.query(
        `
          SELECT *
          FROM fiscal.nfe_item
          WHERE nfe_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
          ORDER BY nfe_item_id
        `,
        [safeNfeId]
      ),
      client.query(
        `
          SELECT *
          FROM fiscal.nfe_item_imposto
          WHERE nfe_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
          ORDER BY nfe_item_id, nfe_item_imposto_id
        `,
        [safeNfeId]
      ),
      client.query(
        `
          SELECT *
          FROM fiscal.nfe_evento
          WHERE nfe_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
          ORDER BY criado_em DESC, nfe_evento_id DESC
        `,
        [safeNfeId]
      ),
      client.query(
        `
          SELECT
            nfe_xml_id,
            tipo_xml,
            chave_acesso,
            hash_sha256,
            criado_em
          FROM fiscal.nfe_xml
          WHERE nfe_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
          ORDER BY criado_em DESC, nfe_xml_id DESC
        `,
        [safeNfeId]
      ),
    ]);

    return {
      ...data,
      items: itemsResult.rows,
      impostos: impostosResult.rows,
      eventos: eventosResult.rows,
      xmls: xmlsResult.rows,
    };
  }

  static async buscarConfiguracaoEmitente(client) {
    const { rows } = await client.query(
      `
        SELECT
          t.tenant_id,
          t.tenant_nome,
          t.pessoa_id,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj,
          p.pessoa_inscricao_estadual,
          cfg.nfe_habilitada,
          cfg.ambiente_nfe,
          cfg.serie_nfe_padrao,
          cfg.proximo_numero_nfe,
          cfg.natureza_operacao_padrao,
          cert.nome_arquivo AS certificado_nome_arquivo
        FROM tenant t
        JOIN pessoa p ON p.pessoa_id = t.pessoa_id
        LEFT JOIN tenant_configuracao_fiscal cfg ON cfg.tenant_id = t.tenant_id
        LEFT JOIN tenant_certificado_a1 cert ON cert.tenant_id = t.tenant_id
        WHERE t.tenant_id = ${TENANT_CONTEXT_SQL}
        LIMIT 1
      `
    );

    return rows[0] || null;
  }

  static async buscarPedidoBase(client, pedidoVendaId) {
    const safePedidoVendaId = parseInteger(pedidoVendaId, { label: "Pedido de venda" });

    const { rows } = await client.query(
      `
        SELECT
          pv.pedido_venda_id,
          pv.pessoa_id,
          pv.status,
          pv.data_emissao,
          pv.observacao,
          pv.subtotal,
          pv.desconto,
          pv.acrescimo,
          pv.total,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj,
          p.pessoa_email
        FROM pedido_venda pv
        JOIN pessoa p ON p.pessoa_id = pv.pessoa_id
        WHERE pv.pedido_venda_id = $1
          AND pv.tenant_id = ${TENANT_CONTEXT_SQL}
          AND pv.excluido = FALSE
        LIMIT 1
      `,
      [safePedidoVendaId]
    );

    return rows[0] || null;
  }

  static async buscarPedidoItens(client, pedidoVendaId) {
    const { rows } = await client.query(
      `
        SELECT
          pvi.pedido_venda_item_id,
          pvi.produto_id,
          pvi.codigo_interno,
          pvi.descricao,
          pvi.unidade_sigla,
          pvi.quantidade,
          pvi.valor_unitario,
          pvi.desconto,
          pvi.acrescimo,
          pvi.valor_total,
          pf.ncm,
          pf.cest,
          pf.cfop_venda_interna AS cfop_padrao_venda_dentro_uf,
          pf.cfop_venda_interestadual AS cfop_padrao_venda_fora_uf,
          pf.origem_mercadoria
        FROM pedido_venda_item pvi
        LEFT JOIN produto_fiscal pf ON pf.produto_id = pvi.produto_id
        WHERE pvi.pedido_venda_id = $1
          AND pvi.tenant_id = ${TENANT_CONTEXT_SQL}
        ORDER BY pvi.pedido_venda_item_id
      `,
      [pedidoVendaId]
    );

    return rows;
  }

  static async criarPorPedido(client, { pedidoVendaId, usuarioId, payload = {} }) {
    const safePedidoVendaId = parseInteger(pedidoVendaId, { label: "Pedido de venda" });
    const configuracao = await this.buscarConfiguracaoEmitente(client);

    if (!configuracao?.pessoa_id) {
      throw new Error("A filial não possui pessoa emitente configurada.");
    }

    if (!configuracao?.nfe_habilitada) {
      throw new Error("A emissão de NF-e não está habilitada para esta filial.");
    }

    const pedido = await this.buscarPedidoBase(client, safePedidoVendaId);
    if (!pedido) {
      throw new Error("Pedido de venda não encontrado.");
    }

    if (pedido.status === "cancelado") {
      throw new Error("Não é possível gerar NF-e de um pedido cancelado.");
    }

    const { rows: existingRows } = await client.query(
      `
        SELECT nfe_id, status
        FROM fiscal.nfe
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND pedido_venda_id = $1
          AND status NOT IN ('cancelada', 'denegada')
        LIMIT 1
      `,
      [safePedidoVendaId]
    );

    if (existingRows[0]) {
      throw new Error("Já existe uma NF-e ativa vinculada a este pedido.");
    }

    const items = await this.buscarPedidoItens(client, safePedidoVendaId);
    if (!items.length) {
      throw new Error("O pedido de venda precisa ter itens para gerar NF-e.");
    }

    const naturezaOperacao = normalizeText(
      payload.natureza_operacao || configuracao.natureza_operacao_padrao,
      120,
      {
        required: true,
        label: "Natureza de operação",
      }
    );

    const finalidade = normalizeText(payload.finalidade || "normal", 20, {
      required: true,
      label: "Finalidade",
    });

    const tipoOperacao = normalizeText(payload.tipo_operacao || "saida", 10, {
      required: true,
      label: "Tipo de operação",
    });

    const observacao = normalizeText(payload.observacao || pedido.observacao, null);

    await client.query("BEGIN");

    try {
      const insertNfeResult = await client.query(
        `
          INSERT INTO fiscal.nfe (
            tenant_id,
            pedido_venda_id,
            emitente_pessoa_id,
            destinatario_pessoa_id,
            usuario_id,
            modelo,
            serie,
            numero,
            chave_acesso,
            natureza_operacao,
            tipo_operacao,
            finalidade,
            status,
            ambiente_nfe,
            valor_produtos,
            valor_desconto,
            valor_acrescimo,
            valor_total,
            observacao
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            $4,
            '55',
            $5,
            NULL,
            NULL,
            $6,
            $7,
            $8,
            'rascunho',
            $9,
            $10,
            $11,
            $12,
            $13,
            $14
          )
          RETURNING *
        `,
        [
          safePedidoVendaId,
          configuracao.pessoa_id,
          pedido.pessoa_id,
          usuarioId || null,
          Number(configuracao.serie_nfe_padrao || 1),
          naturezaOperacao,
          tipoOperacao,
          finalidade,
          configuracao.ambiente_nfe || "2",
          pedido.subtotal || 0,
          pedido.desconto || 0,
          pedido.acrescimo || 0,
          pedido.total || 0,
          observacao,
        ]
      );

      const nfe = insertNfeResult.rows[0];

      for (const item of items) {
        const itemResult = await client.query(
          `
            INSERT INTO fiscal.nfe_item (
              tenant_id,
              nfe_id,
              pedido_venda_item_id,
              produto_id,
              codigo_produto,
              descricao,
              ncm,
              cest,
              cfop,
              unidade_comercial,
              quantidade,
              valor_unitario,
              valor_desconto,
              valor_acrescimo,
              valor_total,
              origem_mercadoria
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
              $14,
              $15
            )
            RETURNING nfe_item_id
          `,
          [
            nfe.nfe_id,
            item.pedido_venda_item_id,
            item.produto_id,
            item.codigo_interno || String(item.produto_id),
            item.descricao,
            item.ncm,
            item.cest,
            item.cfop_padrao_venda_dentro_uf || null,
            item.unidade_sigla,
            item.quantidade || 0,
            item.valor_unitario || 0,
            item.desconto || 0,
            item.acrescimo || 0,
            item.valor_total || 0,
            item.origem_mercadoria || "0",
          ]
        );

        await client.query(
          `
            INSERT INTO fiscal.nfe_item_imposto (
              tenant_id,
              nfe_id,
              nfe_item_id
            )
            VALUES (
              ${TENANT_CONTEXT_SQL},
              $1,
              $2
            )
          `,
          [nfe.nfe_id, itemResult.rows[0].nfe_item_id]
        );
      }

      await client.query(
        `
          INSERT INTO fiscal.nfe_evento (
            tenant_id,
            nfe_id,
            usuario_id,
            tipo_evento,
            status,
            mensagem,
            payload_json
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            'criacao_rascunho',
            'sucesso',
            'NF-e criada a partir do pedido de venda.',
            $3::jsonb
          )
        `,
        [nfe.nfe_id, usuarioId || null, JSON.stringify(payload || {})]
      );

      await client.query("COMMIT");
      return this.buscarPorId(client, nfe.nfe_id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async registrarImportacaoXml(client, { payload = {}, usuarioId }) {
    const xmlConteudo = normalizeText(payload.xml_conteudo, null, {
      required: true,
      label: "XML da NF-e",
    });

    const configuracao = await this.buscarConfiguracaoEmitente(client);
    if (!configuracao?.pessoa_id) {
      throw new Error("A filial não possui pessoa emitente configurada.");
    }

    const chaveAcesso = normalizeText(
      payload.chave_acesso || detectKeyFromXml(xmlConteudo),
      44,
      {
      label: "Chave de acesso",
      }
    );

    const naturezaOperacao = normalizeText(payload.natureza_operacao || "XML importado", 120, {
      required: true,
      label: "Natureza de operação",
    });

    await client.query("BEGIN");

    try {
      const nfeResult = await client.query(
        `
          INSERT INTO fiscal.nfe (
            tenant_id,
            pedido_venda_id,
            emitente_pessoa_id,
            destinatario_pessoa_id,
            usuario_id,
            modelo,
            serie,
            numero,
            chave_acesso,
            natureza_operacao,
            tipo_operacao,
            finalidade,
            status,
            ambiente_nfe,
            valor_produtos,
            valor_desconto,
            valor_acrescimo,
            valor_total,
            observacao
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            NULL,
            $1,
            NULL,
            $2,
            '55',
            $3,
            NULL,
            $4,
            $5,
            'entrada',
            'normal',
            'importada',
            $6,
            0,
            0,
            0,
            0,
            $7
          )
          RETURNING nfe_id
        `,
        [
          configuracao.pessoa_id,
          usuarioId || null,
          Number(configuracao.serie_nfe_padrao || 1),
          chaveAcesso,
          naturezaOperacao,
          configuracao.ambiente_nfe || "2",
          normalizeText(payload.observacao, null),
        ]
      );

      const nfeId = nfeResult.rows[0].nfe_id;

      await client.query(
        `
          INSERT INTO fiscal.nfe_xml (
            tenant_id,
            nfe_id,
            tipo_xml,
            chave_acesso,
            conteudo_xml,
            hash_sha256
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            'importado',
            $2,
            $3,
            $4
          )
        `,
        [nfeId, chaveAcesso, xmlConteudo, sha256(xmlConteudo)]
      );

      await client.query(
        `
          INSERT INTO fiscal.nfe_importacao_xml (
            tenant_id,
            nfe_id,
            usuario_id,
            chave_acesso,
            origem,
            conteudo_xml
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
        [nfeId, usuarioId || null, chaveAcesso, normalizeText(payload.origem, 80), xmlConteudo]
      );

      await client.query(
        `
          INSERT INTO fiscal.nfe_evento (
            tenant_id,
            nfe_id,
            usuario_id,
            tipo_evento,
            status,
            mensagem,
            payload_json
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            'importacao_xml',
            'sucesso',
            'XML importado para o schema fiscal.',
            $3::jsonb
          )
        `,
        [nfeId, usuarioId || null, JSON.stringify(payload || {})]
      );

      await client.query("COMMIT");
      return this.buscarPorId(client, nfeId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async registrarEvento(client, { nfeId, usuarioId, tipoEvento, mensagem, payload = {} }) {
    const safeNfeId = parseInteger(nfeId, { label: "NF-e" });
    const nfe = await this.buscarPorId(client, safeNfeId);

    if (!nfe) {
      throw new Error("NF-e não encontrada.");
    }

    await client.query(
      `
        INSERT INTO fiscal.nfe_evento (
          tenant_id,
          nfe_id,
          usuario_id,
          tipo_evento,
          status,
          mensagem,
          payload_json
        )
        VALUES (
          ${TENANT_CONTEXT_SQL},
          $1,
          $2,
          $3,
          'pendente_integracao',
          $4,
          $5::jsonb
        )
      `,
      [
        safeNfeId,
        usuarioId || null,
        tipoEvento,
        mensagem,
        JSON.stringify(payload || {}),
      ]
    );

    return this.buscarPorId(client, safeNfeId);
  }
}

export default NfeDAO;
