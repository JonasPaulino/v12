import { env } from "../config/env.js";

const DEFAULT_TIMEOUT_MS = 3500;
const ERP_TIMEOUT_MS = 5000;
let cachedConnectivity = null;

function normalizeUrl(url) {
  const value = String(url || "").trim();
  if (!value) return null;
  return value.replace(/\/+$/, "");
}

function buildPublicCheckTargets() {
  const erpApiUrl = normalizeUrl(env.erpApiUrl);
  const targets = [
    "https://www.google.com/generate_204",
    "https://www.uol.com.br",
  ].filter(Boolean);

  if (!erpApiUrl) {
    return [];
  }

  return [...new Set(targets)];
}

async function probeUrl(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });

    return {
      url,
      ok: true,
      status: response.status,
    };
  } catch (error) {
    return {
      url,
      ok: false,
      error: String(error?.message || error),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function verificarConectividadeInternet({ cacheMs = 0 } = {}) {
  if (
    cacheMs > 0 &&
    cachedConnectivity?.checkedAt &&
    Date.now() - new Date(cachedConnectivity.checkedAt).getTime() <= cacheMs
  ) {
    return {
      ...cachedConnectivity,
      cached: true,
    };
  }

  const erpApiUrl = normalizeUrl(env.erpApiUrl);
  const publicTargets = buildPublicCheckTargets();

  if (!erpApiUrl) {
    const result = {
      online: false,
      internetOnline: false,
      erpOnline: false,
      checkedAt: new Date().toISOString(),
      targets: [],
      message: "Não foi possível validar a internet porque a retaguarda não está configurada.",
    };
    cachedConnectivity = result;
    return result;
  }

  const [erpResult, ...publicResults] = await Promise.all([
    probeUrl(erpApiUrl, ERP_TIMEOUT_MS),
    ...publicTargets.map((url) => probeUrl(url)),
  ]);
  const internetOnline = publicResults.some((item) => item.ok);
  const erpOnline = !!erpResult?.ok;
  const online = erpOnline || internetOnline;

  const result = {
    online,
    internetOnline,
    erpOnline,
    checkedAt: new Date().toISOString(),
    targets: [erpResult, ...publicResults],
    message: erpOnline
      ? "Conectividade com a retaguarda validada."
      : internetOnline
        ? "A internet externa está ativa, mas a retaguarda do ERP não respondeu."
        : "Não foi possível comunicar com a retaguarda nem com os endpoints públicos de internet.",
  };
  cachedConnectivity = result;
  return result;
}
