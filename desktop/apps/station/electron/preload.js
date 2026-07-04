import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("v12Desktop", {
  quit: () => ipcRenderer.invoke("app:quit"),
  toggleFullscreen: () => ipcRenderer.invoke("window:toggle-fullscreen"),
});
