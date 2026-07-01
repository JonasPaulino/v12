import EstoqueDAO from "./estoqueDAO.js";
import CompraDAO from "./compraDAO.js";
import { TENANT_CONTEXT_SQL } from "../utils/sql.js";
import { consultarXmlNfePorChaveAcbr } from "../utils/acbrSetup.js";

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

const normalizeDigits = (value) => String(value || "").replace(/\D/g, "");
const normalizeAccessKey = (value) => normalizeDigits(value).slice(0, 44);

const decodeXmlEntities = (value) =>
  String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const getTagValue = (xml, tag) => {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const match = String(xml || "").match(regex);
  return match ? decodeXmlEntities(match[1].trim()) : "";
};

const getFirstBlock = (xml, tag) => {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?</${tag}>`, "i");
  const match = String(xml || "").match(regex);
  return match ? match[0] : "";
};

const getAllBlocks = (xml, tag) => {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?</${tag}>`, "gi");
  return [...String(xml || "").matchAll(regex)].map((match) => match[0]);
};

const parseXmlNumber = (value) => {
  const parsed = Number(String(value || "0").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeNfeDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return normalizeDateValue(raw);
};

const parseNfeXml = (xmlContent) => {
  const xml = String(xmlContent || "").trim();
  if (!xml) throw new Error("XML não informado.");

  const infNfeMatch = xml.match(/<infNFe\b[^>]*\bId="NFe(\d{44})"[^>]*>/i);
  const chaveAcesso = infNfeMatch?.[1] || normalizeDigits(getTagValue(xml, "chNFe"));
  const ide = getFirstBlock(xml, "ide");
  const emit = getFirstBlock(xml, "emit");
  const dest = getFirstBlock(xml, "dest");
  const total = getFirstBlock(xml, "ICMSTot");
  const detBlocks = getAllBlocks(xml, "det");

  if (!emit || !detBlocks.length) {
    throw new Error("XML de NF-e inválido ou sem itens.");
  }

  const emitenteDocumento = normalizeDigits(getTagValue(emit, "CNPJ") || getTagValue(emit, "CPF"));
  const emitenteNome = getTagValue(emit, "xNome");
  const destinatarioDocumento = normalizeDigits(
    getTagValue(dest, "CNPJ") || getTagValue(dest, "CPF")
  );
  const destinatarioNome = getTagValue(dest, "xNome");
  const enderEmit = getFirstBlock(emit, "enderEmit");

  if (!emitenteDocumento) {
    throw new Error("Não foi possível identificar o fornecedor no XML.");
  }

  const items = detBlocks.map((detBlock, index) => {
    const prod = getFirstBlock(detBlock, "prod");
    const cProd = getTagValue(prod, "cProd");
    const quantidade = parseXmlNumber(getTagValue(prod, "qCom"));

    if (!cProd || quantidade <= 0) {
      throw new Error(`Item ${index + 1} do XML está sem código ou quantidade válida.`);
    }

    return {
      cProd,
      xProd: getTagValue(prod, "xProd"),
      ncm: getTagValue(prod, "NCM"),
      unidade: getTagValue(prod, "uCom"),
      quantidade,
      valor_unitario: parseXmlNumber(getTagValue(prod, "vUnCom")),
      valor_total: parseXmlNumber(getTagValue(prod, "vProd")),
    };
  });

  return {
    chave_acesso: chaveAcesso || null,
    numero_nfe: getTagValue(ide, "nNF") || null,
    serie_nfe: getTagValue(ide, "serie") || null,
    data_emissao_nfe: normalizeNfeDate(getTagValue(ide, "dhEmi") || getTagValue(ide, "dEmi")),
    valor_xml: parseXmlNumber(getTagValue(total, "vNF")),
    emitente: {
      documento: emitenteDocumento,
      nome: emitenteNome,
      fantasia: getTagValue(emit, "xFant"),
      inscricao_estadual: getTagValue(emit, "IE"),
      telefone: normalizeDigits(getTagValue(enderEmit, "fone")),
      endereco: {
        cep: normalizeDigits(getTagValue(enderEmit, "CEP")),
        logradouro: getTagValue(enderEmit, "xLgr"),
        numero: getTagValue(enderEmit, "nro"),
        complemento: getTagValue(enderEmit, "xCpl"),
        bairro: getTagValue(enderEmit, "xBairro"),
        cidade: getTagValue(enderEmit, "xMun"),
        uf: getTagValue(enderEmit, "UF"),
        codigo_ibge: getTagValue(enderEmit, "cMun"),
        pais: getTagValue(enderEmit, "xPais") || "Brasil",
      },
    },
    destinatario: {
      documento: destinatarioDocumento,
      nome: destinatarioNome,
    },
    items,
  };
};

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
  static async listar(client, { page = 1, limit = 20, search = "", sort = {}, onlyNfe = false }) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const values = [];
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE em.tenant_id = ${TENANT_CONTEXT_SQL}
        AND em.excluido = FALSE
    `;

    if (onlyNfe) {
      where += `
        AND (
          NULLIF(em.chave_acesso, '') IS NOT NULL
          OR NULLIF(em.numero_nfe, '') IS NOT NULL
          OR EXISTS (
            SELECT 1
            FROM entrada_xml_importado exi
            WHERE exi.tenant_id = em.tenant_id
              AND exi.entrada_mercadoria_id = em.entrada_mercadoria_id
          )
        )
      `;
    }

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          CAST(em.entrada_mercadoria_id AS TEXT) LIKE $${values.length}
          OR CAST(em.pedido_compra_id AS TEXT) LIKE $${values.length}
          OR LOWER(COALESCE(em.numero_nfe, '')) LIKE LOWER($${values.length})
          OR LOWER(COALESCE(em.chave_acesso, '')) LIKE LOWER($${values.length})
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
        em.chave_acesso,
        em.numero_nfe,
        em.serie_nfe,
        em.data_entrada,
        em.status,
        em.manifestacao_tipo,
        em.manifestacao_status,
        em.manifestacao_protocolo,
        em.manifestacao_em,
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
        em.chave_acesso,
        em.numero_nfe,
        em.serie_nfe,
        em.data_entrada,
        em.status,
        em.manifestacao_tipo,
        em.manifestacao_status,
        em.manifestacao_protocolo,
        em.manifestacao_em,
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

  static async listarSolicitacoesXml(client, { search = "", limit = 20 } = {}) {
    const values = [];
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 50) : 20;
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE tenant_id = ${TENANT_CONTEXT_SQL}
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          chave_acesso LIKE $${values.length}
          OR LOWER(COALESCE(xmotivo, '')) LIKE LOWER($${values.length})
          OR LOWER(status) LIKE LOWER($${values.length})
        )
      `;
    }

    values.push(safeLimit);

    const { rows } = await client.query(
      `
        SELECT
          entrada_xml_solicitacao_id,
          chave_acesso,
          status,
          cstat,
          xmotivo,
          xml_disponivel IS NOT NULL AS tem_xml,
          entrada_mercadoria_id,
          solicitado_em,
          consultado_em,
          importado_em,
          atualizado_em
        FROM entrada_xml_solicitacao
        ${where}
        ORDER BY atualizado_em DESC, entrada_xml_solicitacao_id DESC
        LIMIT $${values.length}
      `,
      values
    );

    return rows;
  }

  static mapSolicitacaoStatus(response = {}) {
    if (response.xmlCompleto) return "xml_disponivel";
    if (response.xml) return "resumo_disponivel";

    const cStat = String(response.cStat || "").trim();
    if (cStat === "217") return "erro";
    if (["137", "656"].includes(cStat)) return "aguardando_sefaz";
    if (cStat === "138") return "aguardando_sefaz";
    return cStat ? "aguardando_sefaz" : "erro";
  }

  static normalizeConsultaSefazError(error) {
    const rawMessage = String(error?.message || "");
    const cStat =
      String(error?.cStat || "").trim() ||
      rawMessage.match(/(?:^|[\r\n])\s*(\d{3})\s*(?:[\r\n:-]|$)/)?.[1] ||
      rawMessage.match(/Rejei[cç][aã]o\s+(\d{3})/i)?.[1] ||
      null;

    if (!cStat) return null;

    const xMotivo =
      String(error?.xMotivo || "").trim() ||
      rawMessage.match(/Rejei[cç][aã]o\s*:\s*([^\r\n]+)/i)?.[0]?.trim() ||
      rawMessage.replace(/^\s*\d{3}\s*[-:]?\s*/i, "").trim() ||
      "Retorno da SEFAZ na consulta da chave.";

    const friendlyMessage =
      cStat === "217"
        ? "Rejeição 217: NF-e inexistente para a chave informada. Confira se a chave foi digitada corretamente e se a filial está no mesmo ambiente da nota."
        : xMotivo;

    return {
      cStat,
      xMotivo: friendlyMessage,
      raw: rawMessage,
    };
  }

  static async registrarErroSolicitacaoXml(client, { chave, usuarioId, existente, error }) {
    const sefazError = this.normalizeConsultaSefazError(error);
    if (!sefazError) return null;

    if (existente) {
      const { rows } = await client.query(
        `
          UPDATE entrada_xml_solicitacao
          SET status = 'erro',
              cstat = $2,
              xmotivo = $3,
              resposta_raw = $4,
              usuario_id = COALESCE($5, usuario_id),
              consultado_em = NOW()
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND entrada_xml_solicitacao_id = $1
          RETURNING *
        `,
        [
          existente.entrada_xml_solicitacao_id,
          sefazError.cStat,
          sefazError.xMotivo,
          sefazError.raw,
          usuarioId || null,
        ]
      );

      return rows[0] || null;
    }

    const { rows } = await client.query(
      `
        INSERT INTO entrada_xml_solicitacao (
          tenant_id,
          chave_acesso,
          status,
          cstat,
          xmotivo,
          resposta_raw,
          usuario_id,
          consultado_em
        )
        VALUES (${TENANT_CONTEXT_SQL}, $1, 'erro', $2, $3, $4, $5, NOW())
        ON CONFLICT (tenant_id, chave_acesso)
        DO UPDATE SET
          status = CASE
            WHEN entrada_xml_solicitacao.status = 'importada' THEN entrada_xml_solicitacao.status
            ELSE 'erro'
          END,
          cstat = EXCLUDED.cstat,
          xmotivo = EXCLUDED.xmotivo,
          resposta_raw = EXCLUDED.resposta_raw,
          usuario_id = COALESCE(EXCLUDED.usuario_id, entrada_xml_solicitacao.usuario_id),
          consultado_em = NOW()
        RETURNING *
      `,
      [chave, sefazError.cStat, sefazError.xMotivo, sefazError.raw, usuarioId || null]
    );

    return rows[0] || null;
  }

  static async buscarDocumentoFilial(client) {
    const { rows } = await client.query(
      `
        SELECT tenant_documento
        FROM tenant
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
        LIMIT 1
      `
    );

    return normalizeDigits(rows[0]?.tenant_documento);
  }

  static validarDestinatarioResponse(response = {}, documentoFilial) {
    const xml = String(response.xml || "").trim();
    if (!xml || !documentoFilial) return;

    let xmlData = null;
    try {
      xmlData = parseNfeXml(xml);
    } catch {
      return;
    }

    const destinatarioDocumento = normalizeDigits(xmlData?.destinatario?.documento);
    if (!destinatarioDocumento) return;

    if (destinatarioDocumento !== documentoFilial) {
      throw new Error(
        "A NF-e consultada não pertence à filial ativa. O destinatário da nota é diferente do CNPJ/CPF da filial."
      );
    }
  }

  static isErroDestinatarioDivergente(error) {
    return /não pertence à filial ativa|destinatário da nota é diferente/i.test(
      String(error?.message || "")
    );
  }

  static async removerSolicitacaoXml(client, solicitacaoId) {
    await client.query(
      `
        DELETE FROM entrada_xml_solicitacao
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND entrada_xml_solicitacao_id = $1
          AND entrada_mercadoria_id IS NULL
      `,
      [solicitacaoId]
    );
  }

  static async atualizarSolicitacaoComConsulta(client, solicitacaoId, response = {}) {
    const documentoFilial = await this.buscarDocumentoFilial(client);
    this.validarDestinatarioResponse(response, documentoFilial);

    const status = this.mapSolicitacaoStatus(response);

    const { rows } = await client.query(
      `
        UPDATE entrada_xml_solicitacao
        SET status = $2,
            cstat = $3,
            xmotivo = $4,
            resposta_raw = $5,
            xml_disponivel = CASE WHEN $6::text <> '' THEN $6 ELSE xml_disponivel END,
            consultado_em = NOW()
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND entrada_xml_solicitacao_id = $1
        RETURNING *
      `,
      [
        solicitacaoId,
        status,
        response.cStat || null,
        response.xMotivo || null,
        response.raw || null,
        response.xml || "",
      ]
    );

    return rows[0] || null;
  }

  static async solicitarXmlPorChave(client, { chaveAcesso, usuarioId, token }) {
    const chave = normalizeAccessKey(chaveAcesso);
    if (!/^\d{44}$/.test(chave)) {
      throw new Error("Chave de acesso da NF-e inválida.");
    }

    const localManifestacao = await client.query(
      `
        SELECT xml_completo
        FROM nfe_recebida_distribuicao
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND chave_acesso = $1
          AND xml_completo IS NOT NULL
        LIMIT 1
      `,
      [chave]
    );

    if (localManifestacao.rows[0]?.xml_completo) {
      const { rows } = await client.query(
        `
          INSERT INTO entrada_xml_solicitacao (
            tenant_id,
            chave_acesso,
            status,
            usuario_id,
            xml_disponivel,
            consultado_em
          )
          VALUES (${TENANT_CONTEXT_SQL}, $1, 'xml_disponivel', $2, $3, NOW())
          ON CONFLICT (tenant_id, chave_acesso)
          DO UPDATE SET
            status = CASE
              WHEN entrada_xml_solicitacao.status = 'importada' THEN entrada_xml_solicitacao.status
              ELSE 'xml_disponivel'
            END,
            xml_disponivel = COALESCE(entrada_xml_solicitacao.xml_disponivel, EXCLUDED.xml_disponivel),
            usuario_id = COALESCE($2, entrada_xml_solicitacao.usuario_id),
            consultado_em = NOW()
          RETURNING *
        `,
        [chave, usuarioId || null, localManifestacao.rows[0].xml_completo]
      );

      return rows[0];
    }

    const existenteResult = await client.query(
      `
        SELECT *
        FROM entrada_xml_solicitacao
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND chave_acesso = $1
        LIMIT 1
      `,
      [chave]
    );

    const existente = existenteResult.rows[0] || null;
    if (existente?.status === "importada") return existente;

    try {
      const response = await consultarXmlNfePorChaveAcbr({
        token,
        chaveAcesso: chave,
      });

      const documentoFilial = await this.buscarDocumentoFilial(client);
      this.validarDestinatarioResponse(response, documentoFilial);

      const { rows } = await client.query(
        `
          INSERT INTO entrada_xml_solicitacao (
            tenant_id,
            chave_acesso,
            status,
            usuario_id
          )
          VALUES (${TENANT_CONTEXT_SQL}, $1, 'consultando', $2)
          ON CONFLICT (tenant_id, chave_acesso)
          DO UPDATE SET
            status = CASE
              WHEN entrada_xml_solicitacao.status = 'importada' THEN entrada_xml_solicitacao.status
              ELSE 'consultando'
            END,
            usuario_id = COALESCE($2, entrada_xml_solicitacao.usuario_id)
          RETURNING *
        `,
        [chave, usuarioId || null]
      );

      const solicitacao = rows[0];
      if (solicitacao.status === "importada") return solicitacao;

      return this.atualizarSolicitacaoComConsulta(
        client,
        solicitacao.entrada_xml_solicitacao_id,
        response
      );
    } catch (error) {
      const errorSolicitacao = await this.registrarErroSolicitacaoXml(client, {
        chave,
        usuarioId,
        existente,
        error,
      });

      if (errorSolicitacao) {
        return errorSolicitacao;
      }

      if (!existente) {
        throw error;
      }

      if (this.isErroDestinatarioDivergente(error)) {
        await this.removerSolicitacaoXml(client, existente.entrada_xml_solicitacao_id);
        throw error;
      }

      const { rows: errorRows } = await client.query(
        `
          UPDATE entrada_xml_solicitacao
          SET status = 'erro',
              cstat = NULL,
              xmotivo = $2,
              consultado_em = NOW()
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND entrada_xml_solicitacao_id = $1
          RETURNING *
        `,
        [existente.entrada_xml_solicitacao_id, error.message || "Falha ao consultar chave."]
      );

      return errorRows[0];
    }
  }

  static async consultarSolicitacaoXml(client, { solicitacaoId, token }) {
    const safeSolicitacaoId = parseInteger(solicitacaoId, {
      label: "Solicitação",
    });
    const { rows } = await client.query(
      `
        SELECT *
        FROM entrada_xml_solicitacao
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND entrada_xml_solicitacao_id = $1
        LIMIT 1
      `,
      [safeSolicitacaoId]
    );
    const solicitacao = rows[0];
    if (!solicitacao) throw new Error("Solicitação de XML não encontrada.");
    if (solicitacao.status === "importada") return solicitacao;

    await client.query(
      `
        UPDATE entrada_xml_solicitacao
        SET status = 'consultando'
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND entrada_xml_solicitacao_id = $1
      `,
      [safeSolicitacaoId]
    );

    try {
      const response = await consultarXmlNfePorChaveAcbr({
        token,
        chaveAcesso: solicitacao.chave_acesso,
      });

      return this.atualizarSolicitacaoComConsulta(client, safeSolicitacaoId, response);
    } catch (error) {
      if (this.isErroDestinatarioDivergente(error)) {
        await this.removerSolicitacaoXml(client, safeSolicitacaoId);
        throw error;
      }

      const errorSolicitacao = await this.registrarErroSolicitacaoXml(client, {
        chave: solicitacao.chave_acesso,
        usuarioId: solicitacao.usuario_id,
        existente: solicitacao,
        error,
      });

      if (errorSolicitacao) {
        return errorSolicitacao;
      }

      const { rows: errorRows } = await client.query(
        `
          UPDATE entrada_xml_solicitacao
          SET status = 'erro',
              cstat = NULL,
              xmotivo = $2,
              consultado_em = NOW()
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND entrada_xml_solicitacao_id = $1
          RETURNING *
        `,
        [safeSolicitacaoId, error.message || "Falha ao consultar chave."]
      );

      return errorRows[0];
    }
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

  static async buscarTipoMovimentoPorCodigo(client, codigo) {
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

  static async buscarPessoaPorDocumento(client, documento) {
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
        WHERE p.pessoa_ativo = TRUE
          AND p.pessoa_excluido = FALSE
          AND regexp_replace(COALESCE(p.pessoa_cpf_cnpj, ''), '\\D', '', 'g') = $1
        LIMIT 1
      `,
      [documento]
    );

    return rows[0] || null;
  }

  static async obterOuCriarFornecedorXml(client, emitente = {}) {
    const documento = normalizeDigits(emitente.documento);
    if (!documento) {
      throw new Error("Não foi possível identificar o fornecedor no XML.");
    }

    const pessoaVinculada = await this.buscarPessoaPorDocumento(client, documento);
    if (pessoaVinculada) return pessoaVinculada;

    const pessoaExistenteResult = await client.query(
      `
        SELECT pessoa_id
        FROM pessoa
        WHERE pessoa_excluido = FALSE
          AND regexp_replace(COALESCE(pessoa_cpf_cnpj, ''), '\\D', '', 'g') = $1
        LIMIT 1
      `,
      [documento]
    );

    let pessoaId = pessoaExistenteResult.rows[0]?.pessoa_id || null;
    const endereco = emitente.endereco || {};

    if (!pessoaId) {
      const insertResult = await client.query(
        `
          INSERT INTO pessoa (
            pessoa_tipo,
            pessoa_nome_razao,
            pessoa_nome_fantasia,
            pessoa_cpf_cnpj,
            pessoa_inscricao_estadual,
            pessoa_telefone,
            pessoa_whatsapp,
            pessoa_observacao,
            pessoa_ativo,
            pessoa_excluido
          )
          VALUES (
            'J',
            $1,
            $2,
            $3,
            $4,
            $5,
            $5,
            $6,
            TRUE,
            FALSE
          )
          RETURNING pessoa_id
        `,
        [
          normalizeText(emitente.nome, 180, {
            required: true,
            label: "Razão social do fornecedor",
          }),
          normalizeText(emitente.fantasia, 180),
          documento,
          normalizeText(emitente.inscricao_estadual, 20),
          normalizeText(emitente.telefone, 20),
          "Fornecedor cadastrado automaticamente pela importação de XML de NF-e.",
        ]
      );

      pessoaId = insertResult.rows[0].pessoa_id;
    } else {
      await client.query(
        `
          UPDATE pessoa
          SET pessoa_nome_razao = COALESCE(NULLIF(pessoa_nome_razao, ''), $2),
              pessoa_nome_fantasia = COALESCE(NULLIF(pessoa_nome_fantasia, ''), $3),
              pessoa_inscricao_estadual = COALESCE(NULLIF(pessoa_inscricao_estadual, ''), $4),
              pessoa_telefone = COALESCE(NULLIF(pessoa_telefone, ''), $5),
              pessoa_whatsapp = COALESCE(NULLIF(pessoa_whatsapp, ''), $5),
              pessoa_ativo = TRUE
          WHERE pessoa_id = $1
        `,
        [
          pessoaId,
          normalizeText(emitente.nome, 180),
          normalizeText(emitente.fantasia, 180),
          normalizeText(emitente.inscricao_estadual, 20),
          normalizeText(emitente.telefone, 20),
        ]
      );
    }

    await client.query(
      `
        INSERT INTO pessoa_tenant (pessoa_id, tenant_id, principal, ativo)
        VALUES ($1, ${TENANT_CONTEXT_SQL}, TRUE, TRUE)
        ON CONFLICT (pessoa_id, tenant_id)
        DO UPDATE SET principal = TRUE, ativo = TRUE
      `,
      [pessoaId]
    );

    if (
      [
        endereco.cep,
        endereco.logradouro,
        endereco.numero,
        endereco.complemento,
        endereco.bairro,
        endereco.cidade,
        endereco.uf,
        endereco.codigo_ibge,
      ].some((value) => String(value || "").trim())
    ) {
      await client.query(
        `
          INSERT INTO pessoa_endereco (
            pessoa_id,
            tenant_id,
            endereco_tipo,
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            uf,
            codigo_ibge,
            pais
          )
          VALUES ($1, ${TENANT_CONTEXT_SQL}, 'principal', $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (pessoa_id, tenant_id, endereco_tipo)
          DO UPDATE SET
            cep = EXCLUDED.cep,
            logradouro = EXCLUDED.logradouro,
            numero = EXCLUDED.numero,
            complemento = EXCLUDED.complemento,
            bairro = EXCLUDED.bairro,
            cidade = EXCLUDED.cidade,
            uf = EXCLUDED.uf,
            codigo_ibge = EXCLUDED.codigo_ibge,
            pais = EXCLUDED.pais
        `,
        [
          pessoaId,
          normalizeText(endereco.cep, 9),
          normalizeText(endereco.logradouro, 180),
          normalizeText(endereco.numero, 20),
          normalizeText(endereco.complemento, 120),
          normalizeText(endereco.bairro, 100),
          normalizeText(endereco.cidade, 100),
          normalizeText(endereco.uf, 2),
          normalizeText(endereco.codigo_ibge, 10),
          normalizeText(endereco.pais, 60) || "Brasil",
        ]
      );
    }

    const pessoa = await this.buscarPessoaPorDocumento(client, documento);
    if (!pessoa) {
      throw new Error("Não foi possível vincular o fornecedor do XML à filial ativa.");
    }

    return pessoa;
  }

  static async buscarProdutosPorCodigo(client, codigos = []) {
    const normalizedCodigos = [...new Set(codigos.map((codigo) => String(codigo || "").trim()))]
      .filter(Boolean);

    if (!normalizedCodigos.length) return new Map();

    const { rows } = await client.query(
      `
        SELECT
          p.produto_id,
          COALESCE(NULLIF(p.codigo_interno, ''), p.produto_id::varchar(60)) AS codigo_interno,
          p.descricao,
          p.controla_estoque,
          COALESCE(um.sigla, '') AS unidade_sigla
        FROM produto p
        LEFT JOIN produto_unidade pu ON pu.produto_id = p.produto_id
        LEFT JOIN unidade_medida um ON um.unidade_medida_id = pu.unidade_comercial_id
        WHERE p.tenant_id = ${TENANT_CONTEXT_SQL}
          AND p.ativo = TRUE
          AND p.excluido = FALSE
          AND COALESCE(NULLIF(p.codigo_interno, ''), p.produto_id::varchar(60)) = ANY($1::varchar[])
      `,
      [normalizedCodigos]
    );

    return new Map(rows.map((row) => [String(row.codigo_interno), row]));
  }

  static async buscarCondicaoPagamentoPadrao(client) {
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
          AND tipo IN ('pagar', 'ambos')
        ORDER BY padrao DESC, descricao
        LIMIT 1
      `
    );

    return rows[0]
      ? {
          ...rows[0],
          percentual_entrada: Number(rows[0].percentual_entrada || 0),
        }
      : null;
  }

  static async vincularFinanceiroPedidoEntrada(client, {
    pedidoCompraId,
    entradaMercadoriaId,
    total,
    dataEntrada,
  }) {
    if (!pedidoCompraId || !entradaMercadoriaId) return null;

    const valorOriginal = roundCurrency(total);
    if (valorOriginal <= 0) return null;

    const { rows } = await client.query(
      `
        SELECT
          pc.pedido_compra_id,
          pc.pessoa_id,
          pc.data_emissao AS pedido_data_emissao,
          COALESCE(
            ft.financeiro_titulo_id,
            0
          ) AS financeiro_titulo_id,
          COALESCE(
            ft.financeiro_condicao_pagamento_id,
            pc.financeiro_condicao_pagamento_id
          ) AS financeiro_condicao_pagamento_id,
          ft.data_vencimento AS primeiro_vencimento,
          cp.descricao,
          cp.quantidade_parcelas,
          cp.dias_primeiro_vencimento,
          cp.intervalo_dias,
          cp.percentual_entrada
        FROM pedido_compra pc
        LEFT JOIN financeiro_titulo ft
          ON ft.tenant_id = pc.tenant_id
         AND ft.pedido_compra_id = pc.pedido_compra_id
         AND ft.tipo = 'pagar'
         AND ft.excluido = FALSE
        LEFT JOIN financeiro_condicao_pagamento cp
          ON cp.tenant_id = pc.tenant_id
         AND cp.financeiro_condicao_pagamento_id = COALESCE(
           ft.financeiro_condicao_pagamento_id,
           pc.financeiro_condicao_pagamento_id
         )
        WHERE pc.tenant_id = ${TENANT_CONTEXT_SQL}
          AND pc.pedido_compra_id = $1
        LIMIT 1
      `,
      [pedidoCompraId]
    );

    const data = rows[0];
    if (!data) return null;
    if (!data.financeiro_condicao_pagamento_id) {
      throw new Error("Condição de pagamento do pedido de compra não encontrada.");
    }

    const condicao = {
      financeiro_condicao_pagamento_id: data.financeiro_condicao_pagamento_id,
      quantidade_parcelas: Number(data.quantidade_parcelas || 1),
      dias_primeiro_vencimento: Number(data.dias_primeiro_vencimento || 0),
      intervalo_dias: Number(data.intervalo_dias || 30),
      percentual_entrada: Number(data.percentual_entrada || 0),
    };
    const dataEmissao = normalizeDateValue(dataEntrada) || normalizeDateValue(data.pedido_data_emissao);
    const primeiroVencimento = normalizeDateValue(data.primeiro_vencimento);
    const parcelas = CompraDAO.gerarParcelas({
      total: valorOriginal,
      dataEmissao,
      primeiroVencimento,
      condicao,
    });

    let financeiroTituloId = Number(data.financeiro_titulo_id || 0) || null;

    if (financeiroTituloId) {
      const baixaResult = await client.query(
        `
          SELECT COUNT(*)::int AS total
          FROM financeiro_titulo_baixa
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND financeiro_titulo_id = $1
        `,
        [financeiroTituloId]
      );

      if (Number(baixaResult.rows[0]?.total || 0) > 0) {
        throw new Error(
          "O título financeiro do pedido já possui baixa e não pode ser ajustado pela entrada."
        );
      }

      await client.query(
        `
          UPDATE financeiro_titulo
          SET entrada_mercadoria_id = $2,
              pessoa_id = $3,
              financeiro_condicao_pagamento_id = $4,
              numero_documento = $5,
              descricao = $6,
              status = 'aberto',
              valor_original = $7,
              desconto = 0,
              acrescimo = 0,
              data_emissao = $8,
              data_vencimento = $9,
              observacao = $10
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND financeiro_titulo_id = $1
        `,
        [
          financeiroTituloId,
          entradaMercadoriaId,
          data.pessoa_id,
          condicao.financeiro_condicao_pagamento_id,
          String(pedidoCompraId),
          `Entrada de mercadoria #${entradaMercadoriaId} - Pedido de compra #${pedidoCompraId}`,
          valorOriginal,
          dataEmissao,
          parcelas[0]?.data_vencimento || dataEmissao,
          "Valor ajustado pela quantidade recebida na entrada de mercadoria.",
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
    } else {
      const result = await client.query(
        `
          INSERT INTO financeiro_titulo (
            tenant_id,
            pedido_compra_id,
            entrada_mercadoria_id,
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
            $6,
            'pagar',
            'aberto',
            $7,
            0,
            0,
            $8,
            $9,
            $10,
            FALSE
          )
          RETURNING financeiro_titulo_id
        `,
        [
          pedidoCompraId,
          entradaMercadoriaId,
          data.pessoa_id,
          condicao.financeiro_condicao_pagamento_id,
          String(pedidoCompraId),
          `Entrada de mercadoria #${entradaMercadoriaId} - Pedido de compra #${pedidoCompraId}`,
          valorOriginal,
          dataEmissao,
          parcelas[0]?.data_vencimento || dataEmissao,
          "Valor gerado pela quantidade recebida na entrada de mercadoria.",
        ]
      );

      financeiroTituloId = Number(result.rows[0].financeiro_titulo_id);
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

  static async criarFinanceiroEntradaXml(client, {
    entradaMercadoriaId,
    pessoaId,
    total,
    dataEmissao,
    chaveAcesso,
    numeroNfe,
    serieNfe,
  }) {
    const valorOriginal = roundCurrency(total);
    if (valorOriginal <= 0) return null;

    const condicao = await this.buscarCondicaoPagamentoPadrao(client);
    if (!condicao) {
      throw new Error("Condição de pagamento para contas a pagar não encontrada.");
    }

    const parcelas = CompraDAO.gerarParcelas({
      total: valorOriginal,
      dataEmissao,
      primeiroVencimento: null,
      condicao,
    });

    const numeroDocumento = [serieNfe, numeroNfe].filter(Boolean).join("/") || chaveAcesso || String(entradaMercadoriaId);
    const descricao = numeroNfe
      ? `NF-e recebida ${numeroDocumento}`
      : `Entrada de mercadoria #${entradaMercadoriaId}`;

    const { rows } = await client.query(
      `
        INSERT INTO financeiro_titulo (
          tenant_id,
          entrada_mercadoria_id,
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
          'pagar',
          'aberto',
          $6,
          0,
          0,
          $7,
          $8,
          $9,
          FALSE
        )
        ON CONFLICT (tenant_id, entrada_mercadoria_id)
          WHERE entrada_mercadoria_id IS NOT NULL AND excluido = FALSE
        DO UPDATE SET
          pessoa_id = EXCLUDED.pessoa_id,
          financeiro_condicao_pagamento_id = EXCLUDED.financeiro_condicao_pagamento_id,
          numero_documento = EXCLUDED.numero_documento,
          descricao = EXCLUDED.descricao,
          status = 'aberto',
          valor_original = EXCLUDED.valor_original,
          desconto = 0,
          acrescimo = 0,
          data_emissao = EXCLUDED.data_emissao,
          data_vencimento = EXCLUDED.data_vencimento,
          observacao = EXCLUDED.observacao,
          excluido = FALSE
        RETURNING financeiro_titulo_id
      `,
      [
        entradaMercadoriaId,
        pessoaId,
        condicao.financeiro_condicao_pagamento_id,
        String(numeroDocumento).slice(0, 40),
        descricao.slice(0, 180),
        valorOriginal,
        dataEmissao,
        parcelas[0]?.data_vencimento || dataEmissao,
        chaveAcesso ? `Chave NF-e: ${chaveAcesso}` : null,
      ]
    );

    const financeiroTituloId = rows[0].financeiro_titulo_id;

    await client.query(
      `
        DELETE FROM financeiro_titulo_parcela
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND financeiro_titulo_id = $1
      `,
      [financeiroTituloId]
    );

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
        item.pedido_compra_id
          ? `Entrada vinculada ao pedido de compra #${item.pedido_compra_id}`
          : "Entrada importada por XML de NF-e",
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

      await this.vincularFinanceiroPedidoEntrada(client, {
        pedidoCompraId: data.pedido_compra_id,
        entradaMercadoriaId,
        total,
        dataEntrada: data.data_entrada,
      });

      await client.query("COMMIT");
      return this.buscarPorId(client, entradaMercadoriaId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async importarXml(client, { xmlContent, nomeArquivo, usuarioId }) {
    const xmlData = parseNfeXml(xmlContent);
    const documentoFilial = await this.buscarDocumentoFilial(client);
    const destinatarioDocumento = normalizeDigits(xmlData.destinatario?.documento);

    if (
      documentoFilial &&
      destinatarioDocumento &&
      destinatarioDocumento !== documentoFilial
    ) {
      throw new Error(
        "A NF-e importada não pertence à filial ativa. O destinatário da nota é diferente do CNPJ/CPF da filial."
      );
    }

    if (xmlData.chave_acesso) {
      const entradaExistente = await client.query(
        `
          SELECT 1
          FROM entrada_mercadoria
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND chave_acesso = $1
            AND status <> 'cancelada'
            AND excluido = FALSE
          LIMIT 1
        `,
        [xmlData.chave_acesso]
      );

      if (entradaExistente.rowCount) {
        throw new Error("Este XML já foi importado para a filial ativa.");
      }
    }

    const produtosMap = await this.buscarProdutosPorCodigo(
      client,
      xmlData.items.map((item) => item.cProd)
    );

    const itensSemVinculo = xmlData.items.filter((item) => !produtosMap.get(String(item.cProd)));
    if (itensSemVinculo.length) {
      const codigos = itensSemVinculo.map((item) => item.cProd).join(", ");
      throw new Error(`Produtos do XML sem vínculo pelo código interno: ${codigos}.`);
    }

    const normalizedItems = xmlData.items.map((xmlItem) => {
      const produto = produtosMap.get(String(xmlItem.cProd));

      if (!produto.controla_estoque) {
        throw new Error(`O produto "${produto.descricao}" não controla estoque.`);
      }

      return {
        produto_id: produto.produto_id,
        codigo_interno: produto.codigo_interno,
        descricao: produto.descricao,
        unidade_sigla: produto.unidade_sigla || xmlItem.unidade,
        quantidade_recebida: xmlItem.quantidade,
        valor_unitario: xmlItem.valor_unitario,
        valor_total_recebido: roundCurrency(xmlItem.valor_total),
      };
    });

    const total = roundCurrency(
      xmlData.valor_xml ||
        normalizedItems.reduce((sum, item) => sum + item.valor_total_recebido, 0)
    );
    const depositoId = await EstoqueDAO.obterDepositoPadrao(client);
    const tipoMovimentoId = await this.buscarTipoMovimentoCompra(client);
    const dataEntrada = new Date().toISOString().slice(0, 10);

    await client.query("BEGIN");

    try {
      const pessoa = await this.obterOuCriarFornecedorXml(client, xmlData.emitente);
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
            chave_acesso,
            numero_nfe,
            serie_nfe,
            data_emissao_nfe,
            valor_xml,
            excluido
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            NULL,
            $1,
            $2,
            'conferida',
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            FALSE
          )
          RETURNING entrada_mercadoria_id
        `,
        [
          pessoa.pessoa_id,
          usuarioId || null,
          dataEntrada,
          `Importação XML ${xmlData.chave_acesso || nomeArquivo || ""}`.trim(),
          total,
          xmlData.chave_acesso,
          xmlData.numero_nfe,
          xmlData.serie_nfe,
          xmlData.data_emissao_nfe,
          xmlData.valor_xml || total,
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
              NULL,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8
            )
          `,
          [
            entradaMercadoriaId,
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
          item: {
            ...item,
            pedido_compra_id: null,
          },
          quantidade: item.quantidade_recebida,
          usuarioId,
          tipoMovimentoId,
        });
      }

      await client.query(
        `
          INSERT INTO entrada_xml_importado (
            tenant_id,
            entrada_mercadoria_id,
            chave_acesso,
            nome_arquivo,
            conteudo_xml
          )
          VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3, $4)
        `,
        [
          entradaMercadoriaId,
          xmlData.chave_acesso,
          normalizeText(nomeArquivo, 180) || "nfe.xml",
          String(xmlContent || ""),
        ]
      );

      await this.criarFinanceiroEntradaXml(client, {
        entradaMercadoriaId,
        pessoaId: pessoa.pessoa_id,
        total,
        dataEmissao: xmlData.data_emissao_nfe || dataEntrada,
        chaveAcesso: xmlData.chave_acesso,
        numeroNfe: xmlData.numero_nfe,
        serieNfe: xmlData.serie_nfe,
      });

      await client.query("COMMIT");
      return this.buscarPorId(client, entradaMercadoriaId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async importarSolicitacaoXml(client, { solicitacaoId, usuarioId }) {
    const safeSolicitacaoId = parseInteger(solicitacaoId, {
      label: "Solicitação",
    });
    const { rows } = await client.query(
      `
        SELECT *
        FROM entrada_xml_solicitacao
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND entrada_xml_solicitacao_id = $1
        LIMIT 1
      `,
      [safeSolicitacaoId]
    );
    const solicitacao = rows[0];

    if (!solicitacao) throw new Error("Solicitação de XML não encontrada.");
    if (!solicitacao.xml_disponivel) {
      throw new Error("A solicitação ainda não possui XML disponível para importação.");
    }
    if (solicitacao.entrada_mercadoria_id) {
      throw new Error("Esta solicitação já foi importada.");
    }

    const result = await this.importarXml(client, {
      xmlContent: solicitacao.xml_disponivel,
      nomeArquivo: `${solicitacao.chave_acesso}.xml`,
      usuarioId,
    });

    await client.query(
      `
        UPDATE entrada_xml_solicitacao
        SET status = 'importada',
            entrada_mercadoria_id = $2,
            importado_em = NOW()
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND entrada_xml_solicitacao_id = $1
      `,
      [safeSolicitacaoId, result?.entrada?.entrada_mercadoria_id || null]
    );

    return result;
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

    const [itemsResult, tituloResult, parcelasResult] = await Promise.all([
      client.query(
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
      ),
      client.query(
        `
          SELECT
            financeiro_titulo_id,
            pedido_compra_id,
            entrada_mercadoria_id,
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
            AND tipo = 'pagar'
            AND excluido = FALSE
            AND (
              entrada_mercadoria_id = $1
              OR (
                $2::integer IS NOT NULL
                AND pedido_compra_id = $2
              )
            )
          ORDER BY entrada_mercadoria_id NULLS LAST, financeiro_titulo_id DESC
          LIMIT 1
        `,
        [entradaMercadoriaId, entrada.pedido_compra_id || null]
      ),
      client.query(
        `
          SELECT
            ft.financeiro_titulo_id,
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
            AND ft.tipo = 'pagar'
            AND ft.excluido = FALSE
            AND (
              ft.entrada_mercadoria_id = $1
              OR (
                $2::integer IS NOT NULL
                AND ft.pedido_compra_id = $2
              )
            )
          ORDER BY ftp.numero_parcela
        `,
        [entradaMercadoriaId, entrada.pedido_compra_id || null]
      ),
    ]);

    const titulo = tituloResult.rows[0] || null;
    const manifestacoesResult = await client.query(
      `
        SELECT
          nfe_recebida_manifestacao_id,
          chave_acesso,
          tipo_evento,
          status,
          protocolo,
          justificativa,
          resposta_raw,
          evento_em,
          enviado_em,
          criado_em
        FROM nfe_recebida_manifestacao
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND entrada_mercadoria_id = $1
        ORDER BY criado_em DESC
      `,
      [entradaMercadoriaId]
    );

    const parcelas = titulo
      ? parcelasResult.rows
          .filter(
            (parcela) =>
              Number(parcela.financeiro_titulo_id) === Number(titulo.financeiro_titulo_id)
          )
          .map((parcela) => ({
            ...parcela,
            valor_parcela: Number(parcela.valor_parcela || 0),
            valor_recebido: Number(parcela.valor_recebido || 0),
            data_vencimento: normalizeDateValue(parcela.data_vencimento),
            data_pagamento: normalizeDateValue(parcela.data_pagamento),
          }))
      : [];

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
      titulo: titulo
        ? {
            ...titulo,
            valor_original: Number(titulo.valor_original || 0),
            desconto: Number(titulo.desconto || 0),
            acrescimo: Number(titulo.acrescimo || 0),
            valor_final: Number(titulo.valor_final || 0),
            data_emissao: normalizeDateValue(titulo.data_emissao),
            data_vencimento: normalizeDateValue(titulo.data_vencimento),
          }
        : null,
      parcelas,
      manifestacoes: manifestacoesResult.rows,
    };
  }

  static async registrarEstornoEntrada(client, {
    entradaMercadoriaId,
    depositoId,
    tipoMovimentoId,
    item,
    usuarioId,
    motivo,
  }) {
    const quantidade = Number(item.quantidade || 0);
    if (quantidade <= 0) return;

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
    const quantidadeMovimento = -quantidade;
    const saldoPosterior = saldoAnterior + quantidadeMovimento;

    if (saldoPosterior < 0) {
      throw new Error(
        `O cancelamento deixaria o estoque do item "${item.descricao}" negativo.`
      );
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
          'compra_estorno',
          $4,
          $5,
          'cancelamento_entrada_mercadoria',
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
        quantidadeMovimento,
        item.valor_unitario,
        entradaMercadoriaId,
        saldoAnterior,
        saldoPosterior,
        usuarioId || null,
        motivo || "Cancelamento de entrada de mercadoria",
      ]
    );
  }

  static async cancelar(client, entradaMercadoriaId, { usuarioId, motivo } = {}) {
    const id = parseInteger(entradaMercadoriaId, { label: "Entrada" });
    const cancelamentoMotivo =
      normalizeText(motivo, 500, { label: "Motivo" }) ||
      "Cancelamento de entrada de mercadoria.";

    await client.query("BEGIN");

    try {
      const entradaResult = await client.query(
        `
          SELECT *
          FROM entrada_mercadoria
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND entrada_mercadoria_id = $1
            AND excluido = FALSE
          FOR UPDATE
        `,
        [id]
      );

      const entrada = entradaResult.rows[0];
      if (!entrada) throw new Error("Entrada de mercadoria não encontrada.");
      if (entrada.status === "cancelada") {
        throw new Error("Esta entrada de mercadoria já está cancelada.");
      }

      const devolucaoResult = await client.query(
        `
          SELECT 1
          FROM devolucao_mercadoria
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND entrada_mercadoria_id = $1
            AND excluido = FALSE
            AND status <> 'cancelada'
          LIMIT 1
        `,
        [id]
      );

      if (devolucaoResult.rowCount) {
        throw new Error(
          "Esta entrada possui devolução vinculada. Cancele a devolução antes de cancelar a entrada."
        );
      }

      const titulosResult = await client.query(
        `
          SELECT financeiro_titulo_id, status
          FROM financeiro_titulo
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND tipo = 'pagar'
            AND excluido = FALSE
            AND (
              entrada_mercadoria_id = $1
              OR (
                $2::integer IS NOT NULL
                AND pedido_compra_id = $2
              )
            )
          FOR UPDATE
        `,
        [id, entrada.pedido_compra_id || null]
      );

      const tituloIds = titulosResult.rows.map((row) => Number(row.financeiro_titulo_id));
      if (tituloIds.length) {
        const baixasResult = await client.query(
          `
            SELECT COUNT(*)::int AS total
            FROM financeiro_titulo_baixa
            WHERE tenant_id = ${TENANT_CONTEXT_SQL}
              AND excluido = FALSE
              AND financeiro_titulo_id = ANY($1::int[])
          `,
          [tituloIds]
        );

        if (Number(baixasResult.rows[0]?.total || 0) > 0) {
          throw new Error(
            "A entrada possui título a pagar com baixa. Estorne/remova a baixa antes de cancelar a entrada."
          );
        }
      }

      const itemsResult = await client.query(
        `
          SELECT
            entrada_mercadoria_item_id,
            produto_id,
            descricao,
            quantidade,
            valor_unitario
          FROM entrada_mercadoria_item
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND entrada_mercadoria_id = $1
          ORDER BY entrada_mercadoria_item_id
        `,
        [id]
      );

      const depositoId = await EstoqueDAO.obterDepositoPadrao(client);
      const tipoMovimentoId = await this.buscarTipoMovimentoPorCodigo(
        client,
        "compra_estorno"
      );

      if (!tipoMovimentoId) {
        throw new Error("Tipo de movimento de estoque para estorno de compra não encontrado.");
      }

      for (const item of itemsResult.rows) {
        await this.registrarEstornoEntrada(client, {
          entradaMercadoriaId: id,
          depositoId,
          tipoMovimentoId,
          item,
          usuarioId,
          motivo: cancelamentoMotivo,
        });
      }

      if (tituloIds.length) {
        await client.query(
          `
            UPDATE financeiro_titulo
            SET status = 'cancelado',
                excluido = TRUE,
                cancelado_por = $2,
                cancelado_em = NOW(),
                cancelamento_motivo = $3,
                observacao = COALESCE(observacao, '') || $4
            WHERE tenant_id = ${TENANT_CONTEXT_SQL}
              AND financeiro_titulo_id = ANY($1::int[])
          `,
          [
            tituloIds,
            usuarioId || null,
            cancelamentoMotivo,
            `\nCancelado pelo cancelamento da entrada de mercadoria #${id}.`,
          ]
        );

        await client.query(
          `
            UPDATE financeiro_titulo_parcela
            SET status = 'cancelada',
                observacao = COALESCE(observacao, '') || $2
            WHERE tenant_id = ${TENANT_CONTEXT_SQL}
              AND financeiro_titulo_id = ANY($1::int[])
          `,
          [tituloIds, `\nCancelada pelo cancelamento da entrada de mercadoria #${id}.`]
        );
      }

      await client.query(
        `
          UPDATE entrada_xml_solicitacao
          SET status = 'xml_disponivel',
              entrada_mercadoria_id = NULL,
              importado_em = NULL
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND entrada_mercadoria_id = $1
            AND xml_disponivel IS NOT NULL
        `,
        [id]
      );

      await client.query(
        `
          UPDATE entrada_mercadoria
          SET status = 'cancelada',
              excluido = TRUE,
              cancelado_por = $2,
              cancelado_em = NOW(),
              cancelamento_motivo = $3
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND entrada_mercadoria_id = $1
        `,
        [id, usuarioId || null, cancelamentoMotivo]
      );

      if (entrada.pedido_compra_id) {
        await client.query(
          `
            UPDATE pedido_compra pc
            SET status = 'aberto'
            WHERE pc.tenant_id = ${TENANT_CONTEXT_SQL}
              AND pc.pedido_compra_id = $1
              AND pc.excluido = FALSE
              AND NOT EXISTS (
                SELECT 1
                FROM entrada_mercadoria em
                WHERE em.tenant_id = pc.tenant_id
                  AND em.pedido_compra_id = pc.pedido_compra_id
                  AND em.status <> 'cancelada'
                  AND em.excluido = FALSE
              )
          `,
          [entrada.pedido_compra_id]
        );
      }

      await client.query("COMMIT");

      return {
        entrada_mercadoria_id: id,
        pedido_compra_id: entrada.pedido_compra_id || null,
        status: "cancelada",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async registrarManifestacao(client, entradaMercadoriaId, payload = {}) {
    const tipoEvento = String(payload.tipo_evento || "").trim();
    const tiposPermitidos = new Set([
      "ciencia_operacao",
      "confirmacao_operacao",
      "desconhecimento_operacao",
      "operacao_nao_realizada",
    ]);

    if (!tiposPermitidos.has(tipoEvento)) {
      throw new Error("Tipo de manifestação inválido.");
    }

    const justificativa = String(payload.justificativa || "").trim() || null;
    if (tipoEvento === "operacao_nao_realizada" && (!justificativa || justificativa.length < 15)) {
      throw new Error("Justificativa obrigatória para operação não realizada.");
    }

    await client.query("BEGIN");
    try {
      const entradaResult = await client.query(
        `
          SELECT entrada_mercadoria_id, chave_acesso
          FROM entrada_mercadoria
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND excluido = FALSE
            AND entrada_mercadoria_id = $1
          FOR UPDATE
        `,
        [entradaMercadoriaId]
      );

      const entrada = entradaResult.rows[0];
      if (!entrada) throw new Error("NF-e recebida não encontrada.");
      if (!entrada.chave_acesso) throw new Error("A NF-e recebida não possui chave de acesso.");

      const manifestacaoResult = await client.query(
        `
          INSERT INTO nfe_recebida_manifestacao (
            tenant_id,
            entrada_mercadoria_id,
            chave_acesso,
            tipo_evento,
            status,
            justificativa,
            usuario_id
          )
          VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3, 'registrada', $4, $5)
          RETURNING *
        `,
        [
          entradaMercadoriaId,
          entrada.chave_acesso,
          tipoEvento,
          justificativa,
          payload.usuarioId || null,
        ]
      );

      await client.query(
        `
          UPDATE entrada_mercadoria
          SET manifestacao_tipo = $2,
              manifestacao_status = 'registrada',
              manifestacao_protocolo = NULL,
              manifestacao_em = NOW(),
              atualizado_em = NOW()
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND entrada_mercadoria_id = $1
        `,
        [entradaMercadoriaId, tipoEvento]
      );

      await client.query("COMMIT");
      return manifestacaoResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export default EntradaMercadoriaDAO;
