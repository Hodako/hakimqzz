/**
 * DreamFashion - Ultimate Windows POS Desktop Application
 * Connected with Next.js Server & 1-Click Silent Thermal Printing
 */

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { startBridgeServer } = require("./pos-bridge.cjs");

let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = process.env.PORT || 3141;
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}`;

// Helper to check if server is responsive
function checkServerReady(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.abort();
      resolve(false);
    });
  });
}

// Start Next.js server locally if not already running
async function ensureServerRunning() {
  const isRunning = await checkServerReady(SERVER_URL);
  if (isRunning) {
    console.log(`[Windows POS] Server is already running on ${SERVER_URL}`);
    return;
  }

  console.log(`[Windows POS] Starting local Next.js POS server on port ${SERVER_PORT}...`);
  const rootDir = path.resolve(__dirname, "..");
  
  // Use node server.js or npm run start
  serverProcess = spawn("node", ["server.js"], {
    cwd: rootDir,
    env: { ...process.env, PORT: String(SERVER_PORT), NODE_ENV: "production" },
    shell: true,
    stdio: "ignore",
    windowsHide: true,
  });

  serverProcess.on("error", (err) => {
    console.error("[Windows POS] Failed to spawn server process:", err);
  });

  // Wait for server to become ready (up to 15 seconds)
  let attempts = 0;
  while (attempts < 30) {
    await new Promise((r) => setTimeout(r, 500));
    const ready = await checkServerReady(SERVER_URL);
    if (ready) {
      console.log(`[Windows POS] Server became ready after ${attempts * 500}ms!`);
      return;
    }
    attempts++;
  }
  console.warn("[Windows POS] Server launch timed out; continuing to load window.");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: "Dream Fashion — Modern POS Terminal",
    icon: path.join(__dirname, "../public/logo.png"),
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Keep POS active even when blurred
    },
  });

  // Hide default menu for clean real POS experience
  mainWindow.setMenuBarVisibility(false);

  // Load the application
  mainWindow.loadURL(SERVER_URL).catch(() => {
    console.log("[Windows POS] Loading fallback error screen...");
    mainWindow.loadFile(path.join(__dirname, "error.html"));
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── Silent Printing IPC Handlers ────────────────────────────

// 1. Get installed Windows printers and identify default printer
ipcMain.handle("pos:get-printers", async () => {
  if (!mainWindow) return [];
  try {
    const list = await mainWindow.webContents.getPrintersAsync();
    return list;
  } catch (err) {
    console.error("[Windows POS] Error fetching printers:", err);
    return [];
  }
});

// 2. Get default Windows printer
ipcMain.handle("pos:get-default-printer", async () => {
  if (!mainWindow) return null;
  try {
    const list = await mainWindow.webContents.getPrintersAsync();
    return list.find((p) => p.isDefault) || list[0] || null;
  } catch (err) {
    console.error("[Windows POS] Error fetching default printer:", err);
    return null;
  }
});

// 3. 1-Click Silent Print without ANY print dialog!
async function performSilentPrint(html, printerName) {
  return new Promise(async (resolve) => {
    let printWin = new BrowserWindow({
      show: false,
      width: 320,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    printWin.on("closed", () => {
      printWin = null;
    });

    try {
      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      const printers = await printWin.webContents.getPrintersAsync();
      const defaultP = printers.find((p) => p.isDefault)?.name || printers[0]?.name || "";
      const targetPrinter = printerName || defaultP;

      printWin.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: targetPrinter,
          margins: { marginType: "none" },
        },
        (success, failureReason) => {
          if (printWin) {
            printWin.close();
          }
          if (success) {
            console.log(`[Windows POS] Thermal receipt printed successfully to: ${targetPrinter}`);
            resolve({ success: true, printer: targetPrinter });
          } else {
            console.warn(`[Windows POS] Silent print failed: ${failureReason}`);
            resolve({ success: false, error: failureReason });
          }
        }
      );
    } catch (e) {
      if (printWin) printWin.close();
      resolve({ success: false, error: e.message });
    }
  });
}

ipcMain.handle("pos:print-silent", async (event, options = {}) => {
  const { html, printerName } = options;
  if (!html) return { success: false, error: "Empty HTML" };
  return await performSilentPrint(html, printerName);
});

// 4. Open cash drawer via ESC/POS command
ipcMain.handle("pos:open-cash-drawer", async (event, { printerName } = {}) => {
  // ESC p 0 25 250 command to kick standard RJ11 drawer on receipt printer
  const drawerKickHtml = `
    <html>
      <head><style>@page { size: 10mm 10mm; margin: 0; }</style></head>
      <body>\x1b\x70\x00\x19\xfa</body>
    </html>
  `;
  return await performSilentPrint(drawerKickHtml, printerName);
});

// ── App Lifecycle ───────────────────────────────────────────

app.whenReady().then(async () => {
  // Start local POS bridge HTTP server so external browsers can also silent print
  try {
    startBridgeServer(performSilentPrint);
  } catch (e) {
    console.warn("[Windows POS] Could not start POS bridge:", e);
  }

  // Ensure server is up
  await ensureServerRunning();

  // Create main UI window
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Kill child server process if spawned by us
    if (serverProcess) {
      try {
        serverProcess.kill();
      } catch (_) {}
    }
    app.quit();
  }
});
