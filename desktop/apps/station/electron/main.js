import { app, BrowserWindow, Menu, globalShortcut, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
const appIconPath = path.resolve(__dirname, "../src/assets/favicon.png");
const DEFAULT_DEV_PORT = "5174";

function getCandidateDevUrls() {
  const envUrl = String(process.env.VITE_DEV_SERVER_URL || "").trim();
  const urls = [
    envUrl,
    `http://127.0.0.1:${DEFAULT_DEV_PORT}`,
    `http://localhost:${DEFAULT_DEV_PORT}`,
  ].filter(Boolean);

  return [...new Set(urls)];
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function canReachUrl(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

async function loadDevServer(win) {
  const candidates = getCandidateDevUrls();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    for (const url of candidates) {
      const reachable = await canReachUrl(url);
      if (reachable) {
        await win.loadURL(url);
        return;
      }
    }

    await wait(500);
  }

  throw new Error("Servidor Vite do PDV não respondeu.");
}

function buildDevServerErrorHtml() {
  const urls = getCandidateDevUrls()
    .map((url) => `<li>${escapeHtml(url)}</li>`)
    .join("");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>V12 PDV - Servidor não encontrado</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #0f172a;
            color: #e2e8f0;
            font-family: Arial, Helvetica, sans-serif;
          }
          .card {
            width: min(560px, calc(100vw - 48px));
            padding: 28px;
            border-radius: 16px;
            background: #111f35;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
          }
          h1 {
            margin: 0 0 12px;
            color: #f8fafc;
            font-size: 24px;
          }
          p, li {
            color: #cbd5e1;
            line-height: 1.5;
            font-size: 14px;
          }
          ul {
            margin: 14px 0;
            padding-left: 18px;
          }
          code {
            color: #7dd3fc;
            font-family: "Courier New", monospace;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Servidor do PDV não encontrado</h1>
          <p>O Electron abriu, mas não conseguiu acessar o front da estação.</p>
          <p>Antes de abrir o Electron, deixe o Vite da estação rodando em uma destas URLs:</p>
          <ul>${urls}</ul>
          <p>Comando esperado: <code>cd v12/desktop && npm run dev:station</code></p>
        </div>
      </body>
    </html>
  `;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getPrintWindow() {
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
}

function normalizePrinterConfig(config = {}) {
  const layout = ["thermal-58", "thermal-80", "a4"].includes(config.layout)
    ? config.layout
    : "thermal-80";

  return {
    enabled: config.enabled === true,
    deviceName: String(config.deviceName || "").trim(),
    layout,
    paperWidth: layout === "thermal-58" ? 58 : layout === "thermal-80" ? 80 : 210,
    silent: config.silent === true,
    copies: Number.isInteger(Number(config.copies)) ? Math.max(1, Math.min(10, Number(config.copies))) : 1,
  };
}

function buildPrintOptions(config = {}) {
  const printerConfig = normalizePrinterConfig(config);

  return {
    printerConfig,
    options: {
      silent: printerConfig.enabled && printerConfig.silent,
      deviceName: printerConfig.enabled && printerConfig.deviceName ? printerConfig.deviceName : undefined,
      copies: printerConfig.copies,
      printBackground: true,
      margins: {
        marginType: "none",
      },
      pageSize:
        printerConfig.layout === "thermal-58"
          ? { width: 58000, height: 200000 }
          : printerConfig.layout === "thermal-80"
            ? { width: 80000, height: 200000 }
            : undefined,
    },
  };
}

async function printBrowserWindow(targetWindow, config = {}) {
  const { options } = buildPrintOptions(config);

  await new Promise((resolve, reject) => {
    targetWindow.webContents.print(options, (success, errorType) => {
      if (!success) {
        reject(new Error(errorType || "Falha ao imprimir documento."));
        return;
      }

      resolve();
    });
  });
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDocument(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }

  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }

  return String(value || "").trim();
}

function getDocumentLabel(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 14) return "CNPJ";
  if (digits.length === 11) return "CPF";
  return "Documento";
}

function buildBudgetHtml(payload = {}, config = {}) {
  const printerConfig = normalizePrinterConfig(config);
  const items = Array.isArray(payload.items) ? payload.items : [];
  const pagamentos = Array.isArray(payload.pagamentos) ? payload.pagamentos : [];
  const subtotal = formatCurrency(payload.subtotal || 0);
  const desconto = formatCurrency(payload.desconto || 0);
  const total = formatCurrency(payload.total || 0);
  const operador = escapeHtml(payload.operador || "Operador");
  const cliente = escapeHtml(payload.cliente || "Cliente não identificado");
  const data = escapeHtml(payload.data || new Date().toLocaleString("pt-BR"));
  const emitente = escapeHtml(payload.emitente?.nome || payload.empresa?.nome || "V12 ERP");
  const emitenteDocumentoRaw = payload.emitente?.documento || payload.empresa?.documento || "";
  const documentoEmitente = escapeHtml(formatDocument(emitenteDocumentoRaw));
  const documentoEmitenteLabel = escapeHtml(getDocumentLabel(emitenteDocumentoRaw));
  const enderecoEmitente = escapeHtml(payload.emitente?.endereco || payload.empresa?.endereco || "");
  const inscricaoEstadual = escapeHtml(payload.emitente?.inscricaoEstadual || payload.empresa?.inscricaoEstadual || "");
  const inscricaoMunicipal = escapeHtml(payload.emitente?.inscricaoMunicipal || payload.empresa?.inscricaoMunicipal || "");
  const terminal = escapeHtml(payload.terminal || "PDV");
  const numeroDocumento = escapeHtml(payload.numeroDocumento || "ORÇAMENTO");
  const isThermal = printerConfig.layout !== "a4";
  const pageWidth = printerConfig.layout === "thermal-58" ? "58mm" : printerConfig.layout === "thermal-80" ? "80mm" : "210mm";
  const separator = isThermal ? "-".repeat(printerConfig.layout === "thermal-58" ? 32 : 46) : "";
  const rows = items
    .map((item, index) => {
      const quantidade = Number(item.quantidade || 0);
      const valorUnitario = formatCurrency(item.valor_unitario || 0);
      const valorTotal = formatCurrency(quantidade * Number(item.valor_unitario || 0));
      const codigo = escapeHtml(item.codigo_produto || item.codigo || String(index + 1).padStart(3, "0"));
      const descricao = escapeHtml(String(item.descricao || "").toUpperCase());
      const unidade = escapeHtml(String(item.unidade || "UN").toUpperCase());

      return `
        <div class="item-line">
          <div class="item-head">${codigo} ${descricao}</div>
          <div class="item-detail">
            <span>${escapeHtml(String(quantidade))} ${unidade} x ${valorUnitario}</span>
            <strong>${valorTotal}</strong>
          </div>
        </div>
      `;
    })
    .join("");
  const paymentRows = pagamentos
    .map((pagamento) => {
      const descricao = escapeHtml(
        pagamento.descricao ||
          pagamento.forma_descricao ||
          pagamento.forma ||
          "Pagamento",
      );
      return `
        <div class="payment-row">
          <span>${descricao}</span>
          <strong>${formatCurrency(pagamento.valor || 0)}</strong>
        </div>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Orçamento V12 ERP</title>
        <style>
          :root {
            color: #1f2937;
            font-family: ${isThermal ? '"Courier New", monospace' : 'Arial, Helvetica, sans-serif'};
          }
          @page {
            size: ${pageWidth} auto;
            margin: ${isThermal ? "4mm" : "12mm"};
          }
          body {
            margin: 0;
            padding: ${isThermal ? "0" : "20px"};
            background: #fff;
          }
          .sheet {
            max-width: ${isThermal ? pageWidth : "780px"};
            margin: 0 auto;
            border: ${isThermal ? "0" : "1px solid #d7dde6"};
            padding: ${isThermal ? "0" : "18px"};
          }
          .coupon {
            display: grid;
            gap: ${isThermal ? "6px" : "10px"};
            font-size: ${isThermal ? "11px" : "12px"};
            color: #111827;
          }
          .center {
            text-align: center;
          }
          .title {
            font-weight: 700;
            font-size: ${isThermal ? "13px" : "18px"};
          }
          .muted {
            color: #475569;
          }
          .stripe {
            padding: 6px 4px;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            text-align: center;
            font-weight: 700;
            text-transform: uppercase;
          }
          .separator {
            white-space: pre;
            overflow: hidden;
            color: #475569;
          }
          .meta-row,
          .total-row,
          .payment-row,
          .consumer-row,
          .foot-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
          }
          .item-header {
            display: grid;
            gap: 2px;
            font-size: ${isThermal ? "10px" : "12px"};
          }
          .item-line {
            display: grid;
            gap: 2px;
            padding: 3px 0;
            border-bottom: 1px dotted #9ca3af;
          }
          .item-head {
            font-weight: 700;
            word-break: break-word;
          }
          .item-detail {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            align-items: baseline;
          }
          .totals {
            display: grid;
            gap: 4px;
          }
          .grand-total {
            font-size: ${isThermal ? "14px" : "18px"};
            font-weight: 700;
          }
          .payments {
            display: grid;
            gap: 3px;
          }
          .block {
            display: grid;
            gap: 3px;
          }
          .small {
            font-size: ${isThermal ? "10px" : "11px"};
          }
          .thanks {
            margin-top: 4px;
            font-weight: 700;
            letter-spacing: 0.08em;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="coupon">
            <div class="center block">
              <div class="title">${emitente}</div>
              ${documentoEmitente ? `<div>${documentoEmitenteLabel}: ${documentoEmitente}</div>` : ""}
              ${inscricaoEstadual ? `<div>IE: ${inscricaoEstadual}</div>` : ""}
              ${inscricaoMunicipal ? `<div>IM: ${inscricaoMunicipal}</div>` : ""}
              ${enderecoEmitente ? `<div class="small">${enderecoEmitente}</div>` : ""}
              <div class="small muted">${terminal}  ${data}</div>
            </div>

            <div class="stripe">Cupom de orçamento - sem valor fiscal</div>

            <div class="center small muted">
              Documento auxiliar interno inspirado no DANFE NFC-e para conferência e apresentação ao cliente
            </div>

            <div class="separator">${separator}</div>

            <div class="item-header">
              <strong>ITENS</strong>
              <span class="muted small">COD  DESCRIÇÃO / QTDE UN X VL.UN .......... VL.TOTAL</span>
            </div>

            <div class="items">
              ${rows || `<div class="item-line"><div class="item-head">SEM ITENS INFORMADOS</div></div>`}
            </div>

            <div class="separator">${separator}</div>

            <div class="totals">
              <div class="total-row"><span>QTD TOTAL DE ITENS</span><strong>${items.reduce((acc, item) => acc + Number(item.quantidade || 0), 0)}</strong></div>
              <div class="total-row"><span>VALOR TOTAL R$</span><strong>${subtotal}</strong></div>
              <div class="total-row"><span>DESCONTO TOTAL R$</span><strong>${desconto}</strong></div>
              <div class="total-row grand-total"><span>VALOR A PAGAR R$</span><strong>${total}</strong></div>
            </div>

            <div class="separator">${separator}</div>

            <div class="payments">
              <strong>FORMA DE PAGAMENTO</strong>
              ${paymentRows || `<div class="payment-row"><span>NÃO INFORMADA</span><strong>${total}</strong></div>`}
            </div>

            <div class="separator">${separator}</div>

            <div class="block">
              <div class="consumer-row"><span>ORÇAMENTO Nº</span><strong>${numeroDocumento}</strong></div>
              <div class="consumer-row"><span>OPERADOR</span><strong>${operador}</strong></div>
              <div class="consumer-row"><span>CONSUMIDOR</span><strong>${cliente}</strong></div>
            </div>

            <div class="separator">${separator}</div>

            <div class="center block small">
              <div>NÃO É DOCUMENTO FISCAL</div>
              <div>NÃO SUBSTITUI NFC-E / NF-E</div>
              <div>NÃO PERMITE APROVEITAMENTO DE CRÉDITO DE ICMS</div>
            </div>

            <div class="separator">${separator}</div>

            <div class="center block small muted">
              <div>V12 ERP</div>
              <div>jhes.com.br</div>
              <div>Emitido por ${terminal}</div>
              <div class="thanks">OBRIGADO!</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function formatAccessKey(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 44) return String(value || "").trim();
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function extractXmlTag(xml = "", tagName = "") {
  const pattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = String(xml || "").match(pattern);
  return String(match?.[1] || "")
    .replace(/^<!\[CDATA\[/i, "")
    .replace(/\]\]>$/i, "")
    .trim();
}

function buildDanfceHtml(payload = {}, config = {}) {
  const printerConfig = normalizePrinterConfig(config);
  const sale = payload.sale || {};
  const fiscal = payload.fiscal || {};
  const xml = String(fiscal.xml || fiscal.xmlAutorizado || "");
  const items = Array.isArray(sale.items) ? sale.items : [];
  const pagamentos = Array.isArray(sale.pagamentos) ? sale.pagamentos : [];
  const isThermal = printerConfig.layout !== "a4";
  const pageWidth = printerConfig.layout === "thermal-58" ? "58mm" : printerConfig.layout === "thermal-80" ? "80mm" : "210mm";
  const separator = isThermal ? "-".repeat(printerConfig.layout === "thermal-58" ? 32 : 46) : "";
  const emitente = escapeHtml(sale.emitente?.nome || "V12 ERP");
  const emitenteDocumentoRaw = sale.emitente?.documento || "";
  const documentoEmitente = escapeHtml(formatDocument(emitenteDocumentoRaw));
  const documentoEmitenteLabel = escapeHtml(getDocumentLabel(emitenteDocumentoRaw));
  const enderecoEmitente = escapeHtml(sale.emitente?.endereco || "");
  const inscricaoEstadual = escapeHtml(sale.emitente?.inscricaoEstadual || "");
  const chaveAcesso = fiscal.chave_acesso || fiscal.chaveAcesso || extractXmlTag(xml, "chNFe");
  const protocolo = fiscal.protocolo || extractXmlTag(xml, "nProt");
  const dataAutorizacao = extractXmlTag(xml, "dhRecbto") || sale.data || new Date().toLocaleString("pt-BR");
  const qrCodeUrl = extractXmlTag(xml, "qrCode");
  const numero = fiscal.numero || extractXmlTag(xml, "nNF") || "";
  const serie = fiscal.serie || extractXmlTag(xml, "serie") || "";
  const ambiente = String(fiscal.status || "").toLowerCase() === "contingencia" ? "EM CONTINGÊNCIA" : "NORMAL";
  const subtotal = formatCurrency(sale.subtotal || 0);
  const desconto = formatCurrency(sale.desconto || 0);
  const total = formatCurrency(sale.total || 0);
  const cliente = escapeHtml(sale.cliente || "Consumidor não identificado");
  const terminal = escapeHtml(sale.terminal || "PDV");
  const operador = escapeHtml(sale.operador || "Operador");
  const rows = items
    .map((item, index) => {
      const quantidade = Number(item.quantidade || 0);
      const valorUnitario = formatCurrency(item.valor_unitario || 0);
      const valorTotal = formatCurrency(quantidade * Number(item.valor_unitario || 0));
      const codigo = escapeHtml(item.codigo_produto || item.codigo || String(index + 1).padStart(3, "0"));
      const descricao = escapeHtml(String(item.descricao || "").toUpperCase());
      const unidade = escapeHtml(String(item.unidade || "UN").toUpperCase());

      return `
        <div class="item-line">
          <div class="item-head">${String(index + 1).padStart(3, "0")} ${codigo} ${descricao}</div>
          <div class="item-detail">
            <span>${escapeHtml(String(quantidade))} ${unidade} x ${valorUnitario}</span>
            <strong>${valorTotal}</strong>
          </div>
        </div>
      `;
    })
    .join("");
  const paymentRows = pagamentos
    .map((pagamento) => {
      const descricao = escapeHtml(pagamento.descricao || pagamento.forma_descricao || pagamento.forma || "Pagamento");
      return `<div class="payment-row"><span>${descricao}</span><strong>${formatCurrency(pagamento.valor || 0)}</strong></div>`;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>DANFCe V12 ERP</title>
        <style>
          :root {
            color: #111827;
            font-family: ${isThermal ? '"Courier New", monospace' : 'Arial, Helvetica, sans-serif'};
          }
          @page {
            size: ${pageWidth} auto;
            margin: ${isThermal ? "4mm" : "12mm"};
          }
          body {
            margin: 0;
            padding: ${isThermal ? "0" : "20px"};
            background: #fff;
          }
          .sheet {
            max-width: ${isThermal ? pageWidth : "780px"};
            margin: 0 auto;
          }
          .coupon {
            display: grid;
            gap: ${isThermal ? "6px" : "10px"};
            font-size: ${isThermal ? "11px" : "12px"};
          }
          .center { text-align: center; }
          .title { font-weight: 700; font-size: ${isThermal ? "13px" : "18px"}; }
          .muted { color: #475569; }
          .stripe {
            padding: 6px 4px;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            text-align: center;
            font-weight: 700;
            text-transform: uppercase;
          }
          .separator {
            white-space: pre;
            overflow: hidden;
            color: #475569;
          }
          .row,
          .item-detail,
          .payment-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
          }
          .item-line {
            display: grid;
            gap: 2px;
            padding: 3px 0;
            border-bottom: 1px dotted #9ca3af;
          }
          .item-head {
            font-weight: 700;
            word-break: break-word;
          }
          .block {
            display: grid;
            gap: 3px;
          }
          .small {
            font-size: ${isThermal ? "10px" : "11px"};
          }
          .grand-total {
            font-size: ${isThermal ? "14px" : "18px"};
            font-weight: 700;
          }
          .break {
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="coupon">
            <div class="center block">
              <div class="title">${emitente}</div>
              ${documentoEmitente ? `<div>${documentoEmitenteLabel}: ${documentoEmitente}</div>` : ""}
              ${inscricaoEstadual ? `<div>IE: ${inscricaoEstadual}</div>` : ""}
              ${enderecoEmitente ? `<div class="small">${enderecoEmitente}</div>` : ""}
            </div>

            <div class="stripe">DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</div>
            <div class="center small">NFC-e nº ${escapeHtml(numero)} Série ${escapeHtml(serie)} - ${escapeHtml(ambiente)}</div>
            <div class="center small muted">Não permite aproveitamento de crédito de ICMS</div>

            <div class="separator">${separator}</div>

            <div class="block">
              <strong>ITENS</strong>
              ${rows || `<div class="item-line"><div class="item-head">SEM ITENS INFORMADOS</div></div>`}
            </div>

            <div class="separator">${separator}</div>

            <div class="block">
              <div class="row"><span>QTD TOTAL DE ITENS</span><strong>${items.reduce((acc, item) => acc + Number(item.quantidade || 0), 0)}</strong></div>
              <div class="row"><span>VALOR TOTAL R$</span><strong>${subtotal}</strong></div>
              <div class="row"><span>DESCONTO TOTAL R$</span><strong>${desconto}</strong></div>
              <div class="row grand-total"><span>VALOR A PAGAR R$</span><strong>${total}</strong></div>
            </div>

            <div class="separator">${separator}</div>

            <div class="block">
              <strong>FORMA DE PAGAMENTO</strong>
              ${paymentRows || `<div class="payment-row"><span>NÃO INFORMADA</span><strong>${total}</strong></div>`}
            </div>

            <div class="separator">${separator}</div>

            <div class="block">
              <div class="row"><span>CONSUMIDOR</span><strong>${cliente}</strong></div>
              <div class="row"><span>OPERADOR</span><strong>${operador}</strong></div>
              <div class="row"><span>TERMINAL</span><strong>${terminal}</strong></div>
            </div>

            <div class="separator">${separator}</div>

            <div class="center block small">
              <strong>CHAVE DE ACESSO</strong>
              <div>${escapeHtml(formatAccessKey(chaveAcesso))}</div>
              ${protocolo ? `<div>Protocolo de autorização: ${escapeHtml(protocolo)}</div>` : ""}
              <div>Data de autorização: ${escapeHtml(dataAutorizacao)}</div>
            </div>

            ${qrCodeUrl ? `
              <div class="separator">${separator}</div>
              <div class="center block small">
                <strong>CONSULTE PELA CHAVE DE ACESSO OU QR CODE</strong>
                <div class="break">${escapeHtml(qrCodeUrl)}</div>
              </div>
            ` : ""}

            <div class="separator">${separator}</div>

            <div class="center block small muted">
              <div>V12 ERP</div>
              <div>jhes.com.br</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: "V12 PDV",
    icon: appIconPath,
    fullscreen: true,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.resolve(__dirname, "preload.cjs"),
    },
  });

  if (isDev) {
    try {
      await loadDevServer(win);
    } catch {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildDevServerErrorHtml())}`);
    }
    return;
  }

  win.loadFile(path.resolve(__dirname, "../dist/index.html"));
}

ipcMain.handle("app:quit", () => {
  app.quit();
});

ipcMain.handle("window:toggle-fullscreen", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return false;
  win.setFullScreen(!win.isFullScreen());
  return win.isFullScreen();
});

ipcMain.handle("printer:list", async () => {
  const win = getPrintWindow();
  if (!win) return [];

  const printers = await win.webContents.getPrintersAsync();
  return printers.map((printer) => ({
    name: printer.name,
    displayName: printer.displayName || printer.name,
    description: printer.description || "",
    isDefault: !!printer.isDefault,
    status: Number(printer.status || 0),
  }));
});

ipcMain.handle("sale:print-budget", async (_event, payload = {}, config = {}) => {
  const { printerConfig } = buildPrintOptions(config);
  const budgetWindow = new BrowserWindow({
    show: false,
    width: 900,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    const html = buildBudgetHtml(payload, printerConfig);
    await budgetWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await printBrowserWindow(budgetWindow, printerConfig);

    return true;
  } finally {
    budgetWindow.close();
  }
});

ipcMain.handle("sale:print-danfce", async (_event, payload = {}, config = {}) => {
  const { printerConfig } = buildPrintOptions(config);
  const danfceWindow = new BrowserWindow({
    show: false,
    width: 900,
    height: 1200,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    const html = buildDanfceHtml(payload, printerConfig);
    await danfceWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await printBrowserWindow(danfceWindow, printerConfig);

    return true;
  } finally {
    danfceWindow.close();
  }
});

ipcMain.handle("sale:print-pdf-file", async (_event, pdfPath, config = {}) => {
  const rawPdfPath = String(pdfPath || "").trim();
  if (!rawPdfPath) {
    throw new Error("PDF do DANFCe não informado para impressão.");
  }
  const resolvedPdfPath = path.resolve(rawPdfPath);

  await fs.access(resolvedPdfPath);

  const pdfWindow = new BrowserWindow({
    show: false,
    width: 900,
    height: 1200,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    await pdfWindow.loadURL(pathToFileURL(resolvedPdfPath).href);
    await wait(350);
    await printBrowserWindow(pdfWindow, config);
    return true;
  } finally {
    pdfWindow.close();
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  globalShortcut.register("F11", () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.setFullScreen(!win.isFullScreen());
  });

  globalShortcut.register("Escape", () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win?.isFullScreen()) win.setFullScreen(false);
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
