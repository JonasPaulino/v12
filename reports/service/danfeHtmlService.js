import bwipjs from "bwip-js";

const DANFE_TITLE = "DANFE";
const HOMOLOGATION_TEXT = "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatQty = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

const formatDateTime = (value) => {
  if (!value) return "";

  const raw = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) return raw;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
};

const formatDocument = (value) => {
  const digits = onlyDigits(value);
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  return value || "";
};

const formatCep = (value) => {
  const digits = onlyDigits(value);
  if (digits.length !== 8) return value || "";
  return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2");
};

const formatKey = (value) => {
  const digits = onlyDigits(value);
  if (digits.length !== 44) return value || "";
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
};

const extractFirstTag = (xml, tag) => {
  const match = String(xml || "").match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() || "";
};

const extractTag = (xml, tag) => {
  const section = extractFirstTag(xml, tag);
  if (section) return section;

  const selfClosing = String(xml || "").match(new RegExp(`<${tag}(?:\\s[^>]*)?\\/>`, "i"));
  return selfClosing?.[0] || "";
};

const extractNestedTag = (xml, parent, tag) => extractTag(extractTag(xml, parent), tag);

const extractAllSections = (xml, tag) =>
  [...String(xml || "").matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi"))].map(
    (match) => ({
      attrs: match[0].match(new RegExp(`<${tag}([^>]*)>`, "i"))?.[1] || "",
      body: match[1],
    })
  );

const extractFirstMatchingSection = (xml, tagPattern) => {
  const match = String(xml || "").match(new RegExp(`<(${tagPattern})(?:\\s[^>]*)?>([\\s\\S]*?)<\\/\\1>`, "i"));
  return match?.[2] || "";
};

const getAttr = (attrs, name) => {
  const match = String(attrs || "").match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match?.[1] || "";
};

const buildLogoHtml = (nfe) => {
  if (!nfe.logo_conteudo || !nfe.logo_mime_type) return `<div class="logo-placeholder">LOGO</div>`;

  const base64 = Buffer.from(nfe.logo_conteudo).toString("base64");
  return `<img class="logo" src="data:${escapeHtml(nfe.logo_mime_type)};base64,${base64}" alt="Logo da filial" />`;
};

const buildBarcodeSvg = (accessKey) => {
  const digits = onlyDigits(accessKey);
  if (digits.length !== 44) return "";

  try {
    return bwipjs.toSVG({
      bcid: "code128",
      text: digits,
      scaleX: 1,
      scaleY: 1,
      height: 14,
      includetext: false,
      paddingwidth: 0,
      paddingheight: 0,
    });
  } catch (error) {
    console.error("[reports:danfe] Falha ao gerar codigo de barras:", error);
    return "";
  }
};

const getAccessKey = (nfe) => {
  const xml = nfe.xml_autorizado || "";
  const infProtKey = extractNestedTag(xml, "infProt", "chNFe");
  const idMatch = xml.match(/<infNFe[^>]*Id="NFe(\d{44})"/i);
  return onlyDigits(nfe.chave_acesso || infProtKey || idMatch?.[1]);
};

const parseParty = (xml, tag, fallback = {}) => {
  const section = extractTag(xml, tag);
  const addressTag = tag === "emit" ? "enderEmit" : "enderDest";
  const address = extractTag(section, addressTag);

  return {
    nome: extractTag(section, "xNome") || fallback.nome || "",
    documento: extractTag(section, "CNPJ") || extractTag(section, "CPF") || fallback.documento || "",
    ie: extractTag(section, "IE") || fallback.ie || "",
    im: extractTag(section, "IM") || fallback.im || "",
    email: extractTag(section, "email") || fallback.email || "",
    telefone: extractTag(address, "fone") || fallback.telefone || "",
    logradouro: extractTag(address, "xLgr") || fallback.logradouro || "",
    numero: extractTag(address, "nro") || fallback.numero || "",
    complemento: extractTag(address, "xCpl") || fallback.complemento || "",
    bairro: extractTag(address, "xBairro") || fallback.bairro || "",
    codigoMunicipio: extractTag(address, "cMun") || fallback.codigoMunicipio || "",
    municipio: extractTag(address, "xMun") || fallback.municipio || "",
    uf: extractTag(address, "UF") || fallback.uf || "",
    cep: extractTag(address, "CEP") || fallback.cep || "",
  };
};

const buildAddressLine = (party) =>
  [
    party.logradouro,
    party.numero,
    party.complemento,
    party.bairro,
    [party.municipio, party.uf].filter(Boolean).join(" - "),
    formatCep(party.cep),
  ]
    .filter(Boolean)
    .join(", ");

const parseItems = (xml, fallbackItems = []) => {
  const dets = extractAllSections(xml, "det");
  if (!dets.length) {
    return fallbackItems.map((item, index) => ({
      item: index + 1,
      codigo: item.codigo_produto || item.produto_id || "",
      descricao: item.descricao || "",
      ncm: item.ncm || "",
      cst: item.icms_cst || item.icms_csosn || "",
      cfop: item.cfop || "",
      unidade: item.unidade_comercial || "",
      quantidade: item.quantidade || 0,
      unitario: item.valor_unitario || 0,
      total: item.valor_total || 0,
      baseIcms: item.icms_base || 0,
      valorIcms: item.icms_valor || 0,
      valorIpi: item.ipi_valor || 0,
      aliqIcms: item.icms_aliquota || 0,
      aliqIpi: item.ipi_aliquota || 0,
    }));
  }

  return dets.map(({ attrs, body }, index) => {
    const prod = extractTag(body, "prod");
    const imposto = extractTag(body, "imposto");
    const icms = extractTag(imposto, "ICMS");
    const icmsGroup = extractFirstMatchingSection(icms, "ICMS[A-Z0-9]+") || icms;
    const ipi = extractTag(imposto, "IPI");

    return {
      item: getAttr(attrs, "nItem") || index + 1,
      codigo: extractTag(prod, "cProd"),
      descricao: extractTag(prod, "xProd"),
      ncm: extractTag(prod, "NCM"),
      cst: extractTag(icmsGroup, "CST") || extractTag(icmsGroup, "CSOSN"),
      cfop: extractTag(prod, "CFOP"),
      unidade: extractTag(prod, "uCom"),
      quantidade: extractTag(prod, "qCom"),
      unitario: extractTag(prod, "vUnCom"),
      total: extractTag(prod, "vProd"),
      baseIcms: extractTag(icmsGroup, "vBC"),
      valorIcms: extractTag(icmsGroup, "vICMS"),
      valorIpi: extractTag(ipi, "vIPI"),
      aliqIcms: extractTag(icmsGroup, "pICMS"),
      aliqIpi: extractTag(ipi, "pIPI"),
    };
  });
};

const parseVolumes = (xml) => {
  const vol = extractNestedTag(xml, "transp", "vol");
  return {
    quantidade: extractTag(vol, "qVol"),
    especie: extractTag(vol, "esp"),
    marca: extractTag(vol, "marca"),
    numeracao: extractTag(vol, "nVol"),
    pesoBruto: extractTag(vol, "pesoB"),
    pesoLiquido: extractTag(vol, "pesoL"),
  };
};

const getPaymentRows = (xml) =>
  extractAllSections(xml, "detPag").map(({ body }) => ({
    forma: extractTag(body, "tPag"),
    valor: extractTag(body, "vPag"),
  }));

const field = (label, value, className = "") => `
  <div class="field ${className}">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value || "")}</strong>
  </div>
`;

const totalField = (label, value) => field(label, formatCurrency(value), "num");

const renderItems = (items) =>
  items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.codigo)}</td>
          <td class="desc">${escapeHtml(item.descricao)}</td>
          <td>${escapeHtml(item.ncm)}</td>
          <td>${escapeHtml(item.cst)}</td>
          <td>${escapeHtml(item.cfop)}</td>
          <td>${escapeHtml(item.unidade)}</td>
          <td class="num">${escapeHtml(formatQty(item.quantidade))}</td>
          <td class="num">${escapeHtml(formatCurrency(item.unitario))}</td>
          <td class="num">${escapeHtml(formatCurrency(item.total))}</td>
          <td class="num">${escapeHtml(formatCurrency(item.baseIcms))}</td>
          <td class="num">${escapeHtml(formatCurrency(item.valorIcms))}</td>
          <td class="num">${escapeHtml(formatCurrency(item.valorIpi))}</td>
          <td class="num">${escapeHtml(formatCurrency(item.aliqIcms))}</td>
          <td class="num">${escapeHtml(formatCurrency(item.aliqIpi))}</td>
        </tr>
      `
    )
    .join("");

export const buildDanfeHtml = ({ nfe, itens }) => {
  const xml = nfe.xml_autorizado || "";
  const ide = extractTag(xml, "ide");
  const total = extractNestedTag(xml, "total", "ICMSTot");
  const transp = extractTag(xml, "transp");
  const infProt = extractTag(xml, "infProt");
  const infAdic = extractTag(xml, "infAdic");
  const accessKey = getAccessKey(nfe);
  const barcodeSvg = buildBarcodeSvg(accessKey);

  const emitente = parseParty(xml, "emit", {
    nome: nfe.emitente_nome_razao || nfe.tenant_nome || "",
    documento: nfe.emitente_cpf_cnpj,
    ie: nfe.emitente_ie || "ISENTO",
    email: nfe.emitente_email,
    telefone: nfe.emitente_telefone,
    logradouro: nfe.emitente_logradouro,
    numero: nfe.emitente_numero,
    complemento: nfe.emitente_complemento,
    bairro: nfe.emitente_bairro,
    municipio: nfe.emitente_cidade,
    uf: nfe.emitente_uf,
    cep: nfe.emitente_cep,
  });

  const destinatario = parseParty(xml, "dest", {
    nome: nfe.destinatario_nome_razao,
    documento: nfe.destinatario_cpf_cnpj,
    ie: nfe.destinatario_ie,
    email: nfe.destinatario_email,
    telefone: nfe.destinatario_telefone,
    logradouro: nfe.destinatario_logradouro,
    numero: nfe.destinatario_numero,
    complemento: nfe.destinatario_complemento,
    bairro: nfe.destinatario_bairro,
    municipio: nfe.destinatario_cidade,
    uf: nfe.destinatario_uf,
    cep: nfe.destinatario_cep,
  });

  const items = parseItems(xml, itens);
  const volumes = parseVolumes(xml);
  const payments = getPaymentRows(xml);
  const protocolo = nfe.protocolo || extractTag(infProt, "nProt") || "";
  const dhRecbto = nfe.data_autorizacao || extractTag(infProt, "dhRecbto") || nfe.atualizado_em;
  const ambiente = extractTag(ide, "tpAmb") || nfe.ambiente_nfe;
  const numero = extractTag(ide, "nNF") || nfe.numero || nfe.nfe_id;
  const serie = extractTag(ide, "serie") || nfe.serie || "";
  const modelo = extractTag(ide, "mod") || nfe.modelo || "55";
  const dataEmissao = extractTag(ide, "dhEmi");
  const natOp = extractTag(ide, "natOp") || nfe.natureza_operacao || "";
  const infCpl = extractTag(infAdic, "infCpl") || nfe.observacao || "";
  const modFrete = extractTag(transp, "modFrete") || "9";

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>DANFE NF-e ${escapeHtml(numero)}</title>
        <style>
          @page { size: A4 portrait; margin: 6mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #e5e7eb;
            color: #000;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 8px;
          }
          .page {
            width: 198mm;
            min-height: 285mm;
            margin: 0 auto;
            background: #fff;
            padding: 0;
          }
          .danfe {
            width: 100%;
            border: 1px solid #000;
            background: #fff;
          }
          .receipt {
            display: grid;
            grid-template-columns: 1fr 42mm;
            border-bottom: 1px solid #000;
            min-height: 18mm;
          }
          .receipt-text {
            padding: 2mm;
            border-right: 1px solid #000;
            line-height: 1.25;
          }
          .receipt-sign {
            display: grid;
            grid-template-rows: 1fr 1fr;
          }
          .receipt-sign div:first-child { border-bottom: 1px solid #000; }
          .receipt-sign div { padding: 1mm; }
          .header {
            display: grid;
            grid-template-columns: 74mm 42mm 1fr;
            border-bottom: 1px solid #000;
            min-height: 42mm;
          }
          .emitente-box {
            display: grid;
            grid-template-columns: 23mm 1fr;
            gap: 2mm;
            padding: 2mm;
            border-right: 1px solid #000;
          }
          .logo, .logo-placeholder {
            width: 22mm;
            max-height: 20mm;
            object-fit: contain;
            align-self: start;
          }
          .logo-placeholder {
            border: 1px solid #777;
            display: grid;
            place-items: center;
            color: #777;
            height: 16mm;
            font-weight: 700;
          }
          .emitente-name {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 1mm;
          }
          .danfe-box {
            border-right: 1px solid #000;
            text-align: center;
            padding: 2mm 1mm;
          }
          .danfe-title {
            font-size: 22px;
            font-weight: 800;
            line-height: 1;
            letter-spacing: .5mm;
          }
          .danfe-subtitle {
            font-size: 8px;
            line-height: 1.25;
            margin: 1mm 0;
          }
          .operation {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border: 1px solid #000;
            margin: 1mm auto;
            width: 26mm;
            font-size: 8px;
          }
          .operation div:first-child { border-right: 1px solid #000; }
          .number-block {
            margin-top: 1mm;
            font-size: 10px;
            line-height: 1.35;
            font-weight: 700;
          }
          .key-box {
            padding: 2mm;
            display: grid;
            grid-template-rows: auto auto 1fr;
            gap: 1mm;
          }
          .barcode {
            height: 15mm;
            display: grid;
            place-items: center;
            overflow: hidden;
          }
          .barcode svg {
            max-width: 100%;
            height: 14mm;
          }
          .access-key {
            border: 1px solid #000;
            padding: 1mm;
            text-align: center;
            font-size: 10px;
            font-family: "Courier New", monospace;
            font-weight: 700;
            letter-spacing: .2mm;
          }
          .consulta {
            text-align: center;
            font-size: 7px;
            line-height: 1.25;
          }
          .section-title {
            background: #d9d9d9;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: .6mm 1mm;
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .grid {
            display: grid;
            border-bottom: 1px solid #000;
          }
          .g2 { grid-template-columns: 1fr 1fr; }
          .g3 { grid-template-columns: repeat(3, 1fr); }
          .g4 { grid-template-columns: repeat(4, 1fr); }
          .g5 { grid-template-columns: repeat(5, 1fr); }
          .g6 { grid-template-columns: repeat(6, 1fr); }
          .field {
            min-height: 8mm;
            padding: .8mm 1mm;
            border-right: 1px solid #000;
            overflow: hidden;
          }
          .grid .field:last-child { border-right: 0; }
          .field span {
            display: block;
            font-size: 6px;
            text-transform: uppercase;
            line-height: 1;
            margin-bottom: .8mm;
          }
          .field strong {
            display: block;
            font-size: 8.5px;
            line-height: 1.15;
            font-weight: 700;
          }
          .field.num strong { text-align: right; }
          .products {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .products th,
          .products td {
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: .7mm .6mm;
            vertical-align: top;
            line-height: 1.15;
          }
          .products th {
            background: #d9d9d9;
            text-transform: uppercase;
            text-align: center;
            font-size: 5.5px;
            font-weight: 800;
          }
          .products td {
            font-size: 6.5px;
          }
          .products th:last-child,
          .products td:last-child {
            border-right: 0;
          }
          .products .desc {
            font-size: 7px;
          }
          .num { text-align: right; white-space: nowrap; }
          .additional {
            display: grid;
            grid-template-columns: 1fr 60mm;
            border-bottom: 1px solid #000;
            min-height: 28mm;
          }
          .additional > div {
            padding: 1.5mm;
          }
          .additional > div:first-child {
            border-right: 1px solid #000;
          }
          .additional-title {
            font-size: 7px;
            text-transform: uppercase;
            font-weight: 800;
            margin-bottom: 1mm;
          }
          .additional-text {
            font-size: 7px;
            line-height: 1.25;
            white-space: pre-wrap;
          }
          .watermark {
            text-align: center;
            font-size: 9px;
            font-weight: 800;
            color: #900;
            border-bottom: 1px solid #000;
            padding: 1mm;
          }
          .footer {
            padding: 1mm;
            font-size: 6px;
            text-align: right;
          }
          @media print {
            body { background: #fff; }
            .page { margin: 0; width: auto; min-height: auto; }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <div class="danfe">
            <section class="receipt">
              <div class="receipt-text">
                RECEBEMOS DE ${escapeHtml(emitente.nome)} OS PRODUTOS E/OU SERVICOS CONSTANTES DA NOTA FISCAL ELETRONICA INDICADA ABAIXO.
                <br />
                EMISSAO: ${escapeHtml(formatDateTime(dataEmissao))} &nbsp; DESTINATARIO: ${escapeHtml(destinatario.nome)} &nbsp; VALOR TOTAL: R$ ${escapeHtml(formatCurrency(extractTag(total, "vNF") || nfe.valor_total))}
              </div>
              <div class="receipt-sign">
                <div>DATA DE RECEBIMENTO</div>
                <div>IDENTIFICACAO E ASSINATURA DO RECEBEDOR</div>
              </div>
            </section>

            <section class="header">
              <div class="emitente-box">
                ${buildLogoHtml(nfe)}
                <div>
                  <div class="emitente-name">${escapeHtml(emitente.nome)}</div>
                  <div>${escapeHtml(buildAddressLine(emitente))}</div>
                  <div>Fone: ${escapeHtml(emitente.telefone)}</div>
                </div>
              </div>
              <div class="danfe-box">
                <div class="danfe-title">${DANFE_TITLE}</div>
                <div class="danfe-subtitle">Documento Auxiliar da Nota Fiscal Eletronica</div>
                <div class="operation">
                  <div>0 - Entrada<br />1 - Saida</div>
                  <div style="font-size: 14px; font-weight: 800;">${escapeHtml(extractTag(ide, "tpNF") || "1")}</div>
                </div>
                <div class="number-block">
                  NF-e No. ${escapeHtml(numero)}<br />
                  Serie ${escapeHtml(serie)}<br />
                  Folha 1/1
                </div>
              </div>
              <div class="key-box">
                <div class="barcode">${barcodeSvg}</div>
                <div class="access-key">${escapeHtml(formatKey(accessKey))}</div>
                <div class="consulta">
                  Consulta de autenticidade no portal nacional da NF-e<br />
                  www.nfe.fazenda.gov.br/portal ou no site da SEFAZ autorizadora
                </div>
              </div>
            </section>

            ${ambiente === "2" ? `<div class="watermark">${HOMOLOGATION_TEXT}</div>` : ""}

            <section class="grid g3">
              ${field("Natureza da operacao", normalizeText(natOp))}
              ${field("Protocolo de autorizacao de uso", `${protocolo} ${formatDateTime(dhRecbto)}`)}
              ${field("Modelo / Serie / Numero", `${modelo} / ${serie} / ${numero}`)}
            </section>

            <section class="grid g3">
              ${field("Inscricao estadual", emitente.ie || "ISENTO")}
              ${field("Inscricao estadual subst. tributaria", extractTag(xml, "IEST"))}
              ${field("CNPJ", formatDocument(emitente.documento))}
            </section>

            <div class="section-title">Destinatario / Remetente</div>
            <section class="grid g3">
              ${field("Nome / Razao social", destinatario.nome)}
              ${field("CNPJ / CPF", formatDocument(destinatario.documento))}
              ${field("Data da emissao", formatDateTime(dataEmissao))}
            </section>
            <section class="grid g5">
              ${field("Endereco", [destinatario.logradouro, destinatario.numero, destinatario.complemento].filter(Boolean).join(", "))}
              ${field("Bairro / Distrito", destinatario.bairro)}
              ${field("CEP", formatCep(destinatario.cep))}
              ${field("Data saida / entrada", formatDateTime(extractTag(ide, "dhSaiEnt")))}
              ${field("Hora saida / entrada", "")}
            </section>
            <section class="grid g5">
              ${field("Municipio", destinatario.municipio)}
              ${field("Fone / Fax", destinatario.telefone)}
              ${field("UF", destinatario.uf)}
              ${field("Inscricao estadual", destinatario.ie || "ISENTO")}
              ${field("E-mail", destinatario.email)}
            </section>

            <div class="section-title">Fatura / Duplicatas</div>
            <section class="grid ${payments.length > 1 ? "g4" : "g2"}">
              ${payments.length ? payments.map((payment, index) => field(`Pagamento ${index + 1} - ${payment.forma}`, formatCurrency(payment.valor), "num")).join("") : field("Pagamento", "Sem informacao")}
            </section>

            <div class="section-title">Calculo do imposto</div>
            <section class="grid g6">
              ${totalField("Base de calculo do ICMS", extractTag(total, "vBC"))}
              ${totalField("Valor do ICMS", extractTag(total, "vICMS"))}
              ${totalField("Base calculo ICMS ST", extractTag(total, "vBCST"))}
              ${totalField("Valor do ICMS ST", extractTag(total, "vST"))}
              ${totalField("Valor total dos produtos", extractTag(total, "vProd") || nfe.valor_produtos)}
              ${totalField("Valor total da nota", extractTag(total, "vNF") || nfe.valor_total)}
            </section>
            <section class="grid g6">
              ${totalField("Valor do frete", extractTag(total, "vFrete"))}
              ${totalField("Valor do seguro", extractTag(total, "vSeg"))}
              ${totalField("Desconto", extractTag(total, "vDesc") || nfe.valor_desconto)}
              ${totalField("Outras despesas", extractTag(total, "vOutro"))}
              ${totalField("Valor do IPI", extractTag(total, "vIPI"))}
              ${totalField("Valor aproximado tributos", extractTag(total, "vTotTrib"))}
            </section>

            <div class="section-title">Transportador / Volumes transportados</div>
            <section class="grid g6">
              ${field("Razao social", extractNestedTag(transp, "transporta", "xNome"))}
              ${field("Frete por conta", modFrete)}
              ${field("Codigo ANTT", extractNestedTag(transp, "veicTransp", "RNTC"))}
              ${field("Placa do veiculo", extractNestedTag(transp, "veicTransp", "placa"))}
              ${field("UF", extractNestedTag(transp, "veicTransp", "UF"))}
              ${field("CNPJ / CPF", formatDocument(extractNestedTag(transp, "transporta", "CNPJ") || extractNestedTag(transp, "transporta", "CPF")))}
            </section>
            <section class="grid g6">
              ${field("Endereco", extractNestedTag(transp, "transporta", "xEnder"))}
              ${field("Municipio", extractNestedTag(transp, "transporta", "xMun"))}
              ${field("UF", extractNestedTag(transp, "transporta", "UF"))}
              ${field("Inscricao estadual", extractNestedTag(transp, "transporta", "IE"))}
              ${field("Quantidade", volumes.quantidade)}
              ${field("Especie", volumes.especie)}
            </section>
            <section class="grid g4">
              ${field("Marca", volumes.marca)}
              ${field("Numeracao", volumes.numeracao)}
              ${field("Peso bruto", volumes.pesoBruto, "num")}
              ${field("Peso liquido", volumes.pesoLiquido, "num")}
            </section>

            <div class="section-title">Dados dos produtos / servicos</div>
            <table class="products">
              <thead>
                <tr>
                  <th style="width: 14mm;">Codigo</th>
                  <th>Descricao dos produtos / servicos</th>
                  <th style="width: 13mm;">NCM/SH</th>
                  <th style="width: 10mm;">CST</th>
                  <th style="width: 10mm;">CFOP</th>
                  <th style="width: 9mm;">Unid.</th>
                  <th style="width: 13mm;">Qtd.</th>
                  <th style="width: 15mm;">Vlr. unit.</th>
                  <th style="width: 15mm;">Vlr. total</th>
                  <th style="width: 14mm;">BC ICMS</th>
                  <th style="width: 13mm;">Vlr. ICMS</th>
                  <th style="width: 13mm;">Vlr. IPI</th>
                  <th style="width: 10mm;">Aliq. ICMS</th>
                  <th style="width: 9mm;">Aliq. IPI</th>
                </tr>
              </thead>
              <tbody>${renderItems(items)}</tbody>
            </table>

            <section class="additional">
              <div>
                <div class="additional-title">Informacoes complementares</div>
                <div class="additional-text">${escapeHtml(normalizeText(infCpl))}</div>
              </div>
              <div>
                <div class="additional-title">Reservado ao fisco</div>
              </div>
            </section>

            <div class="footer">
              Gerado pelo V12 Reports a partir do XML autorizado da NF-e.
            </div>
          </div>
        </main>
      </body>
    </html>
  `;
};
