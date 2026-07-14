import { nfceStatus } from "@v12-desktop/shared";
import { env } from "../../config/env.js";
import { getFiscalConfig } from "../../modules/configuracao/localFiscalConfigRepository.js";
import { getAcbrLibReadiness } from "../acbrlib/client.js";

export function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

const SUPPORTED_ICMS_CST_NORMAL = new Set(["00", "20"]);
const SUPPORTED_ICMS_CSOSN = new Set(["102", "103", "300", "400"]);
const SUPPORTED_PIS_CST = new Set(["01", "02", "49", "99"]);
const SUPPORTED_COFINS_CST = new Set(["01", "02", "49", "99"]);
const TRANSIENT_CSTAT = new Set(["103", "104", "105", "106", "108", "109"]);
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

export const TP_EMIS_NORMAL = 1;
export const TP_EMIS_CONTINGENCIA_OFFLINE = 9;
export const ACBR_FORMA_EMISSAO_NORMAL = "0";
export const ACBR_FORMA_EMISSAO_OFFLINE = "8";

export function hasClientIdentification(venda) {
  const tipoDocumento = String(venda?.cliente_tipo_documento || "").trim().toUpperCase();
  if (tipoDocumento === "ESTRANGEIRO") {
    return String(venda?.cliente_documento || "").trim().length > 0;
  }
  return onlyDigits(venda?.cliente_documento).length > 0;
}

export function validarProntidaoNfce() {
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

export function isContingenciaCandidate({ cStat = null, message = "" } = {}) {
  const normalizedCode = String(cStat || "").trim();
  if (TRANSIENT_CSTAT.has(normalizedCode)) {
    return true;
  }

  return TRANSIENT_ERROR_PATTERNS.some((pattern) => pattern.test(String(message || "")));
}

export function normalizeContingenciaJustificativa(message = "") {
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

export function validateFiscalItemSupport(item, crt) {
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

export function calculateFiscalTotals(itens = []) {
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

export function buildFiscalFailureResult({ readiness, vendaId }) {
  return {
    success: false,
    status: nfceStatus.PENDENTE,
    message: readiness.reason,
    vendaId,
  };
}

export function buildFiscalStatusMessage({ metadata, status, transmitirXmlContingencia }) {
  if (metadata.xMotivo) {
    return metadata.xMotivo;
  }

  if (status === nfceStatus.AUTORIZADA) {
    return transmitirXmlContingencia
      ? "NFC-e de contingência transmitida e autorizada pela SEFAZ."
      : "NFC-e autorizada pela SEFAZ.";
  }

  if (status === nfceStatus.CONTINGENCIA) {
    return transmitirXmlContingencia
      ? "A NFC-e em contingência ainda não pôde ser transmitida."
      : "Não foi possível transmitir a NFC-e. É possível emitir em contingência offline.";
  }

  return "NFC-e enviada para processamento.";
}

export function buildConsultaStatusFiscalResult(readiness) {
  return {
    success: true,
    mode: env.acbrMode || "lib",
    ready: readiness.ready,
    diagnostics: readiness.diagnostics || null,
    message: readiness.ready
      ? "Terminal preparado para NFC-e com ACBrLib."
      : readiness.reason,
  };
}
