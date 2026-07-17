const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("v12Desktop", {
  quit: () => ipcRenderer.invoke("app:quit"),
  restart: () => ipcRenderer.invoke("app:restart"),
  checkForUpdates: () => ipcRenderer.invoke("release-updater:check"),
  onReleaseUpdaterState: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("release-updater:state", listener);
    return () => ipcRenderer.removeListener("release-updater:state", listener);
  },
  toggleFullscreen: () => ipcRenderer.invoke("window:toggle-fullscreen"),
  listPrinters: () => ipcRenderer.invoke("printer:list"),
  printBudget: (payload, printerConfig) =>
    ipcRenderer.invoke("sale:print-budget", payload, printerConfig),
  printDanfce: (payload, printerConfig) =>
    ipcRenderer.invoke("sale:print-danfce", payload, printerConfig),
  printPdfFile: (pdfPath, printerConfig) =>
    ipcRenderer.invoke("sale:print-pdf-file", pdfPath, printerConfig),
});
