import EntradaMercadoriaDAO from "./entradaMercadoriaDAO.js";
import {
  consultarDistribuicaoNfePorUltNsuAcbr,
  consultarXmlNfePorChaveAcbr,
  enviarManifestacaoNfeAcbr,
} from "../utils/acbrSetup.js";

const TENANT_CONTEXT_SQL = "current_setting('app.tenant_id')::INTEGER";
const DISTRIBUICAO_COOLDOWN_MS = 65 * 60 * 1000;

const EVENT_CONFIG = {
  confirmacao_operacao: { codigo: "210200", label: "Confirmação da operação" },
  ciencia_operacao: { codigo: "210210", label: "Ciência da operação" },
  desconhecimento_operacao: { codigo: "210220", label: "Desconhecimento da operação" },
  operacao_nao_realizada: { codigo: "210240", label: "Operação não realizada" },
};

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const normalizeNsu = (value) => {
  const digits = onlyDigits(value);
  return (digits || "0").padStart(15, "0").slice(-15);
};

const extractTag = (xml, tag) => {
  const match = String(xml || "").match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() || "";
};

const extractBlock = (xml, tag) => {
  const match = String(xml || "").match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] || "";
};

const parseNumber = (value) => {
  const normalized = String(value || "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const findIniValue = (text, key) => {
  const match = String(text || "").match(new RegExp(`(?:^|\\n)\\s*${key}\\s*=\\s*([^\\r\\n]+)`, "i"));
  return match?.[1]?.trim() || "";
};

const previewRaw = (value, maxLength = 800) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const formatDateTime = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: process.env.TZ || "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getDistribuicaoCooldown = (controle) => {
  if (String(controle?.cstat || "") !== "656" || !controle?.ultima_consulta_em) {
    return null;
  }

  const lastAttempt = new Date(controle.ultima_consulta_em);
  if (Number.isNaN(lastAttempt.getTime())) return null;

  const retryAt = new Date(lastAttempt.getTime() + DISTRIBUICAO_COOLDOWN_MS);
  const remainingMs = retryAt.getTime() - Date.now();

  return remainingMs > 0 ? { retryAt, remainingMs } : null;
};

const getRootName = (xml) => {
  const match = String(xml || "").match(/<([a-zA-Z0-9:_-]+)(?:\s|>)/);
  return match?.[1]?.replace(/^.*:/, "") || "";
};

const getAccessKey = (xml) =>
  onlyDigits(
    String(xml || "").match(/Id=["']NFe(\d{44})["']/i)?.[1] ||
      extractTag(xml, "chNFe") ||
      ""
  );

const getDocText = (block) => onlyDigits(extractTag(block, "CNPJ") || extractTag(block, "CPF"));

const parseNfeDistributionXml = (xml, fileName = "") => {
  const text = String(xml || "");
  const rootName = getRootName(text);
  const chaveAcesso = getAccessKey(text);
  const isComplete = /<(procNFe|NFe)\b/i.test(text) && /<det\b/i.test(text);
  const infNFe = extractBlock(text, "infNFe") || text;
  const emit = extractBlock(infNFe, "emit") || text;
  const dest = extractBlock(infNFe, "dest") || "";
  const ide = extractBlock(infNFe, "ide") || "";

  const nsu =
    onlyDigits(String(fileName || "").match(/(\d{15})/)?.[1]) ||
    onlyDigits(String(text).match(/NSU=["']?(\d{1,15})/i)?.[1]);

  return {
    chave_acesso: chaveAcesso,
    nsu: nsu ? normalizeNsu(nsu) : null,
    schema_tipo: rootName,
    tipo_documento: isComplete ? "completo" : "resumo",
    status_xml: isComplete ? "completo" : "resumo",
    emitente_documento: getDocText(emit || text),
    emitente_nome: extractTag(emit || text, "xNome") || extractTag(text, "xNome"),
    emitente_ie: extractTag(emit || text, "IE"),
    destinatario_documento: getDocText(dest),
    numero_nfe: extractTag(ide, "nNF") || null,
    serie_nfe: extractTag(ide, "serie") || null,
    data_emissao: parseDate(extractTag(ide, "dhEmi") || extractTag(text, "dhEmi")),
    valor_total: parseNumber(extractTag(text, "vNF")),
    xml_resumo: isComplete ? null : text,
    xml_completo: isComplete ? text : null,
  };
};

const isManifestSuccess = (cStat) => ["135", "136", "573"].includes(String(cStat || ""));

class NfeManifestacaoDAO {
  static async obterContextoFilial(client) {
    const { rows } = await client.query(
      `
        SELECT
          t.tenant_id,
          COALESCE(p.pessoa_cpf_cnpj, t.tenant_documento) AS documento,
          pe.uf,
          COALESCE(cfg.ambiente_manifestacao_nfe, '1') AS ambiente_manifestacao_nfe
        FROM tenant t
        LEFT JOIN pessoa p ON p.pessoa_id = t.pessoa_id
        LEFT JOIN LATERAL (
          SELECT uf
          FROM pessoa_endereco
          WHERE pessoa_id = t.pessoa_id
            AND tenant_id = t.tenant_id
            AND endereco_tipo = 'principal'
          ORDER BY atualizado_em DESC, criado_em DESC
          LIMIT 1
        ) pe ON TRUE
        LEFT JOIN tenant_configuracao_fiscal cfg ON cfg.tenant_id = t.tenant_id
        WHERE t.tenant_id = ${TENANT_CONTEXT_SQL}
        LIMIT 1
      `
    );

    const row = rows[0];
    if (!row) throw new Error("Filial não encontrada.");

    return {
      tenantId: row.tenant_id,
      documento: onlyDigits(row.documento),
      uf: row.uf,
      ambiente: row.ambiente_manifestacao_nfe || "1",
    };
  }

  static async obterControle(client, contexto) {
    const { rows } = await client.query(
      `
        INSERT INTO nfe_distribuicao_controle (
          tenant_id,
          ambiente,
          documento,
          uf
        )
        VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3)
        ON CONFLICT (tenant_id, ambiente, documento)
        DO UPDATE SET uf = EXCLUDED.uf
        RETURNING *
      `,
      [contexto.ambiente, contexto.documento, contexto.uf]
    );

    return rows[0];
  }

  static async salvarNotificacaoSincronizacao(client, { quantidade, chaves = [] } = {}) {
    const total = Number(quantidade) || 0;
    if (total <= 0) return null;

    const plural = total === 1 ? "NF-e recebida" : "NF-e recebidas";
    const mensagem =
      total === 1
        ? "1 NF-e emitida para esta filial foi encontrada na SEFAZ. Você pode confirmar, desconhecer ou importar o XML."
        : `${total} NF-e emitidas para esta filial foram encontradas na SEFAZ. Você pode confirmar, desconhecer ou importar os XMLs.`;

    await client.query(
      `
        INSERT INTO notificacao (
          tenant_id,
          tipo,
          titulo,
          mensagem,
          rota,
          payload_json
        )
        VALUES (
          ${TENANT_CONTEXT_SQL},
          'nfe_recebida_lote',
          $1,
          $2,
          '/nfe/manifestacoes',
          $3
        )
      `,
      [
        `${total} ${plural} encontradas`,
        mensagem,
        JSON.stringify({
          origem: "distribuicao_dfe",
          quantidade: total,
          chaves: chaves.slice(0, 20),
        }),
      ]
    );
  }

  static async salvarDocumentoDistribuicao(client, doc, respostaRaw = "") {
    if (!doc?.chave_acesso || doc.chave_acesso.length !== 44) return null;

    const existente = await client.query(
      `
        SELECT nfe_recebida_distribuicao_id
        FROM nfe_recebida_distribuicao
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND chave_acesso = $1
        LIMIT 1
      `,
      [doc.chave_acesso]
    );
    const isNew = !existente.rowCount;

    const { rows } = await client.query(
      `
        INSERT INTO nfe_recebida_distribuicao (
          tenant_id,
          chave_acesso,
          nsu,
          schema_tipo,
          tipo_documento,
          status_xml,
          emitente_documento,
          emitente_nome,
          emitente_ie,
          destinatario_documento,
          numero_nfe,
          serie_nfe,
          data_emissao,
          valor_total,
          xml_resumo,
          xml_completo,
          resposta_raw
        )
        VALUES (
          ${TENANT_CONTEXT_SQL},
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16
        )
        ON CONFLICT (tenant_id, chave_acesso)
        DO UPDATE SET
          nsu = COALESCE(EXCLUDED.nsu, nfe_recebida_distribuicao.nsu),
          schema_tipo = COALESCE(EXCLUDED.schema_tipo, nfe_recebida_distribuicao.schema_tipo),
          tipo_documento = CASE
            WHEN EXCLUDED.xml_completo IS NOT NULL THEN 'completo'
            ELSE nfe_recebida_distribuicao.tipo_documento
          END,
          status_xml = CASE
            WHEN EXCLUDED.xml_completo IS NOT NULL THEN 'completo'
            ELSE nfe_recebida_distribuicao.status_xml
          END,
          emitente_documento = COALESCE(EXCLUDED.emitente_documento, nfe_recebida_distribuicao.emitente_documento),
          emitente_nome = COALESCE(EXCLUDED.emitente_nome, nfe_recebida_distribuicao.emitente_nome),
          emitente_ie = COALESCE(EXCLUDED.emitente_ie, nfe_recebida_distribuicao.emitente_ie),
          destinatario_documento = COALESCE(EXCLUDED.destinatario_documento, nfe_recebida_distribuicao.destinatario_documento),
          numero_nfe = COALESCE(EXCLUDED.numero_nfe, nfe_recebida_distribuicao.numero_nfe),
          serie_nfe = COALESCE(EXCLUDED.serie_nfe, nfe_recebida_distribuicao.serie_nfe),
          data_emissao = COALESCE(EXCLUDED.data_emissao, nfe_recebida_distribuicao.data_emissao),
          valor_total = COALESCE(EXCLUDED.valor_total, nfe_recebida_distribuicao.valor_total),
          xml_resumo = COALESCE(EXCLUDED.xml_resumo, nfe_recebida_distribuicao.xml_resumo),
          xml_completo = COALESCE(EXCLUDED.xml_completo, nfe_recebida_distribuicao.xml_completo),
          resposta_raw = COALESCE(EXCLUDED.resposta_raw, nfe_recebida_distribuicao.resposta_raw),
          atualizado_em = NOW()
        RETURNING *
      `,
      [
        doc.chave_acesso,
        doc.nsu,
        doc.schema_tipo,
        doc.tipo_documento,
        doc.status_xml,
        doc.emitente_documento,
        doc.emitente_nome,
        doc.emitente_ie,
        doc.destinatario_documento,
        doc.numero_nfe,
        doc.serie_nfe,
        doc.data_emissao,
        doc.valor_total,
        doc.xml_resumo,
        doc.xml_completo,
        respostaRaw || null,
      ]
    );

    return {
      ...rows[0],
      nova_distribuicao: isNew,
    };
  }

  static async sincronizarDistribuicao(client, { token, usuarioId = null } = {}) {
    const contexto = await this.obterContextoFilial(client);
    if (!contexto.documento) throw new Error("Documento da filial não configurado.");
    if (!contexto.uf) throw new Error("UF da filial não configurada.");

    const controle = await this.obterControle(client, contexto);
    const cooldown = getDistribuicaoCooldown(controle);
    if (cooldown) {
      const retryText = formatDateTime(cooldown.retryAt);
      console.warn("[nfe-manifestacao] Consulta bloqueada por consumo indevido recente", {
        tenantId: contexto.tenantId,
        documento: contexto.documento,
        ambiente: contexto.ambiente,
        ultNsuAtual: controle.ult_nsu,
        retryAt: retryText,
      });
      throw new Error(
        `A SEFAZ bloqueou temporariamente a distribuição por consumo indevido. Aguarde até ${retryText} antes de consultar novamente.`
      );
    }

    console.log("[nfe-manifestacao] Sincronização iniciada", {
      tenantId: contexto.tenantId,
      documento: contexto.documento,
      uf: contexto.uf,
      ambiente: contexto.ambiente,
      ultNsuAtual: controle.ult_nsu,
      maxNsuAtual: controle.max_nsu,
    });

    const response = await consultarDistribuicaoNfePorUltNsuAcbr({
      token,
      ultNsu: controle.ult_nsu,
    });
    const raw = response.raw || response.rawResponse || "";
    const ultNsu = normalizeNsu(findIniValue(raw, "ultNSU") || findIniValue(raw, "UltNSU") || controle.ult_nsu);
    const maxNsu = normalizeNsu(findIniValue(raw, "maxNSU") || findIniValue(raw, "MaxNSU") || controle.max_nsu);
    const cStat = response.cStat || findIniValue(raw, "CStat") || null;
    const xMotivo = response.xMotivo || findIniValue(raw, "XMotivo") || findIniValue(raw, "xMotivo") || null;
    const documentos = [];
    const novosDocumentos = [];
    const ignored = {
      semChave: 0,
      destinatarioDivergente: 0,
    };

    console.log("[nfe-manifestacao] Retorno distribuição", {
      tenantId: contexto.tenantId,
      cStat,
      xMotivo,
      ultNsu,
      maxNsu,
      documentosRecebidos: response.documentos?.length || 0,
      rawPreview: previewRaw(raw),
    });

    for (const item of response.documentos || []) {
      const doc = parseNfeDistributionXml(item.xml, item.fileName);
      if (!doc.chave_acesso) {
        ignored.semChave += 1;
        continue;
      }
      if (doc.destinatario_documento && doc.destinatario_documento !== contexto.documento) {
        ignored.destinatarioDivergente += 1;
        console.warn("[nfe-manifestacao] Documento ignorado por destinatário divergente", {
          tenantId: contexto.tenantId,
          chaveAcesso: doc.chave_acesso,
          destinatarioXml: doc.destinatario_documento,
          destinatarioFilial: contexto.documento,
        });
        continue;
      }
      const saved = await this.salvarDocumentoDistribuicao(client, doc, raw);
      if (saved) {
        documentos.push(saved);
        if (saved.nova_distribuicao) novosDocumentos.push(saved);
      }
    }

    await this.salvarNotificacaoSincronizacao(client, {
      quantidade: novosDocumentos.length,
      chaves: novosDocumentos.map((item) => item.chave_acesso).filter(Boolean),
    });

    console.log("[nfe-manifestacao] Sincronização finalizada", {
      tenantId: contexto.tenantId,
      documentosSalvos: documentos.length,
      documentosNovos: novosDocumentos.length,
      ignorados: ignored,
    });

    await client.query(
      `
        UPDATE nfe_distribuicao_controle
        SET ult_nsu = $2,
            max_nsu = $3,
            cstat = $4,
            xmotivo = $5,
            ultima_consulta_em = NOW()
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND nfe_distribuicao_controle_id = $1
      `,
      [controle.nfe_distribuicao_controle_id, ultNsu, maxNsu, cStat, xMotivo]
    );

    return {
      controle: {
        ...controle,
        ult_nsu: ultNsu,
        max_nsu: maxNsu,
        cstat: cStat,
        xmotivo: xMotivo,
      },
      documentos,
      novosDocumentos: novosDocumentos.length,
      usuario_id: usuarioId,
      raw,
    };
  }

  static async listar(client, { page = 1, limit = 12, search = "", sort = {} } = {}) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 100);
    const offset = (safePage - 1) * safeLimit;
    const values = [];
    let where = `WHERE tenant_id = ${TENANT_CONTEXT_SQL}`;

    if (String(search || "").trim()) {
      values.push(`%${String(search).trim()}%`);
      where += `
        AND (
          chave_acesso LIKE $${values.length}
          OR LOWER(COALESCE(emitente_nome, '')) LIKE LOWER($${values.length})
          OR emitente_documento LIKE $${values.length}
        )
      `;
    }

    const sortField = Object.keys(sort || {})[0] || "atualizado_em";
    const sortDir = String(sort?.[sortField] || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";
    const sortMap = {
      atualizado_em: "atualizado_em",
      data_emissao: "data_emissao",
      emitente_nome: "emitente_nome",
      valor_total: "valor_total",
      status_manifestacao: "status_manifestacao",
    };
    const orderBy = sortMap[sortField] || "atualizado_em";

    const countResult = await client.query(
      `SELECT COUNT(*)::INTEGER AS total FROM nfe_recebida_distribuicao ${where}`,
      values
    );

    values.push(safeLimit, offset);
    const { rows } = await client.query(
      `
        SELECT
          nfe_recebida_distribuicao_id,
          chave_acesso,
          nsu,
          schema_tipo,
          tipo_documento,
          status_manifestacao,
          status_xml,
          emitente_documento,
          emitente_nome,
          emitente_ie,
          destinatario_documento,
          numero_nfe,
          serie_nfe,
          data_emissao,
          valor_total,
          entrada_mercadoria_id,
          descoberta_em,
          atualizado_em,
          xml_completo IS NOT NULL AS tem_xml_completo
        FROM nfe_recebida_distribuicao
        ${where}
        ORDER BY ${orderBy} ${sortDir} NULLS LAST, nfe_recebida_distribuicao_id DESC
        LIMIT $${values.length - 1}
        OFFSET $${values.length}
      `,
      values
    );

    return {
      data: rows,
      page: safePage,
      limit: safeLimit,
      total: countResult.rows[0]?.total || 0,
      totalPages: Math.ceil((countResult.rows[0]?.total || 0) / safeLimit) || 1,
    };
  }

  static async manifestar(client, id, { tipoEvento, justificativa, usuarioId, token } = {}) {
    const config = EVENT_CONFIG[tipoEvento];
    if (!config) throw new Error("Tipo de manifestação inválido.");
    if (tipoEvento === "operacao_nao_realizada" && String(justificativa || "").trim().length < 15) {
      throw new Error("Justificativa obrigatória para operação não realizada.");
    }

    const atual = await client.query(
      `
        SELECT *
        FROM nfe_recebida_distribuicao
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND nfe_recebida_distribuicao_id = $1
        LIMIT 1
      `,
      [id]
    );
    const nfe = atual.rows[0];
    if (!nfe) throw new Error("NF-e recebida não encontrada.");

    const response = await enviarManifestacaoNfeAcbr({
      token,
      chaveAcesso: nfe.chave_acesso,
      tipoEvento,
      justificativa,
    });
    const cStat = response.cStat || null;
    const xMotivo = response.xMotivo || null;
    const protocolo = response.protocolo || null;
    const status = isManifestSuccess(cStat) ? "enviado" : "erro";

    const eventoResult = await client.query(
      `
        INSERT INTO nfe_recebida_evento (
          tenant_id,
          nfe_recebida_distribuicao_id,
          chave_acesso,
          tipo_evento,
          codigo_evento,
          justificativa,
          status,
          cstat,
          xmotivo,
          protocolo,
          resposta_raw,
          usuario_id,
          enviado_em
        )
        VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING *
      `,
      [
        nfe.nfe_recebida_distribuicao_id,
        nfe.chave_acesso,
        tipoEvento,
        config.codigo,
        justificativa || null,
        status,
        cStat,
        xMotivo,
        protocolo,
        response.raw || null,
        usuarioId || null,
      ]
    );

    if (status === "enviado") {
      await client.query(
        `
          UPDATE nfe_recebida_distribuicao
          SET status_manifestacao = $2
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND nfe_recebida_distribuicao_id = $1
        `,
        [nfe.nfe_recebida_distribuicao_id, tipoEvento]
      );
    }

    return {
      evento: eventoResult.rows[0],
      retorno: response,
      sucesso: status === "enviado",
    };
  }

  static async consultarPorChave(client, { chaveAcesso, token, usuarioId }) {
    const chave = onlyDigits(chaveAcesso);
    if (chave.length !== 44) throw new Error("Chave de acesso da NF-e inválida.");
    const contexto = await this.obterContextoFilial(client);

    const local = await client.query(
      `
        SELECT *
        FROM nfe_recebida_distribuicao
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND chave_acesso = $1
        LIMIT 1
      `,
      [chave]
    );

    if (local.rows[0]?.xml_completo) {
      return local.rows[0];
    }

    const response = await consultarXmlNfePorChaveAcbr({ token, chaveAcesso: chave });
    if (response.xml) {
      const doc = parseNfeDistributionXml(response.xml, `${chave}.xml`);
      if (doc.destinatario_documento && doc.destinatario_documento !== contexto.documento) {
        throw new Error("A NF-e consultada não pertence à filial logada.");
      }
      return this.salvarDocumentoDistribuicao(client, doc, response.raw || response.rawResponse || "");
    }

    return {
      ...(local.rows[0] || {}),
      chave_acesso: chave,
      status_xml: response.xml ? "completo" : "indisponivel",
      cstat: response.cStat,
      xmotivo: response.xMotivo,
      usuario_id: usuarioId,
    };
  }

  static async importarXml(client, id, { usuarioId } = {}) {
    const { rows } = await client.query(
      `
        SELECT *
        FROM nfe_recebida_distribuicao
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND nfe_recebida_distribuicao_id = $1
        LIMIT 1
      `,
      [id]
    );
    const nfe = rows[0];
    if (!nfe) throw new Error("NF-e recebida não encontrada.");
    if (!nfe.xml_completo) throw new Error("A NF-e ainda não possui XML completo para importação.");

    const result = await EntradaMercadoriaDAO.importarXml(client, {
      xmlContent: nfe.xml_completo,
      nomeArquivo: `${nfe.chave_acesso}.xml`,
      usuarioId,
    });

    await client.query(
      `
        UPDATE nfe_recebida_distribuicao
        SET entrada_mercadoria_id = $2
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND nfe_recebida_distribuicao_id = $1
      `,
      [id, result?.entrada?.entrada_mercadoria_id || null]
    );

    return result;
  }
}

export default NfeManifestacaoDAO;
