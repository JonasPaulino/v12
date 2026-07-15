const CANCEL_WINDOW_BY_UF_MINUTES = {
  PE: 30,
};

function parseDateTime(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const hasExplicitTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const dateInput = hasExplicitTimezone ? normalized : `${normalized}Z`;
  const date = new Date(dateInput);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getNfceCancelWindowMinutes(uf) {
  return CANCEL_WINDOW_BY_UF_MINUTES[String(uf || "").trim().toUpperCase()] || null;
}

export function buildNfceCancelPolicy(venda, { emitenteUf } = {}) {
  const uf = String(emitenteUf || "").trim().toUpperCase();
  const prazoMinutos = getNfceCancelWindowMinutes(uf);
  const status = String(venda?.nfce_status || "").trim().toLowerCase();
  const baseDate =
    parseDateTime(venda?.emitida_em) ||
    parseDateTime(venda?.concluida_em) ||
    parseDateTime(venda?.criada_em);

  if (!prazoMinutos || status !== "autorizada" || !baseDate) {
    return {
      uf,
      prazoMinutos,
      baseDate: baseDate ? baseDate.toISOString() : null,
      deadlineAt: null,
      expired: false,
      canCancelFiscal: status === "autorizada",
      applies: Boolean(prazoMinutos && status === "autorizada"),
      message: null,
    };
  }

  const deadlineAt = new Date(baseDate.getTime() + prazoMinutos * 60 * 1000);
  const expired = Date.now() > deadlineAt.getTime();

  return {
    uf,
    prazoMinutos,
    baseDate: baseDate.toISOString(),
    deadlineAt: deadlineAt.toISOString(),
    expired,
    applies: true,
    canCancelFiscal: !expired,
    message: expired
      ? `Em ${uf}, o prazo de ${prazoMinutos} minutos para cancelamento da NFC-e já expirou.`
      : `Em ${uf}, a NFC-e pode ser cancelada em até ${prazoMinutos} minutos da autorização.`,
  };
}
