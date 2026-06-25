const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const decimal = (value, scale = 2) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toFixed(scale) : Number(0).toFixed(scale);
};

const escapeIniValue = (value) => String(value ?? "").replace(/\r?\n/g, " ").trim();

const appendSection = (lines, name, values = {}) => {
  lines.push(`[${name}]`);
  for (const [key, rawValue] of Object.entries(values)) {
    if (rawValue === undefined || rawValue === null || rawValue === "") continue;
    lines.push(`${key}=${escapeIniValue(rawValue)}`);
  }
  lines.push("");
};

const mapFinNFe = (finalidade) => {
  switch (String(finalidade || "").toLowerCase()) {
    case "complementar":
      return "2";
    case "ajuste":
      return "3";
    case "devolucao":
      return "4";
    default:
      return "1";
  }
};

const mapTpNF = (tipoOperacao) =>
  String(tipoOperacao || "").toLowerCase() === "entrada" ? "0" : "1";

const mapIdDest = ({ emitenteUf, destinatarioUf }) => {
  if (!destinatarioUf) return "1";
  return emitenteUf === destinatarioUf ? "1" : "2";
};

const mapIndIEDest = (destinatario) => {
  const ie = String(destinatario?.inscricao_estadual || "").trim();
  if (!ie) return "9";
  if (ie.toUpperCase() === "ISENTO") return "2";
  return "1";
};

const UF_CODES = {
  RO: "11",
  AC: "12",
  AM: "13",
  RR: "14",
  PA: "15",
  AP: "16",
  TO: "17",
  MA: "21",
  PI: "22",
  CE: "23",
  RN: "24",
  PB: "25",
  PE: "26",
  AL: "27",
  SE: "28",
  BA: "29",
  MG: "31",
  ES: "32",
  RJ: "33",
  SP: "35",
  PR: "41",
  SC: "42",
  RS: "43",
  MS: "50",
  MT: "51",
  GO: "52",
  DF: "53",
};

const getUfCode = (uf, codigoIbge) => {
  const normalizedUf = String(uf || "").trim().toUpperCase();
  return UF_CODES[normalizedUf] || onlyDigits(codigoIbge).slice(0, 2) || "35";
};

const buildDhEmi = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  return `${day}/${month}/${year}`;
};

const buildInfAdic = (context) => {
  const values = [];

  if (context.nfe.observacao) values.push(context.nfe.observacao);
  if (context.nfe.pedido_venda_id) values.push(`Pedido ${context.nfe.pedido_venda_id}`);

  return values.join(" | ");
};

export const buildNfeIni = (context) => {
  const { nfe, emitente, destinatario, itens, configuracao } = context;
  const lines = [];
  const cnpjEmitente = onlyDigits(emitente.cpf_cnpj);
  const cnpjDestinatario = onlyDigits(destinatario?.cpf_cnpj);
  const cUfEmitente = getUfCode(emitente.uf, emitente.codigo_ibge);
  const now = new Date();

  appendSection(lines, "infNFe", {
    versao: "4.00",
    Id: "",
  });

  appendSection(lines, "Identificacao", {
    cUF: cUfEmitente,
    cNF: String(nfe.codigo_numerico).padStart(8, "0"),
    natOp: nfe.natureza_operacao,
    modelo: "55",
    Serie: nfe.serie,
    nNF: nfe.numero,
    dhEmi: buildDhEmi(now),
    tpNF: mapTpNF(nfe.tipo_operacao),
    idDest: mapIdDest({
      emitenteUf: emitente.uf,
      destinatarioUf: destinatario?.uf,
    }),
    cMunFG: emitente.codigo_ibge,
    tpImp: "1",
    tpEmis: "1",
    cDV: "0",
    tpAmb: nfe.ambiente_nfe,
    finNFe: mapFinNFe(nfe.finalidade),
    indFinal: "1",
    indPres: "0",
    procEmi: "0",
    verProc: "v12",
  });

  appendSection(lines, "Emitente", {
    CNPJCPF: cnpjEmitente,
    xNome: emitente.nome_razao,
    xFant: emitente.nome_fantasia,
    IE: emitente.inscricao_estadual,
    IM: emitente.inscricao_municipal,
    CNAE: configuracao.cnae,
    CRT: configuracao.crt,
    xLgr: emitente.logradouro,
    nro: emitente.numero,
    xCpl: emitente.complemento,
    xBairro: emitente.bairro,
    cMun: emitente.codigo_ibge,
    xMun: emitente.cidade,
    UF: emitente.uf,
    CEP: onlyDigits(emitente.cep),
    cPais: "1058",
    xPais: emitente.pais || "Brasil",
    cUF: cUfEmitente,
    Fone: onlyDigits(emitente.telefone),
  });

  appendSection(lines, "Destinatario", {
    CNPJCPF: cnpjDestinatario,
    xNome: destinatario.nome_razao,
    IE: destinatario.inscricao_estadual,
    indIEDest: mapIndIEDest(destinatario),
    Email: destinatario.email,
    xLgr: destinatario.logradouro,
    nro: destinatario.numero,
    xCpl: destinatario.complemento,
    xBairro: destinatario.bairro,
    cMun: destinatario.codigo_ibge,
    xMun: destinatario.cidade,
    UF: destinatario.uf,
    CEP: onlyDigits(destinatario.cep),
    cPais: "1058",
    xPais: destinatario.pais || "Brasil",
    Fone: onlyDigits(destinatario.telefone),
  });

  itens.forEach((item, index) => {
    const suffix = String(index + 1).padStart(3, "0");
    const icms = item.imposto || {};

    appendSection(lines, `Produto${suffix}`, {
      nItem: index + 1,
      cProd: item.codigo_produto,
      cEAN: "",
      xProd: item.descricao,
      NCM: item.ncm,
      CEST: item.cest,
      CFOP: item.cfop,
      uCom: item.unidade_comercial || "UN",
      qCom: decimal(item.quantidade, 4),
      vUnCom: decimal(item.valor_unitario, 4),
      vProd: decimal(item.valor_total, 2),
      cEANTrib: "",
      uTrib: item.unidade_comercial || "UN",
      qTrib: decimal(item.quantidade, 4),
      vUnTrib: decimal(item.valor_unitario, 4),
      indTot: "1",
      vTotTrib: "0.00",
    });

    appendSection(lines, `ICMS${suffix}`, {
      orig: item.origem_mercadoria || "0",
      CST: configuracao.crt === "3" ? icms.icms_cst || "00" : undefined,
      CSOSN: configuracao.crt !== "3" ? icms.icms_csosn || "102" : undefined,
      modBC: "3",
      vBC: decimal(icms.icms_base, 2),
      pICMS: decimal(icms.icms_aliquota, 4),
      vICMS: decimal(icms.icms_valor, 2),
    });

    appendSection(lines, `PIS${suffix}`, {
      CST: icms.pis_cst || "99",
      vBC: "0.00",
      pPIS: decimal(icms.pis_aliquota, 4),
      vPIS: decimal(icms.pis_valor, 2),
    });

    appendSection(lines, `COFINS${suffix}`, {
      CST: icms.cofins_cst || "99",
      vBC: "0.00",
      pCOFINS: decimal(icms.cofins_aliquota, 4),
      vCOFINS: decimal(icms.cofins_valor, 2),
    });

    if (icms.ipi_cst || Number(icms.ipi_valor || 0) > 0) {
      appendSection(lines, `IPI${suffix}`, {
        CST: icms.ipi_cst || "99",
        vBC: "0.00",
        pIPI: decimal(icms.ipi_aliquota, 4),
        vIPI: decimal(icms.ipi_valor, 2),
      });
    }
  });

  appendSection(lines, "Total", {
    vBC: "0.00",
    vICMS: "0.00",
    vICMSDeson: "0.00",
    vFCP: "0.00",
    vBCST: "0.00",
    vST: "0.00",
    vFCPST: "0.00",
    vProd: decimal(nfe.valor_produtos, 2),
    vFrete: "0.00",
    vSeg: "0.00",
    vDesc: decimal(nfe.valor_desconto, 2),
    vII: "0.00",
    vIPI: "0.00",
    vPIS: "0.00",
    vCOFINS: "0.00",
    vOutro: decimal(nfe.valor_acrescimo, 2),
    vNF: decimal(nfe.valor_total, 2),
  });

  appendSection(lines, "Transportador", {
    modFrete: "9",
  });

  appendSection(lines, "pag001", {
    tPag: "90",
  });

  appendSection(lines, "infAdic", {
    infCpl: buildInfAdic(context),
  });

  return `${lines.join("\n").trim()}\n`;
};
