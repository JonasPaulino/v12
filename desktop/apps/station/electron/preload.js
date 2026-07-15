import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("v12Desktop", {
  quit: () => ipcRenderer.invoke("app:quit"),
  toggleFullscreen: () => ipcRenderer.invoke("window:toggle-fullscreen"),
  listPrinters: () => ipcRenderer.invoke("printer:list"),
  printBudget: (payload, printerConfig) => ipcRenderer.invoke("sale:print-budget", payload, printerConfig),
  printDanfce: (payload, printerConfig) => ipcRenderer.invoke("sale:print-danfce", payload, printerConfig),
  printPdfFile: (pdfPath, printerConfig) => ipcRenderer.invoke("sale:print-pdf-file", pdfPath, printerConfig),
});
