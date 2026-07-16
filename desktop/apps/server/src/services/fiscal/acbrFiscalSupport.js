import { nfceStatus } from "@v12-desktop/shared";
import { env } from "../../config/env.js";
import { getFiscalConfig } from "../../modules/configuracao/localFiscalConfigRepository.js";
import { getAcbrLibReadiness } from "../acbrlib/client.js";

export function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function formatNfceDateTime(value = new Date()) {
  const parsed =
    value instanceof Date
      ? value
      : value
        ? new Date(value)
        : new Date();

  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const pad = (part) => String(Math.trunc(Math.abs(part))).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const timezoneMinutes = -date.getTimezoneOffset();
  const sign = timezoneMinutes >= 0 ? "+" : "-";
  const offsetHours = pad(timezoneMinutes / 60);
  const offsetMinutes = pad(timezoneMinutes % 60);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMinutes}`;
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
  /dns/i,
  /host\s+not\s+found/i,
  /getaddrinfo/i,
  /enotfound/i,
  /name\s+or\s+service\s+not\s+known/i,
  /temporary\s+failure\s+in\s+name\s+resolution/i,
  /servidor/i,
  /servi[cç]o.*indispon/i,
  /falha.*comunica/i,
  /nao foi possivel.*sefaz/i,
  /status.*paralisad/i,
];
const IMPORTED_ORIGINS = new Set(["1", "2", "3", "8"]);

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

function roundCurrency(value) {
  return Number(Number(value || 0).toFixed(2));
}

function calculateConfiguredTaxValues(item, total) {
  const reducao = Math.max(0, Math.min(100, Number(item.icms_reducao_base || 0)));
  const regimeNormal = String(item.crt_emitente || item.crt || "3") === "3";
  const icmsBase = regimeNormal ? roundCurrency(total * (1 - reducao / 100)) : 0;
  const icmsAliquota = Number(item.icms_aliquota || 0);
  const icmsValor = regimeNormal ? roundCurrency((icmsBase * icmsAliquota) / 100) : 0;
  const pisValor = roundCurrency((total * Number(item.pis_aliquota || 0)) / 100);
  const cofinsValor = roundCurrency((total * Number(item.cofins_aliquota || 0)) / 100);
  const ipiValor = roundCurrency((total * Number(item.ipi_aliquota || 0)) / 100);
  const fcpValor = regimeNormal
    ? roundCurrency((total * Number(item.icms_aliquota_fcp || 0)) / 100)
    : 0;

  return {
    icmsBase,
    icmsValor,
    pisValor,
    cofinsValor,
    ipiValor,
    fcpValor,
  };
}

export function calculateItemApproximateTaxes(item = {}) {
  const total = Number(item.valor_total || 0);
  const origem = String(item.origem_mercadoria || item.origem || "0").trim();
  const federalRate = IMPORTED_ORIGINS.has(origem)
    ? Number(item.ibpt_aliquota_federal_importado || 0)
    : Number(item.ibpt_aliquota_federal_nacional || 0);
  const estadualRate = Number(item.ibpt_aliquota_estadual || 0);
  const municipalRate = Number(item.ibpt_aliquota_municipal || 0);
  const hasIbpt = federalRate > 0 || estadualRate > 0 || municipalRate > 0;

  if (hasIbpt) {
    const federal = roundCurrency((total * federalRate) / 100);
    const estadual = roundCurrency((total * estadualRate) / 100);
    const municipal = roundCurrency((total * municipalRate) / 100);

    return {
      federal,
      estadual,
      municipal,
      total: roundCurrency(federal + estadual + municipal),
      fonte: String(item.ibpt_fonte || item.ibpt_chave || "IBPT").trim(),
      origem: "ibpt",
    };
  }

  const configured = calculateConfiguredTaxValues(item, total);
  const federal = roundCurrency(configured.pisValor + configured.cofinsValor + configured.ipiValor);
  const estadual = configured.icmsValor;

  return {
    federal,
    estadual,
    municipal: 0,
    total: roundCurrency(federal + estadual),
    fonte: "Cálculo fiscal V12",
    origem: "fallback",
  };
}

export function calculateFiscalTotals(itens = []) {
  const totals = itens.reduce(
    (acc, item) => {
      const total = Number(item.valor_total || 0);
      const configured = calculateConfiguredTaxValues(item, total);
      const approximate = calculateItemApproximateTaxes(item);

      acc.icms_base_total += configured.icmsBase;
      acc.icms_valor_total += configured.icmsValor;
      acc.icms_fcp_total += configured.fcpValor;
      acc.pis_valor_total += configured.pisValor;
      acc.cofins_valor_total += configured.cofinsValor;
      acc.ipi_valor_total += configured.ipiValor;
      acc.valor_tributos_federal += approximate.federal;
      acc.valor_tributos_estadual += approximate.estadual;
      acc.valor_tributos_municipal += approximate.municipal;
      acc.valor_tributos_total += approximate.total;
      if (approximate.fonte) {
        acc.fontes_tributos.add(approximate.fonte);
      }
      return acc;
    },
    {
      icms_base_total: 0,
      icms_valor_total: 0,
      icms_fcp_total: 0,
      pis_valor_total: 0,
      cofins_valor_total: 0,
      ipi_valor_total: 0,
      valor_tributos_federal: 0,
      valor_tributos_estadual: 0,
      valor_tributos_municipal: 0,
      valor_tributos_total: 0,
      fontes_tributos: new Set(),
    },
  );

  return {
    ...totals,
    icms_base_total: roundCurrency(totals.icms_base_total),
    icms_valor_total: roundCurrency(totals.icms_valor_total),
    icms_fcp_total: roundCurrency(totals.icms_fcp_total),
    pis_valor_total: roundCurrency(totals.pis_valor_total),
    cofins_valor_total: roundCurrency(totals.cofins_valor_total),
    ipi_valor_total: roundCurrency(totals.ipi_valor_total),
    valor_tributos_federal: roundCurrency(totals.valor_tributos_federal),
    valor_tributos_estadual: roundCurrency(totals.valor_tributos_estadual),
    valor_tributos_municipal: roundCurrency(totals.valor_tributos_municipal),
    valor_tributos_total: roundCurrency(totals.valor_tributos_total),
    fontes_tributos: Array.from(totals.fontes_tributos),
  };
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
