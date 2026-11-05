const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronPOS", {
  isElectron: true,
  isDesktopApp: true,
  platform: process.platform,
  
  // Get all installed Windows printers and default printer
  getPrinters: async () => {
    try {
      return await ipcRenderer.invoke("pos:get-printers");
    } catch (err) {
      console.error("[ElectronPOS] Failed to get printers:", err);
      return [];
    }
  },

  // Get default Windows printer
  getDefaultPrinter: async () => {
    try {
      return await ipcRenderer.invoke("pos:get-default-printer");
    } catch (err) {
      console.error("[ElectronPOS] Failed to get default printer:", err);
      return null;
    }
  },

  // 1-Click Silent Print directly to the default printer (zero dialog!)
  printSilent: async (options) => {
    try {
      return await ipcRenderer.invoke("pos:print-silent", options);
    } catch (err) {
      console.error("[ElectronPOS] Silent print error:", err);
      return { success: false, error: err.message };
    }
  },

  // Open connected POS cash drawer (pulse kick)
  openCashDrawer: async (printerName) => {
    try {
      return await ipcRenderer.invoke("pos:open-cash-drawer", { printerName });
    } catch (err) {
      console.error("[ElectronPOS] Cash drawer error:", err);
      return { success: false, error: err.message };
    }
  },

  // App window controls
  minimize: () => ipcRenderer.send("pos:minimize"),
  maximize: () => ipcRenderer.send("pos:maximize"),
  close: () => ipcRenderer.send("pos:close"),
});
