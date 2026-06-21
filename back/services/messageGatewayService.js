const parseResponse = async (response) => {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text || null;
  }
};

const getBaseConfig = () => {
  const baseUrl = String(process.env.MESSAGE_SERVICE_URL || "").trim().replace(/\/$/, "");
  const token = String(process.env.MESSAGE_SERVICE_TOKEN || "").trim();

  if (!baseUrl) {
    throw new Error("MESSAGE_SERVICE_URL não configurada.");
  }

  if (!token) {
    throw new Error("MESSAGE_SERVICE_TOKEN não configurado.");
  }

  return { baseUrl, token };
};

const doRequest = async ({ method = "GET", path, body } = {}) => {
  const { baseUrl, token } = getBaseConfig();

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-service-token": token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || "Não foi possível comunicar com o serviço de mensagens."
    );
  }

  return data;
};

export const enviarWhatsAppTexto = async (payload) =>
  doRequest({
    method: "POST",
    path: "/internal/whatsapp/send-text",
    body: payload,
  });

export const criarInstanciaWhatsApp = async (payload) =>
  doRequest({
    method: "POST",
    path: "/internal/whatsapp/instance",
    body: payload,
  });

export const obterQrCodeWhatsApp = async (instanceName) =>
  doRequest({
    method: "GET",
    path: `/internal/whatsapp/instance/${encodeURIComponent(instanceName)}/qrcode`,
  });

export const obterStatusWhatsApp = async (instanceName) =>
  doRequest({
    method: "GET",
    path: `/internal/whatsapp/instance/${encodeURIComponent(instanceName)}/status`,
  });

export const reiniciarInstanciaWhatsApp = async (instanceName) =>
  doRequest({
    method: "PUT",
    path: `/internal/whatsapp/instance/${encodeURIComponent(instanceName)}/restart`,
  });

export const desconectarInstanciaWhatsApp = async (instanceName) =>
  doRequest({
    method: "DELETE",
    path: `/internal/whatsapp/instance/${encodeURIComponent(instanceName)}/logout`,
  });

export const excluirInstanciaWhatsApp = async (instanceName) =>
  doRequest({
    method: "DELETE",
    path: `/internal/whatsapp/instance/${encodeURIComponent(instanceName)}`,
  });
