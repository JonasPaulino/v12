import { app, BrowserWindow, Menu, globalShortcut, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: "V12 PDV",
    fullscreen: true,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.resolve(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5174");
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
