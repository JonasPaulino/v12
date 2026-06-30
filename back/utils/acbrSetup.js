const getAcbrServiceBaseUrl = () => {
  const configured = String(process.env.ACBR_SERVICE_URL || "").trim();
  return configured || "http://acbr:4100";
};

const extractFiscalReturn = (text = "") => {
  const raw = String(text || "");
  const cStat =
    raw.match(/\bCStat\s*=\s*(\d{3})/i)?.[1] ||
    raw.match(/\bcStat\s*[:=]\s*"?(\d{3})"?/i)?.[1] ||
    raw.match(/(?:^|[\r\n])\s*(\d{3})\s*(?:[\r\n:-]|$)/)?.[1] ||
    raw.match(/Rejei[cç][aã]o\s+(\d{3})/i)?.[1] ||
    null;
  const xMotivo =
    raw.match(/\bXMotivo\s*=\s*([^\r\n]+)/i)?.[1]?.trim() ||
    raw.match(/\bxMotivo\s*[:=]\s*"?([^"\r\n}]+)/i)?.[1]?.trim() ||
    raw.match(/Rejei[cç][aã]o\s*:\s*([^\r\n]+)/i)?.[0]?.trim() ||
    null;

  return { cStat, xMotivo };
};

export const consultarInscricaoEstadualAcbr = async ({
  token,
  certificadoBase64,
  certificadoSenha,
  cnpj,
  uf,
  ambiente = "2",
}) => {
  const response = await fetch(`${getAcbrServiceBaseUrl()}/setup/company-preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Cookie: `token=${encodeURIComponent(token)}` } : {}),
    },
    body: JSON.stringify({
      certificado: {
        conteudo_base64: certificadoBase64,
        senha: certificadoSenha,
      },
      cnpj,
      uf,
      ambiente,
    }),
  });

  const rawText = await response.text();
  let payload = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.message ||
        payload?.error ||
        rawText.slice(0, 200) ||
        `Falha ao consultar inscrição estadual no ACBr (${response.status}).`;
    const error = new Error(message);
    const fiscalReturn = extractFiscalReturn(`${message}\n${rawText}`);
    error.cStat = fiscalReturn.cStat;
    error.xMotivo = fiscalReturn.xMotivo;
    error.status = response.status;
    throw error;
  }

  return payload?.data || payload;
};

export const consultarXmlNfePorChaveAcbr = async ({ token, chaveAcesso }) => {
  const response = await fetch(`${getAcbrServiceBaseUrl()}/nfe/distribuicao-chave`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Cookie: `token=${encodeURIComponent(token)}` } : {}),
    },
    body: JSON.stringify({
      chave_acesso: chaveAcesso,
    }),
  });

  const rawText = await response.text();
  let payload = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.message ||
        payload?.error ||
        rawText.slice(0, 200) ||
        `Falha ao consultar XML da NF-e no ACBr (${response.status}).`;
    const error = new Error(message);
    const fiscalReturn = extractFiscalReturn(`${message}\n${rawText}`);
    error.cStat = fiscalReturn.cStat;
    error.xMotivo = fiscalReturn.xMotivo;
    error.status = response.status;
    throw error;
  }

  return payload?.data || payload;
};
