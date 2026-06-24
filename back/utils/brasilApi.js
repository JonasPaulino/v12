const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const cleanText = (value) => String(value || "").trim();

const pickFirst = (...values) => {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
};

const normalizeInscricaoEstadual = (value) => {
  if (Array.isArray(value)) {
    return pickFirst(...value);
  }

  if (value && typeof value === "object") {
    return pickFirst(value?.inscricao_estadual, value?.ie, value?.number);
  }

  return cleanText(value);
};

const mapBrasilApiToEmpresa = (data = {}, cnpjFallback = "") => {
  const cnpj = onlyDigits(data.cnpj || cnpjFallback);
  const razaoSocial = pickFirst(data.razao_social, data.nome, data.nome_empresarial);
  const nomeFantasia = pickFirst(data.nome_fantasia, data.fantasia);
  const inscricaoEstadual = normalizeInscricaoEstadual(data.inscricoes_estaduais);
  const cep = onlyDigits(data.cep);
  const numero = pickFirst(data.numero);
  const complemento = pickFirst(data.complemento, data.complemento_endereco);
  const bairro = pickFirst(data.bairro);
  const cidade = pickFirst(data.municipio, data.cidade);
  const uf = pickFirst(data.uf);
  const codigoIbge = pickFirst(data.codigo_municipio, data.ibge_municipio);
  const telefone = pickFirst(data.ddd_telefone_1, data.ddd_telefone_2, data.telefone);
  const email = pickFirst(data.email);
  const logradouro = pickFirst(data.logradouro, data.rua, data.endereco);
  const situacaoCadastro = pickFirst(data.descricao_situacao_cadastral, data.situacao_cadastral);

  return {
    tenant_nome: nomeFantasia || razaoSocial || cnpj,
    nome_razao: razaoSocial || nomeFantasia || cnpj,
    nome_fantasia: nomeFantasia,
    cnpj,
    inscricao_estadual: inscricaoEstadual,
    inscricao_municipal: "",
    email,
    telefone,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
    codigo_ibge: codigoIbge,
    pais: "Brasil",
    situacao_cadastro: situacaoCadastro,
  };
};

export const consultarCnpjBrasilApi = async (cnpj) => {
  const documento = onlyDigits(cnpj);

  if (documento.length !== 14) {
    throw new Error("CNPJ inválido para consulta na BrasilAPI.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${documento}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Referer: "https://brasilapi.com.br/",
        "User-Agent": "v12/1.0 (+https://v12.jhes.com.br)",
      },
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
        payload?.errors?.[0]?.message ||
        rawText?.slice(0, 200) ||
        `Falha ao consultar CNPJ na BrasilAPI (${response.status}).`;
      const error = new Error(message);
      error.statusCode = response.status;
      error.responseBody = rawText;
      throw error;
    }

    return {
      raw: payload,
      empresa: mapBrasilApiToEmpresa(payload, documento),
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Consulta do CNPJ na BrasilAPI excedeu o tempo limite.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export { mapBrasilApiToEmpresa };
