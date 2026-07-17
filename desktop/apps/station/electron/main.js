import { app, BrowserWindow, Menu, globalShortcut, ipcMain } from "electron";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const isDev = !app.isPackaged;
const appIconPath = path.resolve(__dirname, "../src/assets/favicon.png");
const DEFAULT_DEV_PORT = "5174";
const LOCAL_API_BASE_URL = "http://127.0.0.1:5100/api/local";
let localServerProcess = null;
let mainWindow = null;

function getLogDir() {
  return path.join(app.getPath("userData"), "logs");
}

function getLogPaths() {
  const logDir = getLogDir();
  return {
    logDir,
    main: path.join(logDir, "main.log"),
    server: path.join(logDir, "server.log"),
  };
}

function appendLogSync(targetPath, message) {
  try {
    fsSync.mkdirSync(path.dirname(targetPath), { recursive: true });
    fsSync.appendFileSync(
      targetPath,
      `[${new Date().toISOString()}] ${String(message).trimEnd()}\n`,
      "utf8",
    );
  } catch {}
}

function logMain(message, extra = null) {
  const payload =
    extra == null
      ? String(message)
      : `${message} ${typeof extra === "string" ? extra : JSON.stringify(extra)}`;
  appendLogSync(getLogPaths().main, payload);
}

function logServer(message) {
  appendLogSync(getLogPaths().server, message);
}

function readJsonSync(filePath) {
  try {
    return JSON.parse(fsSync.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function getRuntimeDataDir() {
  return path.join(app.getPath("userData"), "data");
}

function getActiveAppVersion() {
  const manifest = readJsonSync(path.join(getRuntimeDataDir(), "versions", "current.json"));
  if (!manifest?.staging_dir) return null;
  return manifest;
}

function getActiveResourceVersion() {
  const manifest = readJsonSync(path.join(getRuntimeDataDir(), "resources", "current.json"));
  if (!manifest?.staging_dir) return null;
  return manifest;
}

function resolveUnpackedAppPath(...segments) {
  if (!process.resourcesPath) return "";
  return path.resolve(process.resourcesPath, "app.asar.unpacked", ...segments);
}

function resolvePackagedServerEntry() {
  const activeVersion = getActiveAppVersion();
  const activeServerEntry = activeVersion?.staging_dir
    ? path.resolve(activeVersion.staging_dir, "server", "src", "index.js")
    : null;
  if (activeServerEntry && fsSync.existsSync(activeServerEntry)) {
    return activeServerEntry;
  }

  const unpackedServerEntry = resolveUnpackedAppPath("apps", "server", "src", "index.js");
  if (unpackedServerEntry && fsSync.existsSync(unpackedServerEntry)) {
    return unpackedServerEntry;
  }

  const resourceServerEntry = path.resolve(process.resourcesPath, "server", "src", "index.js");
  if (resourceServerEntry && fsSync.existsSync(resourceServerEntry)) {
    return resourceServerEntry;
  }

  return path.resolve(__dirname, "../../server/src/index.js");
}

function resolvePackagedServerCwd(serverEntry) {
  const entryDir = path.dirname(serverEntry);

  if (fsSync.existsSync(entryDir) && !entryDir.includes("app.asar")) {
    return entryDir;
  }

  const activeVersion = getActiveAppVersion();
  if (activeVersion?.staging_dir && fsSync.existsSync(activeVersion.staging_dir)) {
    return activeVersion.staging_dir;
  }

  if (process.resourcesPath && fsSync.existsSync(process.resourcesPath)) {
    return process.resourcesPath;
  }

  return path.dirname(process.execPath);
}

function resolvePackagedAcbrRoot() {
  return path.resolve(process.resourcesPath, "lib", "ACBrLibNFE");
}

function buildPackagedServerEnv() {
  const dataDir = getRuntimeDataDir();
  const activeResource = getActiveResourceVersion();
  const resourceAcbrRoot = activeResource?.staging_dir
    ? path.resolve(activeResource.staging_dir, "ACBrLibNFE")
    : null;
  const acbrRoot =
    resourceAcbrRoot && fsSync.existsSync(resourceAcbrRoot)
      ? resourceAcbrRoot
      : resolvePackagedAcbrRoot();

  return {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    V12_PDV_VERSION: app.getVersion(),
    V12_LOCAL_DB_PATH:
      process.env.V12_LOCAL_DB_PATH || path.join(dataDir, "v12-pdv.sqlite"),
    V12_BACKUP_DIR: process.env.V12_BACKUP_DIR || path.join(dataDir, "backups"),
    V12_PDV_RELEASE_DIR: process.env.V12_PDV_RELEASE_DIR || path.join(dataDir, "releases"),
    V12_ACBRLIB_CONFIG_DIR:
      process.env.V12_ACBRLIB_CONFIG_DIR || path.join(dataDir, "acbrlib", "config"),
    V12_ACBRLIB_TEMP_DIR:
      process.env.V12_ACBRLIB_TEMP_DIR || path.join(dataDir, "acbrlib", "runtime"),
    V12_ACBRLIB_LOG_DIR:
      process.env.V12_ACBRLIB_LOG_DIR || path.join(dataDir, "acbrlib", "log"),
    V12_ACBRLIB_NFE_PATH:
      process.env.V12_ACBRLIB_NFE_PATH ||
      path.join(acbrRoot, "Windows", "MT", "Cdecl", "ACBrNFe64.dll"),
    V12_ACBRLIB_SCHEMA_PATH:
      process.env.V12_ACBRLIB_SCHEMA_PATH || path.join(acbrRoot, "dep", "Schemas", "NFe"),
    V12_ACBRLIB_NFE_SERVICOS_PATH:
      process.env.V12_ACBRLIB_NFE_SERVICOS_PATH || path.join(acbrRoot, "dep", "ACBrNFeServicos.ini"),
    V12_ACBRLIB_NATIVE_DEP_DIRS:
      process.env.V12_ACBRLIB_NATIVE_DEP_DIRS ||
      [
        path.join(acbrRoot, "dep", "LibXml2", "x64"),
        path.join(acbrRoot, "dep", "OpenSSL", "x64"),
      ].join(path.delimiter),
  };
}

async function startPackagedLocalServer() {
  if (isDev || localServerProcess) return;

  const serverEntry = resolvePackagedServerEntry();
  const serverCwd = resolvePackagedServerCwd(serverEntry);
  const serverEnv = buildPackagedServerEnv();
  await fs.mkdir(path.dirname(serverEnv.V12_LOCAL_DB_PATH), { recursive: true });

  localServerProcess = spawn(process.execPath, [serverEntry], {
    env: serverEnv,
    cwd: serverCwd,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  logMain("Inicializando servidor local empacotado", {
    serverEntry,
    serverCwd,
    execPath: process.execPath,
  });

  localServerProcess.stdout?.on("data", (chunk) => {
    logServer(chunk.toString());
  });

  localServerProcess.stderr?.on("data", (chunk) => {
    logServer(`[stderr] ${chunk.toString()}`);
  });

  localServerProcess.on("error", (error) => {
    logMain("Falha ao iniciar servidor local", {
      message: error?.message || "",
      code: error?.code || "",
      stack: error?.stack || "",
    });
  });

  localServerProcess.on("exit", (code, signal) => {
    logMain("Servidor local finalizado", { code, signal });
    localServerProcess = null;
  });
}

async function buildQrDataUrl(value = "") {
  const qrText = String(value || "").trim();
  if (!qrText) return "";

  try {
    const qrcode = require("qrcode");
    return qrcode.toDataURL(qrText, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 180,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    });
  } catch {
    return "";
  }
}

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

async function fetchLocalJson(pathname, { timeoutMs = 1800 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${LOCAL_API_BASE_URL}${pathname}`, {
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || `Falha local ${response.status}`);
    }
    return Object.prototype.hasOwnProperty.call(payload, "data") ? payload.data : payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForLocalApi() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const reachable = await canReachUrl(`${LOCAL_API_BASE_URL}/healthz`);
    if (reachable) return true;
    await wait(500);
  }

  return false;
}

async function openDownloadedInstallerOnStartup() {
  if (isDev) return false;

  try {
    const localReady = await waitForLocalApi();
    if (!localReady) {
      logMain("Atualização ignorada: servidor local não respondeu na inicialização.");
      return false;
    }

    const pending = await fetchLocalJson("/release/instalador-pronto", { timeoutMs: 120000 });
    if (!pending?.ready || !pending?.arquivo_local) {
      logMain("Nenhum instalador de atualização pronto", {
        message: pending?.message || null,
        versaoAtual: pending?.versao_atual || app.getVersion(),
      });
      return false;
    }

    const installerPath = path.resolve(String(pending.arquivo_local));
    await fs.access(installerPath);
    logMain("Instalador de atualização pronto. Abrindo setup e encerrando PDV.", {
      versaoAtual: app.getVersion(),
      versaoNova: pending.versao,
      installerPath,
    });

    spawn(installerPath, [], {
      detached: true,
      stdio: "ignore",
      shell: false,
    }).unref();

    app.quit();
    return true;
  } catch (error) {
    logMain("Falha ao iniciar instalador de atualização baixado", {
      message: error?.message || String(error),
      stack: error?.stack || "",
    });
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

function pxToMicrons(px) {
  return Math.ceil(Number(px || 0) * 264.5833333);
}

async function resolveThermalPageSize(targetWindow, printerConfig) {
  if (!["thermal-58", "thermal-80"].includes(printerConfig.layout)) {
    return null;
  }

  const contentHeightPx = await targetWindow.webContents.executeJavaScript(
    `(() => {
      const body = document.body;
      const html = document.documentElement;
      return Math.max(
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        html ? html.clientHeight : 0,
        html ? html.scrollHeight : 0,
        html ? html.offsetHeight : 0
      );
    })()`,
    true,
  );

  const width = printerConfig.layout === "thermal-58" ? 58000 : 80000;
  const topAndBottomSafetyPx = 24;
  const minHeightPx = 120;
  const resolvedHeightPx = Math.max(minHeightPx, Number(contentHeightPx || 0) + topAndBottomSafetyPx);

  return {
    width,
    height: pxToMicrons(resolvedHeightPx),
  };
}

async function printBrowserWindow(targetWindow, config = {}) {
  const { options, printerConfig } = buildPrintOptions(config);
  const thermalPageSize = await resolveThermalPageSize(targetWindow, printerConfig);
  const finalOptions = thermalPageSize
    ? {
        ...options,
        pageSize: thermalPageSize,
      }
    : options;

  await new Promise((resolve, reject) => {
    targetWindow.webContents.print(finalOptions, (success, errorType) => {
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
            margin: ${isThermal ? "0" : "12mm"};
          }
          html,
          body {
            margin: 0;
            padding: ${isThermal ? "0" : "20px"};
            background: #fff;
          }
          .sheet {
            max-width: ${isThermal ? pageWidth : "780px"};
            margin: ${isThermal ? "0" : "0 auto"};
            border: ${isThermal ? "0" : "1px solid #d7dde6"};
            padding: ${isThermal ? "2mm 2mm 0" : "18px"};
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
  return extractXmlTags(xml, tagName)[0] || "";
}

function extractXmlTags(xml = "", tagName = "") {
  const pattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const globalPattern = new RegExp(pattern.source, "gi");
  return Array.from(String(xml || "").matchAll(globalPattern)).map((match) =>
    String(match?.[1] || "")
      .replace(/^<!\[CDATA\[/i, "")
      .replace(/\]\]>$/i, "")
      .trim(),
  );
}

function extractLastXmlTag(xml = "", tagName = "") {
  const values = extractXmlTags(xml, tagName);
  return values[values.length - 1] || "";
}

function parseXmlDecimal(value) {
  const normalized = String(value ?? "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractTributosFonte(xml = "") {
  const infCpl = extractXmlTag(xml, "infCpl");
  const fonteMatch = infCpl.match(/Fonte:\s*([^.;]+(?:[,/]\s*[^.;]+)*)/i);
  return String(fonteMatch?.[1] || "").trim();
}

async function buildDanfceHtml(payload = {}, config = {}) {
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
  const qrCodeImage = await buildQrDataUrl(qrCodeUrl);
  const numero = fiscal.numero || extractXmlTag(xml, "nNF") || "";
  const serie = fiscal.serie || extractXmlTag(xml, "serie") || "";
  const tpAmb = String(fiscal.tpAmb || extractXmlTag(xml, "tpAmb") || "").trim();
  const isHomologacao = tpAmb === "2";
  const ambiente = String(fiscal.status || "").toLowerCase() === "contingencia" ? "EM CONTINGÊNCIA" : "NORMAL";
  const ambienteDocumento = isHomologacao ? "HOMOLOGACAO" : "PRODUCAO";
  const subtotal = formatCurrency(sale.subtotal || 0);
  const desconto = formatCurrency(sale.desconto || 0);
  const total = formatCurrency(sale.total || 0);
  const valorTributos = parseXmlDecimal(
    fiscal.valor_tributos_total ??
      fiscal.valorTributosTotal ??
      sale.valor_tributos_total ??
      extractLastXmlTag(xml, "vTotTrib"),
  );
  const fonteTributos = escapeHtml(
    fiscal.fonte_tributos || fiscal.fonteTributos || sale.fonte_tributos || extractTributosFonte(xml),
  );
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
            margin: ${isThermal ? "0" : "12mm"};
          }
          html,
          body {
            margin: 0;
            padding: ${isThermal ? "0" : "20px"};
            background: #fff;
          }
          .sheet {
            max-width: ${isThermal ? pageWidth : "780px"};
            margin: ${isThermal ? "0" : "0 auto"};
            padding: ${isThermal ? "2mm 2mm 0" : "0"};
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
          .alert-stripe {
            padding: 8px 6px;
            border: 2px solid #111827;
            text-align: center;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
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
          .qr-code {
            display: block;
            width: ${isThermal ? "150px" : "180px"};
            height: ${isThermal ? "150px" : "180px"};
            margin: 6px auto;
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
            <div class="center small">NFC-e nº ${escapeHtml(numero)} Série ${escapeHtml(serie)} - ${escapeHtml(ambiente)} - ${escapeHtml(ambienteDocumento)}</div>
            <div class="center small muted">Não permite aproveitamento de crédito de ICMS</div>
            ${isHomologacao ? `<div class="alert-stripe">EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</div>` : ""}

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

            ${valorTributos > 0 ? `
              <div class="separator">${separator}</div>
              <div class="block small">
                <div class="row">
                  <span>TRIBUTOS APROXIMADOS</span>
                  <strong>R$ ${formatCurrency(valorTributos)}</strong>
                </div>
                <div class="muted">Lei Federal 12.741/2012${fonteTributos ? ` - Fonte: ${fonteTributos}` : ""}</div>
              </div>
            ` : ""}

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
                ${qrCodeImage ? `<img class="qr-code" src="${qrCodeImage}" alt="QR Code NFC-e" />` : ""}
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
  logMain("Criando janela principal");
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

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    logMain("Falha ao carregar conteúdo da janela", {
      errorCode,
      errorDescription,
      validatedURL,
    });
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    logMain("Processo de renderização encerrado", details);
  });

  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    logMain("Console renderer", { level, message, line, sourceId });
  });

  mainWindow = win;

  if (isDev) {
    try {
      await loadDevServer(win);
      return win;
    } catch {
      logMain("Falha ao carregar Vite no modo desenvolvimento");
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildDevServerErrorHtml())}`);
      return win;
    }
  }

  const activeVersion = getActiveAppVersion();
  const activeIndex = activeVersion?.staging_dir
    ? path.resolve(activeVersion.staging_dir, "station", "dist", "index.html")
    : null;

  if (activeIndex && fsSync.existsSync(activeIndex)) {
    logMain("Carregando front ativo da release", { activeIndex });
    await win.loadFile(activeIndex);
    return win;
  }

  const bundledIndex = path.resolve(__dirname, "../dist/index.html");
  logMain("Carregando front empacotado", { bundledIndex });
  await win.loadFile(bundledIndex);
  return win;
}

ipcMain.handle("app:quit", () => {
  app.quit();
});

ipcMain.handle("app:restart", () => {
  app.relaunch();
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
    const html = await buildDanfceHtml(payload, printerConfig);
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

app.whenReady().then(async () => {
  logMain("Electron pronto", {
    isDev,
    appVersion: app.getVersion(),
    userData: app.getPath("userData"),
    resourcesPath: process.resourcesPath,
  });
  Menu.setApplicationMenu(null);
  await startPackagedLocalServer();
  const updateInstallerStarted = await openDownloadedInstallerOnStartup();
  if (updateInstallerStarted) {
    return;
  }

  const win = await createWindow();

  globalShortcut.register("F11", () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
  });

  globalShortcut.register("Escape", () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow?.isFullScreen()) focusedWindow.setFullScreen(false);
  });
});

app.on("will-quit", () => {
  logMain("Aplicação encerrando");
  globalShortcut.unregisterAll();
  if (localServerProcess) {
    localServerProcess.kill();
    localServerProcess = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

process.on("uncaughtException", (error) => {
  logMain("uncaughtException", {
    message: error?.message || "",
    stack: error?.stack || "",
  });
});

process.on("unhandledRejection", (reason) => {
  logMain("unhandledRejection", {
    reason:
      reason instanceof Error
        ? { message: reason.message, stack: reason.stack }
        : String(reason),
  });
});
