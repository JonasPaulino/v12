const getAcbrServiceBaseUrl = () => {
  const configured = String(process.env.ACBR_SERVICE_URL || "").trim();
  return configured || "http://acbr:4100";
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
    throw new Error(
      payload?.message ||
        payload?.error ||
        rawText.slice(0, 200) ||
        `Falha ao consultar inscrição estadual no ACBr (${response.status}).`
    );
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
    throw new Error(
      payload?.message ||
        payload?.error ||
        rawText.slice(0, 200) ||
        `Falha ao consultar XML da NF-e no ACBr (${response.status}).`
    );
  }

  return payload?.data || payload;
};
