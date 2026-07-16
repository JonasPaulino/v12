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
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const normalizeDateInput = (value) => {
  if (value instanceof Date) return value;
  if (!value) return new Date();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const buildAcbrIniDateTime = (value = new Date()) => buildDhEmi(normalizeDateInput(value));

const mapIdDest = (emitenteUf, destinatarioUf) => {
  if (!destinatarioUf) return "1";
  return String(emitenteUf || "").trim().toUpperCase() ===
    String(destinatarioUf || "").trim().toUpperCase()
    ? "1"
    : "2";
};

const mapTpag = (forma) => {
  switch (String(forma || "").trim().toLowerCase()) {
    case "dinheiro":
      return "01";
    case "cheque":
      return "02";
    case "credito":
      return "03";
    case "debito":
      return "04";
    case "credito_loja":
      return "05";
    case "vale_alimentacao":
      return "10";
    case "vale_refeicao":
      return "11";
    case "vale_presente":
      return "12";
    case "vale_combustivel":
      return "13";
    case "duplicata":
      return "14";
    case "boleto":
      return "15";
    case "deposito":
      return "16";
    case "pix":
      return "17";
    case "transferencia":
      return "18";
    case "fidelidade":
      return "19";
    default:
      return "99";
  }
};

function appendDestinatario(lines, destinatario, emitenteUf) {
  if (!destinatario?.documento) {
    return;
  }

  const tipoDocumento = String(destinatario.tipo_documento || "").trim().toUpperCase();

  appendSection(lines, "Destinatario", {
    CNPJCPF: tipoDocumento === "ESTRANGEIRO" ? undefined : onlyDigits(destinatario.documento),
    idEstrangeiro: tipoDocumento === "ESTRANGEIRO" ? destinatario.documento : undefined,
    xNome: destinatario.nome || "CONSUMIDOR IDENTIFICADO",
    indIEDest: destinatario.tipo_documento === "CNPJ" ? "9" : "9",
    Email: destinatario.email || null,
    UF: destinatario.uf || emitenteUf,
  });
}

function appendProduto(lines, item, index, crt) {
  const suffix = String(index + 1).padStart(3, "0");
  const gtin = String(item.gtin || "").trim() || "SEM GTIN";
  const icmsBase = Number(item.icms_base || item.valor_total || 0);
  const icmsAliquota = Number(item.icms_aliquota || 0);
  const icmsValor = Number(item.icms_valor || (icmsBase * icmsAliquota) / 100 || 0);
  const pisBase = Number(item.pis_base || item.valor_total || 0);
  const pisAliquota = Number(item.pis_aliquota || 0);
  const pisValor = Number(item.pis_valor || (pisBase * pisAliquota) / 100 || 0);
  const cofinsBase = Number(item.cofins_base || item.valor_total || 0);
  const cofinsAliquota = Number(item.cofins_aliquota || 0);
  const cofinsValor = Number(item.cofins_valor || (cofinsBase * cofinsAliquota) / 100 || 0);
  const ipiBase = Number(item.ipi_base || item.valor_total || 0);
  const ipiAliquota = Number(item.ipi_aliquota || 0);
  const ipiValor = Number(item.ipi_valor || (ipiBase * ipiAliquota) / 100 || 0);

  appendSection(lines, `Produto${suffix}`, {
    nItem: index + 1,
    cProd: item.codigo_produto,
    cEAN: gtin,
    xProd: item.descricao,
    NCM: item.ncm,
    CEST: item.cest,
    CFOP: item.cfop,
    uCom: item.unidade || "UN",
    qCom: decimal(item.quantidade, 4),
    vUnCom: decimal(item.valor_unitario, 4),
    vProd: decimal(item.valor_total, 2),
    cEANTrib: gtin,
    uTrib: item.unidade || "UN",
    qTrib: decimal(item.quantidade, 4),
    vUnTrib: decimal(item.valor_unitario, 4),
    indTot: "1",
    vTotTrib: decimal(item.valor_tributos_total, 2),
  });

  if (String(crt || "3") === "3") {
    appendSection(lines, `ICMS${suffix}`, {
      orig: item.origem_mercadoria || "0",
      CST: item.icms_cst || "00",
      modBC: item.icms_modalidade_bc || "3",
      pRedBC: Number(item.icms_reducao_base || 0) > 0 ? decimal(item.icms_reducao_base, 4) : undefined,
      vBC: decimal(icmsBase, 2),
      pICMS: decimal(icmsAliquota, 4),
      vICMS: decimal(icmsValor, 2),
      pFCP: Number(item.icms_aliquota_fcp || 0) > 0 ? decimal(item.icms_aliquota_fcp, 4) : undefined,
    });
  } else {
    appendSection(lines, `ICMS${suffix}`, {
      orig: item.origem_mercadoria || "0",
      CSOSN: item.icms_csosn || "102",
    });
  }

  appendSection(lines, `PIS${suffix}`, {
    CST: item.pis_cst || "99",
    vBC: decimal(pisBase, 2),
    pPIS: decimal(pisAliquota, 4),
    vPIS: decimal(pisValor, 2),
  });

  appendSection(lines, `COFINS${suffix}`, {
    CST: item.cofins_cst || "99",
    vBC: decimal(cofinsBase, 2),
    pCOFINS: decimal(cofinsAliquota, 4),
    vCOFINS: decimal(cofinsValor, 2),
  });

  if (item.ipi_cst || ipiValor > 0) {
    appendSection(lines, `IPI${suffix}`, {
      CST: item.ipi_cst || "99",
      cEnq: item.ipi_enquadramento || "999",
      vBC: decimal(ipiBase, 2),
      pIPI: decimal(ipiAliquota, 4),
      vIPI: decimal(ipiValor, 2),
    });
  }
}

export function buildNfceIni(context) {
  const { nfce, emitente, destinatario, itens, pagamentos, responsavel_tecnico, configuracao } = context;
  const lines = [];
  const cUfEmitente = getUfCode(emitente.uf, emitente.codigo_ibge);
  const totalTroco = Math.max(0, Number(nfce.total_pago || 0) - Number(nfce.valor_total || 0));
  const tpEmis = String(nfce.tp_emis || "1");

  appendSection(lines, "infNFe", {
    versao: "4.00",
    Id: "",
  });

  appendSection(lines, "Identificacao", {
    cUF: cUfEmitente,
    cNF: String(nfce.codigo_numerico || 0).padStart(8, "0"),
    natOp: nfce.natureza_operacao,
    indPag: "0",
    mod: "65",
    serie: nfce.serie,
    nNF: nfce.numero,
    dhEmi: buildDhEmi(),
    tpNF: "1",
    idDest: mapIdDest(emitente.uf, destinatario?.uf),
    cMunFG: emitente.codigo_ibge,
    tpImp: "4",
    tpEmis,
    tpAmb: nfce.ambiente,
    finNFe: "1",
    indFinal: "1",
    indPres: nfce.ind_pres || configuracao.nfce_ind_pres_padrao || "1",
    procEmi: "0",
    verProc: "v12-pdv",
    // A ACBrLib aceita melhor no CarregarINI o datetime local no padrão brasileiro.
    // A serialização final para XML continua sendo responsabilidade da própria ACBr.
    dhCont: tpEmis !== "1" ? buildAcbrIniDateTime(nfce.dh_contingencia || new Date()) : undefined,
    xJust: tpEmis !== "1" ? nfce.x_justificativa_contingencia : undefined,
  });

  appendSection(lines, "Emitente", {
    CNPJCPF: onlyDigits(emitente.cpf_cnpj),
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

  appendDestinatario(lines, destinatario, emitente.uf);

  itens.forEach((item, index) => appendProduto(lines, item, index, configuracao.crt));

  appendSection(lines, "Total", {
    vBC: decimal(nfce.icms_base_total, 2),
    vICMS: decimal(nfce.icms_valor_total, 2),
    vICMSDeson: "0.00",
    vFCP: decimal(nfce.icms_fcp_total, 2),
    vBCST: "0.00",
    vST: "0.00",
    vFCPST: "0.00",
    vProd: decimal(nfce.valor_produtos, 2),
    vFrete: "0.00",
    vSeg: "0.00",
    vDesc: decimal(nfce.valor_desconto, 2),
    vII: "0.00",
    vIPI: decimal(nfce.ipi_valor_total, 2),
    vPIS: decimal(nfce.pis_valor_total, 2),
    vCOFINS: decimal(nfce.cofins_valor_total, 2),
    vOutro: "0.00",
    vNF: decimal(nfce.valor_total, 2),
    vTotTrib: decimal(nfce.valor_tributos_total, 2),
  });

  appendSection(lines, "Transportador", {
    modFrete: "9",
  });

  pagamentos.forEach((pagamento, index) => {
    appendSection(lines, `pag${String(index + 1).padStart(3, "0")}`, {
      indPag: "0",
      tPag: mapTpag(pagamento.forma),
      vPag: decimal(pagamento.valor, 2),
      vTroco: index === 0 && totalTroco > 0 ? decimal(totalTroco, 2) : undefined,
    });
  });

  if (responsavel_tecnico?.cnpj) {
    appendSection(lines, "infRespTec", {
      CNPJ: onlyDigits(responsavel_tecnico.cnpj),
      xContato: responsavel_tecnico.contato,
      email: responsavel_tecnico.email,
      fone: onlyDigits(responsavel_tecnico.telefone),
    });
  }

  if (nfce.observacao) {
    appendSection(lines, "DadosAdicionais", {
      infCpl: nfce.observacao,
    });
  }

  return `${lines.join("\n").trim()}\n`;
}
