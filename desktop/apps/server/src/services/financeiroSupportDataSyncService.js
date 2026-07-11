import { env } from "../config/env.js";
import { getTerminalConfig } from "../modules/configuracao/localConfigRepository.js";
import { getConfigValue, setConfigValue } from "./configLocalService.js";

const SUPPORT_DATA_KEY = "financeiro.support_data.receber";

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
        ...forma,
        codigo:
          forma.codigo ||
          normalizeFormaCodigo(forma.descricao || forma.tipo || forma.financeiro_forma_pagamento_id),
      }))
    : [];

  const formaPagamentoPadrao =
    formasPagamento.find((item) => item.padrao) || formasPagamento[0] || null;

  return {
    condicoesPagamento: Array.isArray(data.condicoesPagamento) ? data.condicoesPagamento : [],
    condicaoPagamentoPadrao: data.condicaoPagamentoPadrao || null,
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
  const response = await fetch(
    `${baseUrl}/desktop/sync/financeiro/support-data?tipo=${encodeURIComponent(tipo)}`,
    {
      headers: {
        Authorization: `Bearer ${env.erpSyncToken}`,
      },
    },
  );

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
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
