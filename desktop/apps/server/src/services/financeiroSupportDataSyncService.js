import { env } from "../config/env.js";
import { getTerminalConfig } from "../modules/configuracao/localConfigRepository.js";
import { getConfigValue, setConfigValue } from "./configLocalService.js";

const SUPPORT_DATA_KEY = "financeiro.support_data.receber";

function toBooleanFlag(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "sim", "yes", "t"].includes(normalized)) return true;
  if (["false", "0", "nao", "não", "no", "f"].includes(normalized)) return false;
  return defaultValue;
}

function toInteger(value, defaultValue = null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : defaultValue;
}

function toNumber(value, defaultValue = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function normalizeText(value, { fallback = "", maxLength = null, lowercase = false } = {}) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return fallback;

  const nextValue = lowercase ? normalized.toLowerCase() : normalized;
  return maxLength ? nextValue.slice(0, maxLength) : nextValue;
}

function removeDiacritics(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeFormaCodigo(descricao = "") {
  const normalized = removeDiacritics(descricao).toLowerCase().trim();
  if (!normalized) return "outros";
  if (normalized.includes("dinheiro")) return "dinheiro";
  if (normalized.includes("pix")) return "pix";
  if (normalized.includes("credito")) return "credito";
  if (normalized.includes("debito")) return "debito";
  if (normalized.includes("transfer")) return "outros";
  if (normalized.includes("boleto")) return "outros";
  return normalized.replace(/[^a-z0-9]+/g, "_");
}

function normalizeSupportData(data = {}) {
  const formasPagamento = Array.isArray(data.formasPagamento)
    ? data.formasPagamento.map((forma) => ({
        financeiro_forma_pagamento_id: toInteger(forma.financeiro_forma_pagamento_id),
        descricao: normalizeText(forma.descricao, { fallback: "Forma de pagamento" }),
        tipo: normalizeText(forma.tipo, { fallback: "receber", lowercase: true }),
        padrao: toBooleanFlag(forma.padrao, false),
        sincronizar_pdv: toBooleanFlag(forma.sincronizar_pdv, false),
        ordem: toInteger(forma.ordem, 0),
        codigo:
          forma.codigo ||
          normalizeFormaCodigo(forma.descricao || forma.tipo || forma.financeiro_forma_pagamento_id),
      }))
    : [];

  const condicoesPagamento = Array.isArray(data.condicoesPagamento)
    ? data.condicoesPagamento.map((condicao) => ({
        financeiro_condicao_pagamento_id: toInteger(condicao.financeiro_condicao_pagamento_id),
        descricao: normalizeText(condicao.descricao, { fallback: "À vista" }),
        tipo: normalizeText(condicao.tipo, { fallback: "receber", lowercase: true }),
        quantidade_parcelas: toInteger(condicao.quantidade_parcelas, 1),
        dias_primeiro_vencimento: toInteger(condicao.dias_primeiro_vencimento, 0),
        intervalo_dias: toInteger(condicao.intervalo_dias, 0),
        percentual_entrada: toNumber(condicao.percentual_entrada, 0),
        gera_boleto: toBooleanFlag(condicao.gera_boleto, false),
        padrao: toBooleanFlag(condicao.padrao, false),
      }))
    : [];

  const formaPagamentoPadrao =
    formasPagamento.find((item) => item.padrao) || formasPagamento[0] || null;
  const condicaoPagamentoPadrao =
    condicoesPagamento.find((item) => item.padrao) ||
    condicoesPagamento.find(
      (item) =>
        Number(item.financeiro_condicao_pagamento_id || 0) ===
        Number(data?.condicaoPagamentoPadrao?.financeiro_condicao_pagamento_id || 0),
    ) ||
    condicoesPagamento[0] ||
    null;

  return {
    condicoesPagamento,
    condicaoPagamentoPadrao,
    formasPagamento,
    formaPagamentoPadrao,
  };
}

async function fetchSupportDataFromErp({ tipo = "receber" } = {}) {
  const config = getTerminalConfig();
  if (!config?.tenant_erp_id) {
    throw new Error("PDV local ainda nao pareado com uma filial do ERP.");
  }

  if (!env.erpApiUrl || !env.erpSyncToken) {
    throw new Error("Sincronização do financeiro não configurada.");
  }

  const baseUrl = env.erpApiUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    tenant_id: String(config.tenant_erp_id),
    tipo,
  });
  const response = await fetch(
    `${baseUrl}/desktop/sync/financeiro/support-data?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${env.erpSyncToken}`,
      },
    },
  );

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    console.error("[desktop-sync] Falha ao sincronizar apoio financeiro", {
      tenantId: config.tenant_erp_id,
      tipo,
      status: response.status,
      response: result,
    });
    throw new Error(result.message || `ERP respondeu ${response.status}`);
  }

  return normalizeSupportData(result.data || {});
}

export async function syncFinanceiroSupportDataFromErp({ tipo = "receber", refresh = false } = {}) {
  const cacheKey = `${SUPPORT_DATA_KEY}.${tipo}`;
  const cached = getConfigValue(cacheKey);

  if (cached && !refresh) {
    try {
      return {
        success: true,
        data: normalizeSupportData(JSON.parse(cached)),
        cached: true,
      };
    } catch {
      // ignora cache corrompido e refaz a sincronização
    }
  }

  const data = await fetchSupportDataFromErp({ tipo });
  setConfigValue(cacheKey, JSON.stringify(data));

  return {
    success: true,
    data,
    cached: false,
  };
}

export async function getCachedFinanceiroSupportData({ tipo = "receber" } = {}) {
  const cacheKey = `${SUPPORT_DATA_KEY}.${tipo}`;
  const cached = getConfigValue(cacheKey);

  if (cached) {
    try {
      return {
        success: true,
        data: normalizeSupportData(JSON.parse(cached)),
        cached: true,
      };
    } catch {
      // fallback abaixo
    }
  }

  return syncFinanceiroSupportDataFromErp({ tipo, refresh: true });
}
