import { nfceStatus } from "@v12-desktop/shared";
import {
  getNfceByVendaId,
  reserveNextNfceNumber,
  updateNfceResult,
} from "../modules/vendas/nfceRepository.js";
import { parseWorkerNfceResult, runNfceEmissionWorker } from "./acbrlib/client.js";
import { loadNfceContext } from "./fiscal/acbrFiscalContextBuilder.js";
import {
  ACBR_FORMA_EMISSAO_NORMAL,
  ACBR_FORMA_EMISSAO_OFFLINE,
  TP_EMIS_CONTINGENCIA_OFFLINE,
  TP_EMIS_NORMAL,
  buildConsultaStatusFiscalResult,
  buildFiscalFailureResult,
  buildFiscalStatusMessage,
  isContingenciaCandidate,
  normalizeContingenciaJustificativa,
  validarProntidaoNfce,
} from "./fiscal/acbrFiscalSupport.js";

function resolveFiscalStatus(metadata, transmitirXmlContingencia) {
  const baseStatus =
    metadata.mappedStatus === "autorizada"
      ? nfceStatus.AUTORIZADA
      : metadata.mappedStatus === "cancelada"
        ? nfceStatus.CANCELADA
        : metadata.mappedStatus === "rejeitada"
          ? nfceStatus.REJEITADA
          : nfceStatus.PENDENTE;

  if (baseStatus === nfceStatus.REJEITADA || baseStatus === nfceStatus.PENDENTE) {
    const contingencyCandidate = isContingenciaCandidate({
      cStat: metadata.cStat,
      message: metadata.xMotivo,
    });

    if (contingencyCandidate) {
      return {
        status: nfceStatus.CONTINGENCIA,
        requiresOfflineDecision: !transmitirXmlContingencia,
      };
    }
  }

  return {
    status: baseStatus,
    requiresOfflineDecision: false,
  };
}

function persistContingenciaOfflineResult({ vendaId, sequencial, context, workerResult }) {
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
    pdfBase64: workerResult.pdfBase64 || null,
    xml: workerResult.postXml || workerResult.preXml || null,
    danfceHtmlFallback: Boolean(workerResult.pdfUnsupported),
  };
}

function persistWorkerEmissionResult({
  vendaId,
  sequencial,
  metadata,
  workerResult,
  transmitirXmlContingencia,
}) {
  const { status, requiresOfflineDecision } = resolveFiscalStatus(metadata, transmitirXmlContingencia);
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
    message: buildFiscalStatusMessage({ metadata, status, transmitirXmlContingencia }),
    pdfPath: workerResult.pdfPath || null,
    pdfBase64: workerResult.pdfBase64 || null,
    xml: workerResult.postXml || workerResult.preXml || null,
    danfceHtmlFallback: Boolean(workerResult.pdfUnsupported),
  };
}

function persistFiscalError({
  vendaId,
  error,
  transmitirXmlContingencia,
  emitirEmContingenciaOffline,
  options,
}) {
  const contingencyCandidate = isContingenciaCandidate({
    message: error.message || error.details?.stderr || "",
  });
  const status = contingencyCandidate ? nfceStatus.CONTINGENCIA : nfceStatus.REJEITADA;
  const requiresOfflineDecision =
    !transmitirXmlContingencia &&
    !emitirEmContingenciaOffline &&
    contingencyCandidate;
  const persistedStatus = requiresOfflineDecision ? nfceStatus.PENDENTE : status;

  updateNfceResult(vendaId, {
    status: persistedStatus,
    motivo: error.message,
    raw_retorno: error.details?.workerResult?.lastReturn || null,
    tp_emis:
      emitirEmContingenciaOffline || transmitirXmlContingencia
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
          ? error.message || "A SEFAZ não respondeu. A NFC-e permanece em contingência até novo envio."
          : error.message || "Falha ao emitir NFC-e.",
    vendaId,
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
    return buildFiscalFailureResult({ readiness, vendaId });
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
    const xmlContingencia = options.xmlContent || nfceAtual?.xml_assinado || nfceAtual?.xml || null;

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
      const result = persistContingenciaOfflineResult({
        vendaId,
        sequencial,
        context,
        workerResult,
      });
      console.log("[desktop-fiscal] Resultado NFC-e", {
        vendaId,
        mode,
        status: result.status,
        success: result.success,
        message: result.message,
      });
      return result;
    }

    const metadata = parseWorkerNfceResult(workerResult.rawResponse, vendaId);
    const result = persistWorkerEmissionResult({
      vendaId,
      sequencial,
      metadata,
      workerResult,
      transmitirXmlContingencia,
    });
    console.log("[desktop-fiscal] Resultado NFC-e", {
      vendaId,
      mode,
      status: result.status,
      success: result.success,
      cStat: result.cStat,
      message: result.message,
    });
    return result;
  } catch (error) {
    const result = persistFiscalError({
      vendaId,
      error,
      transmitirXmlContingencia,
      emitirEmContingenciaOffline,
      options,
    });
    console.error("[desktop-fiscal] Falha NFC-e", {
      vendaId,
      mode,
      message: error?.message,
      details: error?.details || null,
      result,
    });
    return result;
  }
}

export async function consultarStatusFiscal() {
  const readiness = validarProntidaoNfce();
  return buildConsultaStatusFiscalResult(readiness);
}
