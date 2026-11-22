const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronPOS", {
  isDesktopApp: true,
  // 1-Click Silent Print or Dialog Print directly to selected/default Windows thermal/POS printer
  printSilent: (options) => ipcRenderer.invoke("pos:print-silent", options),
  // List all connected Windows printers
  getPrinters: () => ipcRenderer.invoke("pos:get-printers"),
  // Get default Windows printer
  getDefaultPrinter: () => ipcRenderer.invoke("pos:get-default-printer"),
  // Set real Windows OS default printer
  setDefaultPrinter: (printerName) => ipcRenderer.invoke("pos:set-default-printer", { printerName }),
  // Open real Windows OS Printing Preferences dialog for a printer
  openPrinterPreferences: (printerName) => ipcRenderer.invoke("pos:open-printer-preferences", { printerName }),
  // Open real Windows OS Printer Properties dialog for a printer
  openPrinterProperties: (printerName) => ipcRenderer.invoke("pos:open-printer-properties", { printerName }),
  // Open Windows OS Printers & Scanners Settings
  openWindowsPrinterSettings: () => ipcRenderer.invoke("pos:open-windows-printers-settings"),
  // Trigger cash drawer kick via ESC/POS
  openCashDrawer: (printerName) => ipcRenderer.invoke("pos:open-cash-drawer", { printerName }),
  // Client-Compute Desktop WhatsApp Integration (runs locally in Electron main process)
  whatsapp: {
    getStatus: () => ipcRenderer.invoke("wa:get-status"),
    start: () => ipcRenderer.invoke("wa:start"),
    openWindow: () => ipcRenderer.invoke("wa:open-window"),
    disconnect: () => ipcRenderer.invoke("wa:disconnect"),
    sendMessage: (payload) => ipcRenderer.invoke("wa:send-message", payload),
    sendBroadcast: (payload) => ipcRenderer.invoke("wa:send-broadcast", payload),
    setOpenWaConfig: (cfg) => ipcRenderer.invoke("wa:set-openwa-config", cfg),
    onStatusUpdate: (callback) => {
      const listener = (_event, snapshot) => callback(snapshot);
      ipcRenderer.on("wa:status-update", listener);
      return () => ipcRenderer.removeListener("wa:status-update", listener);
    },
  },
});
