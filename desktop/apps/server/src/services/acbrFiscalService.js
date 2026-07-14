import { nfceStatus } from "@v12-desktop/shared";
import { env } from "../config/env.js";
import { getFiscalConfig } from "../modules/configuracao/localFiscalConfigRepository.js";
import { getDb } from "../db/connection.js";
import { getTerminalConfig, getTerminalTenantErpId } from "../modules/configuracao/localConfigRepository.js";
import {
  getNfceByVendaId,
  reserveNextNfceNumber,
  updateNfceResult,
} from "../modules/vendas/nfceRepository.js";
import {
  getAcbrLibReadiness,
  parseWorkerNfceResult,
  runNfceEmissionWorker,
} from "./acbrlib/client.js";

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

const SUPPORTED_ICMS_CST_NORMAL = new Set(["00", "20"]);
const SUPPORTED_ICMS_CSOSN = new Set(["102", "103", "300", "400"]);
const SUPPORTED_PIS_CST = new Set(["01", "02", "49", "99"]);
const SUPPORTED_COFINS_CST = new Set(["01", "02", "49", "99"]);
const TRANSIENT_CSTAT = new Set(["103", "104", "105", "106", "108", "109"]);
const TP_EMIS_NORMAL = 1;
const TP_EMIS_CONTINGENCIA_OFFLINE = 9;
const ACBR_FORMA_EMISSAO_NORMAL = "0";
const ACBR_FORMA_EMISSAO_OFFLINE = "8";
const TRANSIENT_ERROR_PATTERNS = [
  /timeout/i,
  /time[\s-]?out/i,
  /socket/i,
  /conex[aã]o/i,
  /internet/i,
  /servidor/i,
  /servi[cç]o.*indispon/i,
  /falha.*comunica/i,
  /nao foi possivel.*sefaz/i,
  /status.*paralisad/i,
];

function hasClientIdentification(venda) {
  const tipoDocumento = String(venda?.cliente_tipo_documento || "").trim().toUpperCase();
  if (tipoDocumento === "ESTRANGEIRO") {
    return String(venda?.cliente_documento || "").trim().length > 0;
  }
  return onlyDigits(venda?.cliente_documento).length > 0;
}

function validarProntidaoNfce() {
  const fiscal = getFiscalConfig();
  if (!fiscal) {
    return {
      ready: false,
      reason: "Configuração fiscal do NFC-e ainda não foi sincronizada para este terminal.",
      fiscal,
    };
  }

  if (!fiscal.nfce_habilitada) {
    return {
      ready: false,
      reason: "A filial não está habilitada para emissão de NFC-e.",
      fiscal,
    };
  }

  if (!fiscal.certificado_conteudo_base64 || !fiscal.certificado_senha) {
    return {
      ready: false,
      reason: "Certificado A1 da filial não foi sincronizado para o PDV.",
      fiscal,
    };
  }

  if (!fiscal.nfce_id_token_csc || !fiscal.nfce_csc) {
    return {
      ready: false,
      reason: "CSC e ID token do NFC-e não foram configurados para a filial.",
      fiscal,
    };
  }

  const acbr = getAcbrLibReadiness();
  if (!acbr.ready) {
    return {
      ready: false,
      reason: acbr.reason,
      fiscal,
      diagnostics: acbr.diagnostics,
    };
  }

  return {
    ready: true,
    reason: null,
    fiscal,
    diagnostics: acbr.diagnostics,
  };
}

function isContingenciaCandidate({ cStat = null, message = "" } = {}) {
  const normalizedCode = String(cStat || "").trim();
  if (TRANSIENT_CSTAT.has(normalizedCode)) {
    return true;
  }

  return TRANSIENT_ERROR_PATTERNS.some((pattern) => pattern.test(String(message || "")));
}

function normalizeContingenciaJustificativa(message = "") {
  const base = String(message || "")
    .replace(/\s+/g, " ")
    .trim();

  const fallback =
    "Falha de comunicação com a SEFAZ ou indisponibilidade temporária da internet no PDV.";
  const value = base || fallback;

  if (value.length >= 15) {
    return value.slice(0, 256);
  }

  return `${value} - emissão em contingência offline.`.slice(0, 256);
}

function validateFiscalItemSupport(item, crt) {
  if (String(crt || "3") === "3") {
    if (!SUPPORTED_ICMS_CST_NORMAL.has(String(item.icms_cst || "").trim())) {
      throw new Error(
        `O produto ${item.descricao} usa CST ICMS ${item.icms_cst || "não informado"}, ainda não suportado pelo PDV para NFC-e.`,
      );
    }
  } else if (!SUPPORTED_ICMS_CSOSN.has(String(item.icms_csosn || "").trim())) {
    throw new Error(
      `O produto ${item.descricao} usa CSOSN ${item.icms_csosn || "não informado"}, ainda não suportado pelo PDV para NFC-e.`,
    );
  }

  if (!SUPPORTED_PIS_CST.has(String(item.pis_cst || "").trim())) {
    throw new Error(
      `O produto ${item.descricao} usa CST PIS ${item.pis_cst || "não informado"}, ainda não suportado pelo PDV para NFC-e.`,
    );
  }

  if (!SUPPORTED_COFINS_CST.has(String(item.cofins_cst || "").trim())) {
    throw new Error(
      `O produto ${item.descricao} usa CST COFINS ${item.cofins_cst || "não informado"}, ainda não suportado pelo PDV para NFC-e.`,
    );
  }
}

function calculateFiscalTotals(itens = []) {
  return itens.reduce(
    (acc, item) => {
      const total = Number(item.valor_total || 0);
      const reducao = Math.max(0, Math.min(100, Number(item.icms_reducao_base || 0)));
      const icmsBase = Number((total * (1 - reducao / 100)).toFixed(2));
      const icmsAliquota = Number(item.icms_aliquota || 0);
      const icmsValor =
        String(item.crt_emitente || item.crt || "3") === "3"
          ? Number(((icmsBase * icmsAliquota) / 100).toFixed(2))
          : 0;
      const pisValor = Number((((total || 0) * Number(item.pis_aliquota || 0)) / 100).toFixed(2));
      const cofinsValor = Number(
        (((total || 0) * Number(item.cofins_aliquota || 0)) / 100).toFixed(2),
      );
      const ipiValor = Number((((total || 0) * Number(item.ipi_aliquota || 0)) / 100).toFixed(2));

      acc.icms_base_total += icmsBase;
      acc.icms_valor_total += icmsValor;
      acc.icms_fcp_total += Number(
        (((total || 0) * Number(item.icms_aliquota_fcp || 0)) / 100).toFixed(2),
      );
      acc.pis_valor_total += pisValor;
      acc.cofins_valor_total += cofinsValor;
      acc.ipi_valor_total += ipiValor;
      acc.valor_tributos_total += icmsValor + pisValor + cofinsValor + ipiValor;
      return acc;
    },
    {
      icms_base_total: 0,
      icms_valor_total: 0,
      icms_fcp_total: 0,
      pis_valor_total: 0,
      cofins_valor_total: 0,
      ipi_valor_total: 0,
      valor_tributos_total: 0,
    },
  );
}

function loadNfceContext(vendaId, fiscal, sequencial, options = {}) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const terminal = getTerminalConfig();
  const tpEmis = Number(options.tpEmis || TP_EMIS_NORMAL);
  const contingenciaJustificativa =
    tpEmis === TP_EMIS_CONTINGENCIA_OFFLINE
      ? normalizeContingenciaJustificativa(options.contingenciaJustificativa)
      : null;

  const venda = db
    .prepare(
      `SELECT
         v.venda_id,
         v.caixa_id,
         v.pessoa_id,
         v.cliente_tipo_documento,
         v.cliente_documento,
         v.cliente_nome,
         v.cliente_email,
         v.status,
         v.total_produtos,
         v.total_desconto,
         v.total_liquido,
         v.criada_em,
         v.concluida_em,
         c.operador_nome,
         c.terminal_codigo
       FROM venda v
       LEFT JOIN caixa c ON c.caixa_id = v.caixa_id
       WHERE v.tenant_erp_id = ?
         AND v.venda_id = ?
       LIMIT 1`,
    )
    .get(tenantErpId, Number(vendaId));

  if (!venda) {
    throw new Error("Venda local não encontrada para emissão da NFC-e.");
  }

  const itens = db
    .prepare(
      `SELECT
         vi.venda_item_id,
         vi.produto_id,
         vi.codigo_produto,
         vi.descricao,
         vi.unidade,
         vi.quantidade,
         vi.valor_unitario,
         vi.valor_total,
         p.erp_id AS produto_erp_id,
         p.codigo AS produto_codigo_erp,
         p.descricao AS produto_descricao,
         p.descricao_fiscal,
         p.gtin,
         p.ncm,
         p.cest,
         p.origem_mercadoria,
         p.crt_emitente,
         p.cbenef,
         p.cfop_venda_interna,
         p.cfop_venda_interestadual,
         p.icms_cst,
         p.icms_csosn,
         p.icms_aliquota,
         p.icms_reducao_base,
         p.icms_aliquota_fcp,
         p.icms_modalidade_bc,
         p.pis_cst,
         p.pis_aliquota,
         p.cofins_cst,
         p.cofins_aliquota,
         p.ipi_cst,
         p.ipi_enquadramento,
         p.ipi_aliquota
       FROM venda_item vi
       JOIN produto p
         ON p.produto_id = vi.produto_id
        AND p.tenant_erp_id = vi.tenant_erp_id
       WHERE vi.tenant_erp_id = ?
         AND vi.venda_id = ?
       ORDER BY vi.venda_item_id ASC`,
    )
    .all(tenantErpId, Number(vendaId))
    .map((item) => ({
      ...item,
      codigo_produto:
        item.codigo_produto ||
        item.produto_codigo_erp ||
        String(item.produto_erp_id || item.produto_id || ""),
      descricao: item.descricao_fiscal || item.descricao || item.produto_descricao,
      ncm: String(item.ncm || "").trim(),
      cfop: item.cfop_venda_interna || "5102",
      gtin: item.gtin || "SEM GTIN",
      origem_mercadoria: item.origem_mercadoria || "0",
    }));

  if (!itens.length) {
    throw new Error("A venda não possui itens para emissão da NFC-e.");
  }

  const produtoSemNcm = itens.find((item) => !item.ncm);
  if (produtoSemNcm) {
    throw new Error(
      `O produto ${produtoSemNcm.descricao} está sem NCM configurado e não pode ser emitido na NFC-e.`,
    );
  }

  const destinatarioIdentificado = hasClientIdentification(venda)
    ? {
        tipo_documento: venda.cliente_tipo_documento,
        documento: venda.cliente_documento,
        nome: venda.cliente_nome,
        email: venda.cliente_email,
        uf: fiscal.emitente_uf,
      }
    : null;

  itens.forEach((item) => validateFiscalItemSupport(item, fiscal.crt));

  const pagamentos = db
    .prepare(
      `SELECT pagamento_id, forma, valor
       FROM venda_pagamento
       WHERE tenant_erp_id = ?
         AND venda_id = ?
       ORDER BY pagamento_id ASC`,
    )
    .all(tenantErpId, Number(vendaId));

  const totalPago = pagamentos.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const totals = calculateFiscalTotals(itens);
  const emitenteDocumento = onlyDigits(fiscal.emitente_cpf_cnpj);

  if (!emitenteDocumento) {
    throw new Error("Documento do emitente não foi sincronizado para o PDV.");
  }

  if (Number(venda.total_liquido || 0) >= 10000 && !hasClientIdentification(venda)) {
    throw new Error(
      "Vendas de NFC-e com valor igual ou superior a R$ 10.000,00 exigem identificação do consumidor.",
    );
  }

  const observacoes = ["Documento emitido pelo V12 PDV."].filter(Boolean);

  return {
    configuracao: fiscal,
    emitente: {
      nome_razao: fiscal.emitente_nome_razao,
      nome_fantasia: fiscal.emitente_nome_fantasia,
      cpf_cnpj: emitenteDocumento,
      inscricao_estadual: fiscal.emitente_inscricao_estadual,
      inscricao_municipal: fiscal.emitente_inscricao_municipal,
      email: fiscal.emitente_email,
      telefone: fiscal.emitente_telefone,
      cep: fiscal.emitente_cep,
      logradouro: fiscal.emitente_logradouro,
      numero: fiscal.emitente_numero,
      complemento: fiscal.emitente_complemento,
      bairro: fiscal.emitente_bairro,
      cidade: fiscal.emitente_cidade,
      uf: fiscal.emitente_uf,
      codigo_ibge: fiscal.emitente_codigo_ibge,
      pais: fiscal.emitente_pais || "Brasil",
    },
    destinatario: destinatarioIdentificado,
    responsavel_tecnico: {
      cnpj: fiscal.responsavel_tecnico_cnpj,
      nome: fiscal.responsavel_tecnico_nome,
      contato: fiscal.responsavel_tecnico_contato,
      email: fiscal.responsavel_tecnico_email,
      telefone: fiscal.responsavel_tecnico_telefone,
    },
    nfce: {
      venda_id: venda.venda_id,
      numero: sequencial.numero,
      serie: sequencial.serie,
      ambiente: sequencial.ambiente,
      codigo_numerico: Number(`${venda.venda_id}${sequencial.numero}`.slice(-8)),
      natureza_operacao: fiscal.natureza_operacao_padrao || "Venda NFC-e",
      valor_produtos: Number(venda.total_produtos || 0),
      valor_desconto: Number(venda.total_desconto || 0),
      valor_total: Number(venda.total_liquido || 0),
      total_pago: totalPago,
      ind_pres: fiscal.nfce_ind_pres_padrao || "1",
      operador_nome: venda.operador_nome || "Operador",
      terminal_codigo: venda.terminal_codigo || terminal?.terminal_codigo || "PDV-01",
      tp_emis: tpEmis,
      dh_contingencia:
        tpEmis === TP_EMIS_CONTINGENCIA_OFFLINE ? options.contingenciaEm || new Date().toISOString() : null,
      x_justificativa_contingencia: contingenciaJustificativa,
      observacao: observacoes.join(" "),
      ...totals,
    },
    venda,
    itens,
    pagamentos,
  };
}

export async function emitirNfce(venda, options = {}) {
  const readiness = validarProntidaoNfce();
  const vendaId = Number(venda?.venda_id || venda || 0);
  const mode = String(options.mode || "normal").trim().toLowerCase();
  const emitirEmContingenciaOffline = mode === "contingencia_offline";
  const transmitirXmlContingencia = mode === "transmitir_contingencia_xml";

  if (!vendaId) {
    return {
      success: false,
      status: nfceStatus.REJEITADA,
      message: "Venda inválida para emissão de NFC-e.",
      vendaId: null,
    };
  }

  if (!readiness.ready) {
    return {
      success: false,
      status: nfceStatus.PENDENTE,
      message: readiness.reason,
      vendaId,
    };
  }

  try {
    const sequencial = reserveNextNfceNumber(vendaId);
    const nfceAtual = getNfceByVendaId(vendaId);
    const context = loadNfceContext(vendaId, readiness.fiscal, sequencial, {
      tpEmis: emitirEmContingenciaOffline ? TP_EMIS_CONTINGENCIA_OFFLINE : TP_EMIS_NORMAL,
      contingenciaEm: nfceAtual?.contingencia_em || options.contingenciaEm || new Date().toISOString(),
      contingenciaJustificativa:
        nfceAtual?.contingencia_justificativa ||
        options.contingenciaJustificativa ||
        "Falha de comunicação com a SEFAZ ou indisponibilidade temporária da internet no PDV.",
    });
    const xmlContingencia =
      options.xmlContent || nfceAtual?.xml_assinado || nfceAtual?.xml || null;
    const workerResult = await runNfceEmissionWorker({
      tenantId: Number(readiness.fiscal.tenant_erp_id),
      vendaId,
      context,
      certificadoBase64: readiness.fiscal.certificado_conteudo_base64,
      certificadoSenha: readiness.fiscal.certificado_senha,
      operation: emitirEmContingenciaOffline
        ? "emitir_contingencia_offline"
        : transmitirXmlContingencia
          ? "transmitir_xml_contingencia"
          : "emitir_normal",
      formaEmissao: emitirEmContingenciaOffline
        ? ACBR_FORMA_EMISSAO_OFFLINE
        : ACBR_FORMA_EMISSAO_NORMAL,
      xmlContent: transmitirXmlContingencia ? xmlContingencia : null,
    });

    if (emitirEmContingenciaOffline) {
      const contingenciaEm = context.nfce.dh_contingencia || new Date().toISOString();
      const contingenciaJustificativa = normalizeContingenciaJustificativa(
        context.nfce.x_justificativa_contingencia,
      );
      const xmlGerado = workerResult.postXml || workerResult.preXml || null;

      updateNfceResult(vendaId, {
        status: nfceStatus.CONTINGENCIA,
        numero: sequencial.numero,
        serie: sequencial.serie,
        ambiente: sequencial.ambiente,
        chave_acesso: workerResult.chaveAcesso || null,
        cstat: "OFFLINE",
        motivo: contingenciaJustificativa,
        xml: xmlGerado,
        xml_assinado: xmlGerado,
        xml_retorno: null,
        raw_retorno: null,
        pdf_path: workerResult.pdfPath || null,
        tp_emis: TP_EMIS_CONTINGENCIA_OFFLINE,
        contingencia_em: contingenciaEm,
        contingencia_justificativa: contingenciaJustificativa,
      });

      return {
        success: false,
        status: nfceStatus.CONTINGENCIA,
        requiresOfflineDecision: false,
        vendaId,
        numero: sequencial.numero,
        serie: sequencial.serie,
        chave_acesso: workerResult.chaveAcesso || null,
        protocolo: null,
        recibo: null,
        cStat: "OFFLINE",
        xMotivo: contingenciaJustificativa,
        message: "NFC-e emitida em contingência offline. Reenvie quando a SEFAZ voltar a responder.",
        pdfPath: workerResult.pdfPath || null,
      };
    }

    const metadata = parseWorkerNfceResult(workerResult.rawResponse, vendaId);
    const status =
      metadata.mappedStatus === "autorizada"
        ? nfceStatus.AUTORIZADA
        : metadata.mappedStatus === "cancelada"
          ? nfceStatus.CANCELADA
          : metadata.mappedStatus === "rejeitada"
            ? isContingenciaCandidate({ cStat: metadata.cStat, message: metadata.xMotivo })
              ? nfceStatus.CONTINGENCIA
              : nfceStatus.REJEITADA
            : isContingenciaCandidate({ cStat: metadata.cStat, message: metadata.xMotivo })
              ? nfceStatus.CONTINGENCIA
              : nfceStatus.PENDENTE;
    const requiresOfflineDecision = !transmitirXmlContingencia && status === nfceStatus.CONTINGENCIA;
    const persistedStatus = requiresOfflineDecision ? nfceStatus.PENDENTE : status;

    updateNfceResult(vendaId, {
      status: persistedStatus,
      numero: metadata.numero || sequencial.numero,
      serie: metadata.serie || sequencial.serie,
      ambiente: sequencial.ambiente,
      chave_acesso: metadata.chaveAcesso || workerResult.chaveAcesso || null,
      recibo: metadata.recibo,
      protocolo: metadata.protocolo,
      cstat: metadata.cStat,
      motivo: metadata.xMotivo || "Retorno da emissão NFC-e.",
      xml: workerResult.postXml || workerResult.preXml || null,
      xml_assinado: workerResult.postXml || workerResult.preXml || null,
      xml_retorno: workerResult.postXml || null,
      raw_retorno: metadata.raw,
      pdf_path: workerResult.pdfPath || null,
      tp_emis: transmitirXmlContingencia ? TP_EMIS_CONTINGENCIA_OFFLINE : TP_EMIS_NORMAL,
    });

    return {
      success: status === nfceStatus.AUTORIZADA,
      status,
      requiresOfflineDecision,
      vendaId,
      numero: metadata.numero || sequencial.numero,
      serie: metadata.serie || sequencial.serie,
      chave_acesso: metadata.chaveAcesso || workerResult.chaveAcesso || null,
      protocolo: metadata.protocolo || null,
      recibo: metadata.recibo || null,
      cStat: metadata.cStat || null,
      xMotivo: metadata.xMotivo || null,
      message:
        metadata.xMotivo ||
        (status === nfceStatus.AUTORIZADA
          ? transmitirXmlContingencia
            ? "NFC-e de contingência transmitida e autorizada pela SEFAZ."
            : "NFC-e autorizada pela SEFAZ."
          : status === nfceStatus.CONTINGENCIA
            ? transmitirXmlContingencia
              ? "A NFC-e em contingência ainda não pôde ser transmitida."
              : "Não foi possível transmitir a NFC-e. É possível emitir em contingência offline."
            : "NFC-e enviada para processamento."),
      pdfPath: workerResult.pdfPath || null,
    };
  } catch (error) {
    const contingencyCandidate = isContingenciaCandidate({
      message: error.message || error.details?.stderr || "",
    });
    const status = contingencyCandidate ? nfceStatus.CONTINGENCIA : nfceStatus.REJEITADA;
    const requiresOfflineDecision = !transmitirXmlContingencia && !emitirEmContingenciaOffline && contingencyCandidate;
    const persistedStatus = requiresOfflineDecision ? nfceStatus.PENDENTE : status;

    updateNfceResult(vendaId, {
      status: persistedStatus,
      motivo: error.message,
      raw_retorno: error.details?.workerResult?.lastReturn || null,
      tp_emis: emitirEmContingenciaOffline || transmitirXmlContingencia
        ? TP_EMIS_CONTINGENCIA_OFFLINE
        : TP_EMIS_NORMAL,
      contingencia_em: emitirEmContingenciaOffline ? options.contingenciaEm || new Date().toISOString() : null,
      contingencia_justificativa: emitirEmContingenciaOffline
        ? normalizeContingenciaJustificativa(options.contingenciaJustificativa || error.message)
        : null,
    });

    return {
      success: false,
      status,
      requiresOfflineDecision,
      message:
        requiresOfflineDecision
          ? error.message || "Não foi possível transmitir a NFC-e. É possível emitir em contingência offline."
          : status === nfceStatus.CONTINGENCIA
            ? error.message ||
              "A SEFAZ não respondeu. A NFC-e permanece em contingência até novo envio."
            : error.message || "Falha ao emitir NFC-e.",
      vendaId,
    };
  }
}

export async function consultarStatusFiscal() {
  const readiness = validarProntidaoNfce();

  return {
    success: true,
    mode: env.acbrMode || "lib",
    ready: readiness.ready,
    diagnostics: readiness.diagnostics || null,
    message: readiness.ready
      ? `Terminal preparado para NFC-e com ACBrLib.`
      : readiness.reason,
  };
}
