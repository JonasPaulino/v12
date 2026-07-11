import { app, BrowserWindow, Menu, globalShortcut, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function buildBudgetHtml(payload = {}, config = {}) {
  const printerConfig = normalizePrinterConfig(config);
  const items = Array.isArray(payload.items) ? payload.items : [];
  const subtotal = Number(payload.subtotal || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const desconto = Number(payload.desconto || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const total = Number(payload.total || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const operador = escapeHtml(payload.operador || "Operador");
  const cliente = escapeHtml(payload.cliente || "Cliente não identificado");
  const data = escapeHtml(payload.data || new Date().toLocaleString("pt-BR"));
  const isThermal = printerConfig.layout !== "a4";
  const pageWidth = printerConfig.layout === "thermal-58" ? "58mm" : printerConfig.layout === "thermal-80" ? "80mm" : "210mm";
  const rows = items
    .map((item, index) => {
      const quantidade = Number(item.quantidade || 0);
      const valorUnitario = Number(item.valor_unitario || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const valorTotal = Number(quantidade * Number(item.valor_unitario || 0)).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      return `
        <tr>
          <td>${String(index + 1).padStart(3, "0")}</td>
          <td>${escapeHtml(item.descricao || "")}</td>
          <td>${escapeHtml(String(quantidade))}</td>
          <td>R$ ${valorUnitario}</td>
          <td>R$ ${valorTotal}</td>
        </tr>
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
          .head {
            display: flex;
            justify-content: space-between;
            gap: ${isThermal ? "8px" : "16px"};
            border-bottom: 2px solid #0a5d89;
            padding-bottom: ${isThermal ? "8px" : "12px"};
            margin-bottom: ${isThermal ? "10px" : "16px"};
          }
          .brand strong {
            display: block;
            font-size: ${isThermal ? "16px" : "22px"};
          }
          .brand span,
          .meta {
            color: #64748b;
            font-size: ${isThermal ? "10px" : "12px"};
          }
          h1 {
            margin: 0 0 12px;
            font-size: ${isThermal ? "13px" : "18px"};
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th,
          td {
            padding: ${isThermal ? "5px 4px" : "8px 6px"};
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
            font-size: ${isThermal ? "10px" : "12px"};
          }
          th {
            background: #f3f6f9;
          }
          .totals {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-top: ${isThermal ? "10px" : "16px"};
            font-size: ${isThermal ? "11px" : "13px"};
          }
          .totals strong {
            font-size: ${isThermal ? "16px" : "20px"};
          }
          .summary {
            margin-top: ${isThermal ? "8px" : "14px"};
            display: grid;
            gap: 4px;
            font-size: ${isThermal ? "10px" : "12px"};
            color: #334155;
          }
          .footer {
            margin-top: ${isThermal ? "12px" : "20px"};
            color: #64748b;
            font-size: ${isThermal ? "9px" : "11px"};
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="head">
            <div class="brand">
              <strong>V12 ERP</strong>
              <span>Orçamento sem valor fiscal</span>
            </div>
            <div class="meta">
              <div><b>Data:</b> ${data}</div>
              <div><b>Operador:</b> ${operador}</div>
            </div>
          </div>
          <h1>Cliente: ${cliente}</h1>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Descrição</th>
                <th>Qtd</th>
                <th>Valor un.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows || "<tr><td colspan='5'>Sem itens</td></tr>"}
            </tbody>
          </table>
          <div class="summary">
            <div><b>Subtotal:</b> R$ ${subtotal}</div>
            <div><b>Desconto:</b> R$ ${desconto}</div>
            <div><b>Total líquido:</b> R$ ${total}</div>
          </div>
          <div class="totals">
            <div>
              <div><b>Total de itens:</b> ${items.length}</div>
              <div><b>Condição:</b> Orçamento</div>
              <div><b>Formato:</b> ${escapeHtml(printerConfig.layout.toUpperCase())}</div>
            </div>
            <div><b>Total:</b> <strong>R$ ${total}</strong></div>
          </div>
          <div class="footer">Documento interno para conferência e apresentação ao cliente.</div>
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
  const printerConfig = normalizePrinterConfig(config);
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
    await new Promise((resolve, reject) => {
      budgetWindow.webContents.print(
        {
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
        (success, errorType) => {
          if (!success) {
            reject(new Error(errorType || "Falha ao imprimir orçamento."));
            return;
          }

          resolve();
        },
      );
    });

    return true;
  } finally {
    budgetWindow.close();
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
