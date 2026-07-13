import { env } from "../config/env.js";

const DEFAULT_TIMEOUT_MS = 3500;

function normalizeUrl(url) {
  const value = String(url || "").trim();
  if (!value) return null;
  return value.replace(/\/+$/, "");
}

function buildCheckTargets() {
  const erpApiUrl = normalizeUrl(env.erpApiUrl);
  const targets = [
    erpApiUrl,
    "https://www.google.com/generate_204",
    "https://www.uol.com.br",
  ].filter(Boolean);

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

export async function verificarConectividadeInternet() {
  const targets = buildCheckTargets();

  if (!targets.length) {
    return {
      online: false,
      checkedAt: new Date().toISOString(),
      targets: [],
      message: "Nao foi possivel validar a internet porque a retaguarda nao esta configurada.",
    };
  }

  const results = await Promise.all(targets.map((url) => probeUrl(url)));
  const online = results.some((item) => item.ok);

  return {
    online,
    checkedAt: new Date().toISOString(),
    targets: results,
    message: online
      ? "Conectividade externa validada."
      : "Nao foi possivel comunicar com a retaguarda nem com os endpoints de internet configurados.",
  };
}
