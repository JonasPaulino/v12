const parseResponse = async (response) => {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text || null;
  }
};

export const criarCobrancaPix = async (payload) => {
  const baseUrl = String(process.env.PAYMENTS_SERVICE_URL || "").trim().replace(/\/$/, "");
  const token = String(process.env.PAYMENTS_SERVICE_TOKEN || "").trim();

  if (!baseUrl) {
    throw new Error("PAYMENTS_SERVICE_URL não configurada.");
  }

  if (!token) {
    throw new Error("PAYMENTS_SERVICE_TOKEN não configurado.");
  }

  const response = await fetch(`${baseUrl}/internal/charges/pix`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-service-token": token,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || "Não foi possível comunicar com o serviço de pagamentos."
    );
  }

  return data;
};
