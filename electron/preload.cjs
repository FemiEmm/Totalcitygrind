const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("totalCityGrindMusic", {
  listTracks: () => ipcRenderer.invoke("tcg-music:list"),
  openFolder: () => ipcRenderer.invoke("tcg-music:open-folder"),
});

contextBridge.exposeInMainWorld("totalCityGrindWindow",{minimize:()=>ipcRenderer.send("tcg-window:minimize"),toggleMaximize:()=>ipcRenderer.invoke("tcg-window:toggle-maximize"),close:()=>ipcRenderer.send("tcg-window:close"),onMaximized:(fn)=>{const h=(_e,v)=>fn(Boolean(v));ipcRenderer.on("tcg-window:maximized",h);return()=>ipcRenderer.removeListener("tcg-window:maximized",h)}});

contextBridge.exposeInMainWorld("totalCityGrindCache", { clear: () => ipcRenderer.invoke("tcg-cache:clear") });
