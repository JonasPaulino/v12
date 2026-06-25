const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
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
  return value || "--";
};

const buildAddress = (row, prefix) => {
  const parts = [
    row[`${prefix}_logradouro`],
    row[`${prefix}_numero`],
    row[`${prefix}_complemento`],
    row[`${prefix}_bairro`],
    row[`${prefix}_cidade`],
    row[`${prefix}_uf`],
    row[`${prefix}_cep`],
  ].filter(Boolean);

  return parts.join(", ");
};

const extractXmlValue = (xml, tag) => {
  const match = String(xml || "").match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "i"));
  return match?.[1] || "";
};

const buildLogoHtml = (nfe) => {
  if (!nfe.logo_conteudo || !nfe.logo_mime_type) return "";

  const base64 = Buffer.from(nfe.logo_conteudo).toString("base64");
  return `<img class="logo" src="data:${escapeHtml(nfe.logo_mime_type)};base64,${base64}" alt="Logo da filial" />`;
};

const buildAccessKey = (nfe) =>
  nfe.chave_acesso || extractXmlValue(nfe.xml_autorizado, "chNFe") || "--";

export const buildDanfeHtml = ({ nfe, itens }) => {
  const chave = buildAccessKey(nfe);
  const protocolo = nfe.protocolo || extractXmlValue(nfe.xml_autorizado, "nProt") || "--";
  const autorizacao =
    nfe.data_autorizacao ||
    extractXmlValue(nfe.xml_autorizado, "dhRecbto") ||
    nfe.atualizado_em;

  const rows = itens
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.codigo_produto || item.produto_id || "")}</td>
          <td>${escapeHtml(item.descricao || "")}</td>
          <td>${escapeHtml(item.ncm || "")}</td>
          <td>${escapeHtml(item.cfop || "")}</td>
          <td>${escapeHtml(item.unidade_comercial || "")}</td>
          <td class="num">${Number(item.quantidade || 0).toFixed(4)}</td>
          <td class="num">${formatCurrency(item.valor_unitario)}</td>
          <td class="num">${formatCurrency(item.valor_total)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>DANFE NF-e ${escapeHtml(nfe.numero || nfe.nfe_id)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #f1f5f9; color: #111827; font-family: Arial, Helvetica, sans-serif; }
          .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 8mm; background: #fff; }
          .danfe { border: 1px solid #111827; }
          .top { display: grid; grid-template-columns: 38mm 1fr 58mm; border-bottom: 1px solid #111827; min-height: 34mm; }
          .logoBox, .emitBox, .danfeBox { padding: 8px; border-right: 1px solid #111827; }
          .danfeBox { border-right: 0; text-align: center; display: grid; gap: 5px; align-content: center; }
          .logo { max-width: 100%; max-height: 26mm; object-fit: contain; }
          h1, h2, h3, p { margin: 0; }
          h1 { font-size: 18px; letter-spacing: .08em; }
          h2 { font-size: 13px; }
          h3 { font-size: 10px; text-transform: uppercase; color: #334155; }
          .small { font-size: 9px; line-height: 1.4; }
          .text { font-size: 10px; line-height: 1.45; }
          .section { border-bottom: 1px solid #111827; padding: 6px 8px; }
          .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
          .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
          .box { border: 1px solid #94a3b8; padding: 5px; min-height: 28px; }
          .label { display: block; font-size: 8px; color: #475569; text-transform: uppercase; margin-bottom: 2px; }
          .value { font-size: 10px; font-weight: 700; }
          .key { font-family: "Courier New", monospace; font-size: 12px; letter-spacing: .06em; word-break: break-all; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #111827; padding: 4px; font-size: 8.5px; vertical-align: top; }
          th { background: #e2e8f0; text-transform: uppercase; }
          .num { text-align: right; white-space: nowrap; }
          .total { display: flex; justify-content: flex-end; gap: 18px; font-size: 12px; font-weight: 700; }
          .watermark { color: #b91c1c; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          @media print {
            body { background: #fff; }
            .page { margin: 0; width: auto; min-height: auto; }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <div class="danfe">
            <section class="top">
              <div class="logoBox">${buildLogoHtml(nfe)}</div>
              <div class="emitBox">
                <h2>${escapeHtml(nfe.emitente_nome_razao || nfe.tenant_nome || "")}</h2>
                <p class="text">${escapeHtml(buildAddress(nfe, "emitente"))}</p>
                <p class="text">CNPJ: ${escapeHtml(formatDocument(nfe.emitente_cpf_cnpj))}</p>
                <p class="text">IE: ${escapeHtml(nfe.emitente_ie || "ISENTO")}</p>
              </div>
              <div class="danfeBox">
                <h1>DANFE</h1>
                <p class="small">Documento Auxiliar da Nota Fiscal Eletrônica</p>
                <p class="small">NF-e Nº <strong>${escapeHtml(nfe.numero || "--")}</strong></p>
                <p class="small">Série <strong>${escapeHtml(nfe.serie || "--")}</strong></p>
                ${
                  nfe.ambiente_nfe === "2"
                    ? `<p class="watermark">Homologação - sem valor fiscal</p>`
                    : ""
                }
              </div>
            </section>

            <section class="section">
              <span class="label">Chave de acesso</span>
              <p class="key">${escapeHtml(chave)}</p>
            </section>

            <section class="section grid3">
              <div class="box">
                <span class="label">Natureza da operação</span>
                <span class="value">${escapeHtml(nfe.natureza_operacao || "")}</span>
              </div>
              <div class="box">
                <span class="label">Protocolo de autorização</span>
                <span class="value">${escapeHtml(protocolo)}</span>
              </div>
              <div class="box">
                <span class="label">Data autorização</span>
                <span class="value">${escapeHtml(formatDateTime(autorizacao))}</span>
              </div>
            </section>

            <section class="section">
              <h3>Destinatário</h3>
              <div class="grid2">
                <div class="box">
                  <span class="label">Nome/Razão social</span>
                  <span class="value">${escapeHtml(nfe.destinatario_nome_razao || "")}</span>
                </div>
                <div class="box">
                  <span class="label">CPF/CNPJ</span>
                  <span class="value">${escapeHtml(formatDocument(nfe.destinatario_cpf_cnpj))}</span>
                </div>
              </div>
              <p class="text" style="margin-top: 5px;">${escapeHtml(buildAddress(nfe, "destinatario"))}</p>
            </section>

            <section class="section">
              <h3>Produtos / Serviços</h3>
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>NCM</th>
                    <th>CFOP</th>
                    <th>Un.</th>
                    <th>Qtd.</th>
                    <th>Vlr. unit.</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </section>

            <section class="section total">
              <span>Produtos: ${formatCurrency(nfe.valor_produtos)}</span>
              <span>Desconto: ${formatCurrency(nfe.valor_desconto)}</span>
              <span>Total NF-e: ${formatCurrency(nfe.valor_total)}</span>
            </section>

            <section class="section">
              <h3>Informações complementares</h3>
              <p class="text">${escapeHtml(nfe.observacao || "")}</p>
            </section>
          </div>
        </main>
      </body>
    </html>
  `;
};
