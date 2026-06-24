const stripTags = (xml = "") => String(xml || "").replace(/<\?xml[\s\S]*?\?>/i, "");

const extractTagValue = (xml = "", tagName = "") => {
  const tag = String(tagName || "").trim();
  if (!tag) return "";

  const patterns = [
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"),
    new RegExp(`<[^:>]+:${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</[^:>]+:${tag}>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = String(xml || "").match(pattern);
    if (match) return String(match[1] || "").trim();
  }

  return "";
};

const extractFirstInfCadBlock = (xml = "") => {
  const match = String(xml || "").match(/<infCad\b[^>]*>([\s\S]*?)<\/infCad>/i);
  return match ? match[1] : "";
};

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const mapSituacaoCadastro = (cSit) => {
  if (String(cSit || "").trim() === "1") return "habilitado";
  if (String(cSit || "").trim() === "0") return "nao_habilitado";
  return "";
};

export const parseConsultaCadastroResponse = (rawXml = "") => {
  const xml = stripTags(rawXml);
  const infCons = extractTagValue(xml, "infCons");
  const infCad = extractFirstInfCadBlock(xml);

  const cStat = extractTagValue(infCons || xml, "cStat");
  const xMotivo = extractTagValue(infCons || xml, "xMotivo");
  const ufConsultada = extractTagValue(infCons || xml, "UF");
  const cnpj = onlyDigits(
    extractTagValue(infCons || xml, "CNPJ") || extractTagValue(infCons || xml, "CPF")
  );

  const ie =
    extractTagValue(infCad, "IEAtual") ||
    extractTagValue(infCad, "IEUnica") ||
    extractTagValue(infCad, "IE");

  const xNome = extractTagValue(infCad, "xNome");
  const xFant = extractTagValue(infCad, "xFant");
  const xRegApur = extractTagValue(infCad, "xRegApur");
  const cnae = extractTagValue(infCad, "CNAE");
  const dIniAtiv = extractTagValue(infCad, "dIniAtiv");
  const dUltSit = extractTagValue(infCad, "dUltSit");
  const dBaixa = extractTagValue(infCad, "dBaixa");
  const cSit = extractTagValue(infCad, "cSit");
  const indCredNFe = extractTagValue(infCad, "indCredNFe");
  const indCredCTe = extractTagValue(infCad, "indCredCTe");
  const xLgr = extractTagValue(infCad, "xLgr");
  const nro = extractTagValue(infCad, "nro");
  const xCpl = extractTagValue(infCad, "xCpl");
  const xBairro = extractTagValue(infCad, "xBairro");
  const cMun = extractTagValue(infCad, "cMun");
  const xMun = extractTagValue(infCad, "xMun");
  const cep = onlyDigits(extractTagValue(infCad, "CEP"));
  const ufLocal = extractTagValue(infCad, "UF");

  return {
    raw: rawXml,
    consulta_ok: cStat === "111" && Boolean(ie || xNome),
    consulta_erro: cStat === "111" ? "" : xMotivo || "",
    cStat,
    xMotivo,
    uf_consultada: ufConsultada,
    cnpj,
    empresa: {
      inscricao_estadual: ie,
      nome_razao: xNome,
      nome_fantasia: xFant,
      situacao_cadastro: mapSituacaoCadastro(cSit),
      cnae,
      regime_apuracao: xRegApur,
      data_inicio_atividade: dIniAtiv,
      data_ultima_situacao: dUltSit,
      data_baixa: dBaixa,
      indicador_nfe: indCredNFe,
      indicador_cte: indCredCTe,
      logradouro: xLgr,
      numero: nro,
      complemento: xCpl,
      bairro: xBairro,
      cidade: xMun,
      codigo_ibge: cMun,
      cep,
      uf: ufLocal || ufConsultada,
    },
  };
};
