import { env } from "../config/env.js";
import { getTerminalConfigStatus } from "../modules/configuracao/localConfigRepository.js";
import { verificarConectividadeInternet } from "./networkService.js";

const CHAT_CONNECTIVITY_CACHE_MS = 30000;

function getErpBaseUrl() {
  const baseUrl = String(env.erpApiUrl || "").trim().replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("A retaguarda do ERP nao esta configurada neste terminal.");
  }

  return baseUrl;
}

function getTerminalSummary() {
  const status = getTerminalConfigStatus();
  const config = status?.config || null;

  if (!config) return null;

  return {
    tenant_erp_id: config.tenant_erp_id || null,
    tenant_nome: config.tenant_nome || "",
    tenant_documento: config.tenant_documento || "",
    terminal_codigo: config.terminal_codigo || "",
    terminal_nome: config.terminal_nome || "",
    bloqueado: !!status?.bloqueado,
    motivo_bloqueio: status?.motivo_bloqueio || null,
  };
}

async function fetchErpChat(path, options = {}) {
  const response = await fetch(`${getErpBaseUrl()}/chat${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Nao foi possivel comunicar com o suporte.");
  }

  return data;
}

async function ensureErpSupportOnline() {
  const connectivity = await verificarConectividadeInternet({ cacheMs: CHAT_CONNECTIVITY_CACHE_MS });
  if (!connectivity?.erpOnline) {
    throw new Error(
      connectivity?.message ||
        "Nao foi possivel comunicar com o suporte porque a retaguarda do ERP nao respondeu.",
    );
  }

  return connectivity;
}

function buildInitialMessageContext(payload = {}, terminal = null) {
  const labels = [
    "Origem: PDV",
    terminal?.tenant_nome ? `Filial: ${terminal.tenant_nome}` : null,
    terminal?.terminal_nome ? `Terminal: ${terminal.terminal_nome}` : null,
  ].filter(Boolean);

  const mensagem = String(payload.mensagem || "").trim();
  if (!labels.length || !mensagem) return mensagem;

  return `[${labels.join(" | ")}]\n${mensagem}`;
}

export async function getChatSupportSnapshot() {
  const terminal = getTerminalSummary();
  if (!terminal) {
    return {
      available: false,
      active: false,
      reason: "O PDV local ainda nao foi configurado para uma filial.",
      connectivity: null,
      configuracao: null,
      categorias: [],
      terminal: null,
    };
  }

  const connectivity = await verificarConectividadeInternet({ cacheMs: CHAT_CONNECTIVITY_CACHE_MS });
  if (!connectivity?.erpOnline) {
    return {
      available: false,
      active: false,
      reason:
        connectivity?.message ||
        "Nao foi possivel comunicar com o suporte porque a retaguarda do ERP nao respondeu.",
      connectivity,
      configuracao: null,
      categorias: [],
      terminal,
    };
  }

  const result = await fetchErpChat("/config");
  const configuracao = result?.data?.configuracao || {};
  const categorias = Array.isArray(result?.data?.categorias) ? result.data.categorias : [];
  const active = configuracao?.chat_ativo !== false;

  return {
    available: active,
    active,
    reason: active ? null : "O chat de suporte esta indisponivel no momento.",
    connectivity,
    configuracao,
    categorias,
    terminal,
  };
}

export async function createChatSupportAttendance(payload = {}) {
  await ensureErpSupportOnline();
  const terminal = getTerminalSummary();
  const result = await fetchErpChat("/atendimentos", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      mensagem: buildInitialMessageContext(payload, terminal),
    }),
  });

  return result?.data || null;
}

export async function getChatSupportAttendance(token) {
  await ensureErpSupportOnline();
  const result = await fetchErpChat(`/atendimentos/${encodeURIComponent(token)}`);
  return result?.data || null;
}

export async function sendChatSupportMessage(token, conteudo) {
  await ensureErpSupportOnline();
  const result = await fetchErpChat(`/atendimentos/${encodeURIComponent(token)}/mensagens`, {
    method: "POST",
    body: JSON.stringify({ conteudo }),
  });

  return result?.data || null;
}

export async function rateChatSupportAttendance(token, payload = {}) {
  await ensureErpSupportOnline();
  const result = await fetchErpChat(`/atendimentos/${encodeURIComponent(token)}/avaliacao`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return result?.data || null;
}
