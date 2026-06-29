import express from "express";
import NfeReportDAO from "../model/nfeReportDAO.js";
import { renderHtmlToPdf } from "../service/pdfService.js";

const router = express.Router();

const acbrBaseUrl = () =>
  String(process.env.ACBR_SERVICE_URL || "http://acbr:4100").replace(/\/+$/, "");

const contentDispositionFileName = (value, fallback) => {
  const match = String(value || "").match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const formatNumber = (value, digits = 2) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value || 0));

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const buildEndereco = (prefix, data = {}) =>
  [
    [data[`${prefix}_logradouro`], data[`${prefix}_numero`]].filter(Boolean).join(", "),
    data[`${prefix}_bairro`],
    [data[`${prefix}_cidade`], data[`${prefix}_uf`]].filter(Boolean).join(" - "),
    data[`${prefix}_cep`] ? `CEP ${data[`${prefix}_cep`]}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

const buildLogoDataUri = (nfe = {}) => {
  if (!nfe.logo_conteudo || !nfe.logo_mime_type) return "";
  const base64 = Buffer.from(nfe.logo_conteudo).toString("base64");
  return `data:${nfe.logo_mime_type};base64,${base64}`;
};

const buildPreviaNfeHtml = ({ nfe, itens }) => {
  const logo = buildLogoDataUri(nfe);
  const emitenteEndereco = buildEndereco("emitente", nfe);
  const destinatarioEndereco = buildEndereco("destinatario", nfe);
  const criadoEm = nfe.criado_em ? new Date(nfe.criado_em).toLocaleString("pt-BR") : "--";

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #172033;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
          }
          .page {
            position: relative;
            min-height: 100vh;
            padding: 18px;
            border: 2px solid #172033;
          }
          .watermark {
            position: fixed;
            inset: 0;
            display: grid;
            place-items: center;
            color: rgba(200, 0, 0, 0.1);
            font-size: 58px;
            font-weight: 800;
            letter-spacing: 4px;
            transform: rotate(-28deg);
            z-index: 0;
            text-align: center;
          }
          .content { position: relative; z-index: 1; }
          .top-alert {
            border: 2px solid #b42318;
            color: #b42318;
            padding: 7px 10px;
            text-align: center;
            font-weight: 800;
            font-size: 13px;
            margin-bottom: 10px;
          }
          .header {
            display: grid;
            grid-template-columns: 1.4fr 1fr;
            gap: 10px;
            border: 1px solid #172033;
            padding: 10px;
          }
          .emitente {
            display: grid;
            grid-template-columns: ${logo ? "82px 1fr" : "1fr"};
            gap: 10px;
            align-items: center;
          }
          .logo {
            max-width: 76px;
            max-height: 62px;
            object-fit: contain;
          }
          h1, h2, p { margin: 0; }
          h1 { font-size: 18px; text-transform: uppercase; }
          h2 { font-size: 12px; margin-bottom: 5px; text-transform: uppercase; }
          .box {
            border: 1px solid #172033;
            padding: 8px;
            margin-top: 8px;
          }
          .grid-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
          }
          .label {
            display: block;
            color: #667085;
            font-size: 9px;
            text-transform: uppercase;
          }
          .value {
            font-weight: 700;
            font-size: 11px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th, td {
            border: 1px solid #172033;
            padding: 5px;
            vertical-align: top;
          }
          th {
            background: #edf2f7;
            text-transform: uppercase;
            font-size: 9px;
          }
          .right { text-align: right; }
          .center { text-align: center; }
          .totals {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            margin-top: 8px;
          }
          .total-card {
            border: 1px solid #172033;
            padding: 7px;
          }
          .footer-note {
            margin-top: 10px;
            border: 1px dashed #b42318;
            color: #b42318;
            padding: 8px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="watermark">PRÉVIA<br/>SEM VALOR FISCAL</div>
        <main class="page">
          <div class="content">
            <div class="top-alert">PRÉVIA DE NF-e - DOCUMENTO SEM VALOR FISCAL</div>
            <section class="header">
              <div class="emitente">
                ${logo ? `<img class="logo" src="${logo}" alt="Logo" />` : ""}
                <div>
                  <h1>${escapeHtml(nfe.emitente_nome_razao || nfe.tenant_nome || "--")}</h1>
                  <p>${escapeHtml(nfe.emitente_nome_fantasia || "")}</p>
                  <p>CNPJ/CPF: ${escapeHtml(nfe.emitente_cpf_cnpj || "--")} | IE: ${escapeHtml(nfe.emitente_ie || "--")}</p>
                  <p>${escapeHtml(emitenteEndereco || "--")}</p>
                </div>
              </div>
              <div>
                <h2>Identificação</h2>
                <p><span class="label">Modelo / Série / Número</span><span class="value">${escapeHtml(nfe.modelo || "55")} / ${escapeHtml(nfe.serie ?? "--")} / ${escapeHtml(nfe.numero ?? "sem número")}</span></p>
                <p><span class="label">Status</span><span class="value">${escapeHtml(nfe.status || "--")}</span></p>
                <p><span class="label">Ambiente</span><span class="value">${nfe.ambiente_nfe === "1" ? "Produção" : "Homologação"}</span></p>
                <p><span class="label">Criada em</span><span class="value">${escapeHtml(criadoEm)}</span></p>
              </div>
            </section>

            <section class="box">
              <h2>Destinatário</h2>
              <div class="grid-3">
                <p><span class="label">Nome/Razão social</span><span class="value">${escapeHtml(nfe.destinatario_nome_razao || "--")}</span></p>
                <p><span class="label">CPF/CNPJ</span><span class="value">${escapeHtml(nfe.destinatario_cpf_cnpj || "--")}</span></p>
                <p><span class="label">Inscrição estadual</span><span class="value">${escapeHtml(nfe.destinatario_ie || "--")}</span></p>
              </div>
              <p style="margin-top:6px;">${escapeHtml(destinatarioEndereco || "--")}</p>
            </section>

            <section class="box">
              <h2>Dados da operação</h2>
              <div class="grid-3">
                <p><span class="label">Natureza da operação</span><span class="value">${escapeHtml(nfe.natureza_operacao || "--")}</span></p>
                <p><span class="label">Tipo</span><span class="value">${escapeHtml(nfe.tipo_operacao || "--")}</span></p>
                <p><span class="label">Finalidade</span><span class="value">${escapeHtml(nfe.finalidade || "--")}</span></p>
              </div>
            </section>

            <table>
              <thead>
                <tr>
                  <th class="center">Código</th>
                  <th>Descrição</th>
                  <th class="center">NCM</th>
                  <th class="center">CFOP</th>
                  <th class="center">UN</th>
                  <th class="right">Qtd</th>
                  <th class="right">Vl. unit.</th>
                  <th class="right">Vl. total</th>
                </tr>
              </thead>
              <tbody>
                ${itens
                  .map(
                    (item) => `
                      <tr>
                        <td class="center">${escapeHtml(item.codigo_produto || "--")}</td>
                        <td>${escapeHtml(item.descricao || "--")}</td>
                        <td class="center">${escapeHtml(item.ncm || "--")}</td>
                        <td class="center">${escapeHtml(item.cfop || "--")}</td>
                        <td class="center">${escapeHtml(item.unidade_comercial || "--")}</td>
                        <td class="right">${formatNumber(item.quantidade, 4)}</td>
                        <td class="right">${formatCurrency(item.valor_unitario)}</td>
                        <td class="right">${formatCurrency(item.valor_total)}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>

            <section class="totals">
              <div class="total-card"><span class="label">Produtos</span><span class="value">${formatCurrency(nfe.valor_produtos)}</span></div>
              <div class="total-card"><span class="label">Desconto</span><span class="value">${formatCurrency(nfe.valor_desconto)}</span></div>
              <div class="total-card"><span class="label">Acréscimo</span><span class="value">${formatCurrency(nfe.valor_acrescimo)}</span></div>
              <div class="total-card"><span class="label">Total</span><span class="value">${formatCurrency(nfe.valor_total)}</span></div>
            </section>

            ${nfe.observacao ? `<section class="box"><h2>Observações</h2><p>${escapeHtml(nfe.observacao)}</p></section>` : ""}
            <div class="footer-note">Esta é uma prévia operacional gerada antes da autorização da SEFAZ. Não acompanha mercadoria e não substitui DANFE autorizado.</div>
          </div>
        </main>
      </body>
    </html>
  `;
};

router.get("/:id/danfe", async (req, res) => {
  try {
    const response = await fetch(`${acbrBaseUrl()}/nfe/${encodeURIComponent(req.params.id)}/danfe`, {
      method: "GET",
      headers: {
        Cookie: req.headers.cookie || "",
        Accept: "application/pdf, application/json",
      },
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const body = contentType.includes("application/json")
        ? await response.json().catch(() => null)
        : null;
      const text = body ? "" : await response.text().catch(() => "");

      return res.status(response.status).json({
        success: false,
        message: body?.message || text || "Não foi possível gerar o DANFE pela ACBrLib.",
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const disposition = response.headers.get("content-disposition");
    const filename = contentDispositionFileName(
      disposition,
      `danfe-nfe-${req.params.id}.pdf`
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(buffer);
  } catch (error) {
    console.error("[reports:nfe] Falha ao buscar DANFE na ACBrLib:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível gerar o DANFE pela ACBrLib.",
    });
  }
});

router.get("/:id/previa", async (req, res) => {
  try {
    const data = await NfeReportDAO.buscarDanfe(req.db, req.params.id);
    if (!data?.nfe) {
      return res.status(404).json({
        success: false,
        message: "NF-e não encontrada.",
      });
    }

    const html = buildPreviaNfeHtml(data);
    const buffer = await renderHtmlToPdf(html);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="previa-nfe-${req.params.id}.pdf"`);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(buffer);
  } catch (error) {
    console.error("[reports:nfe] Falha ao gerar prévia da NF-e:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível gerar a prévia da NF-e.",
    });
  }
});

export default router;
