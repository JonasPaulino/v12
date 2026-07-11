import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("v12Desktop", {
  quit: () => ipcRenderer.invoke("app:quit"),
  toggleFullscreen: () => ipcRenderer.invoke("window:toggle-fullscreen"),
  printBudget: (payload) => ipcRenderer.invoke("sale:print-budget", payload),
});
