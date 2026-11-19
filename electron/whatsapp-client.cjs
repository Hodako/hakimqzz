/**
 * Native Chromium WhatsApp Web Client for Dream Fashion POS Desktop
 * Runs 100% locally inside Electron's built-in Chromium engine (Client Compute).
 * Zero third-party socket libraries (Baileys/Pino/Qrcode eliminated).
 * Officially supported WhatsApp Web session with persistent partition storage.
 */

const { BrowserWindow, session, app } = require("electron");
const path = require("path");

let waWindow = null;
let status = "disconnected"; // disconnected | connecting | qr_ready | connected
let qrCodeDataUrl = null;
let phone = null;
let name = null;
let lastError = null;
let statusListener = null;
let pollTimer = null;
let isQuitting = false;

const CHROME_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function getStatusSnapshot() {
  return {
    status,
    qrCodeDataUrl,
    phone,
    name,
    lastError,
    isDesktop: true,
    engine: "chromium",
  };
}

function emit() {
  if (typeof statusListener === "function") {
    try {
      statusListener(getStatusSnapshot());
    } catch (_) {}
  }
}

function prepareQuit() {
  isQuitting = true;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (waWindow && !waWindow.isDestroyed()) {
    try {
      waWindow.destroy();
    } catch (_) {}
    waWindow = null;
  }
}

function getWaSession() {
  const waSession = session.fromPartition("persist:whatsapp_web");
  waSession.setUserAgent(CHROME_USER_AGENT);
  return waSession;
}

function formatInternationalPhone(rawPhone) {
  let clean = String(rawPhone || "").replace(/[^0-9]/g, "");
  if (clean.startsWith("0") && clean.length === 11) {
    clean = "88" + clean;
  } else if (clean.length === 10 && clean.startsWith("1")) {
    clean = "880" + clean;
  }
  return clean;
}

/**
 * Creates or retrieves the background Chromium WhatsApp Web window
 */
async function ensureWaWindow(show = false) {
  if (waWindow && !waWindow.isDestroyed()) {
    if (show) {
      if (waWindow.isMinimized()) waWindow.restore();
      waWindow.show();
      waWindow.focus();
    }
    return waWindow;
  }

  const waSession = getWaSession();

  const icoPath = path.join(__dirname, "../public/favicon.ico");
  const pngPath = path.join(__dirname, "../public/logo.png");
  const fs = require("fs");
  const appIcon = fs.existsSync(icoPath) ? icoPath : (fs.existsSync(pngPath) ? pngPath : undefined);

  waWindow = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    title: "WhatsApp Web — Dream Fashion POS (Chromium)",
    icon: appIcon,
    show: show,
    backgroundColor: "#111b21",
    webPreferences: {
      session: waSession,
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  waWindow.setMenuBarVisibility(false);

  waWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      waWindow.hide();
    }
  });

  // Inject script to detect QR code & login status continuously
  startDomPoller();

  await waWindow.loadURL("https://web.whatsapp.com", {
    userAgent: CHROME_USER_AGENT,
  });

  return waWindow;
}

function startDomPoller() {
  if (pollTimer) clearInterval(pollTimer);

  pollTimer = setInterval(async () => {
    if (!waWindow || waWindow.isDestroyed()) return;

    try {
      const state = await waWindow.webContents.executeJavaScript(`
        (function() {
          try {
            // 1. Check if logged in (Chat list / search bar / side panel)
            const chatList = document.querySelector('#pane-side') ||
                             document.querySelector('[data-testid="chat-list"]') ||
                             document.querySelector('[aria-label="Chat list"]') ||
                             document.querySelector('header [data-icon="chat"]') ||
                             document.querySelector('div[contenteditable="true"][data-tab="3"]');
            
            if (chatList) {
              // Attempt to extract display name / profile info if available
              let name = "WhatsApp Connected";
              try {
                const headerTitle = document.querySelector('header h1') || document.querySelector('header [role="button"] span');
                if (headerTitle && headerTitle.innerText) {
                  name = headerTitle.innerText;
                }
              } catch(_) {}
              return { status: "connected", name };
            }

            // 2. Check if QR code is available on the canvas
            const canvas = document.querySelector('canvas[aria-label*="QR"]') ||
                           document.querySelector('canvas[aria-label*="Scan"]') ||
                           document.querySelector('div[data-ref] canvas') ||
                           document.querySelector('canvas');

            if (canvas && canvas.width >= 100 && canvas.height >= 100) {
              const qrData = canvas.toDataURL("image/png");
              return { status: "qr_ready", qrCodeDataUrl: qrData };
            }

            // 3. Auto-click "Click to reload QR code" if expired
            const reloadBtn = document.querySelector('button[aria-label*="reload"]') ||
                              document.querySelector('span[data-icon="refresh"]') ||
                              document.querySelector('[data-testid="refresh-qr"]');
            if (reloadBtn) {
              reloadBtn.closest('button')?.click();
            }

            // 4. Loading / connecting state
            return { status: "connecting" };
          } catch(e) {
            return { status: "connecting", error: e.message };
          }
        })()
      `).catch(() => ({ status: "connecting" }));

      if (state) {
        let changed = false;
        if (state.status !== status) {
          status = state.status;
          changed = true;
        }
        if (state.qrCodeDataUrl !== undefined && state.qrCodeDataUrl !== qrCodeDataUrl) {
          qrCodeDataUrl = state.qrCodeDataUrl;
          changed = true;
        }
        if (state.name && state.name !== name) {
          name = state.name;
          changed = true;
        }
        if (changed) {
          lastError = null;
          emit();
        }
      }
    } catch (_) {}
  }, 2000);
}

/**
 * Starts WhatsApp Web in the Chromium background window
 */
async function startWhatsApp(userDataDir, onStatusUpdate) {
  if (onStatusUpdate) statusListener = onStatusUpdate;

  if (status === "connected" && waWindow && !waWindow.isDestroyed()) {
    emit();
    return getStatusSnapshot();
  }

  status = "connecting";
  qrCodeDataUrl = null;
  lastError = null;
  emit();

  try {
    await ensureWaWindow(false);
  } catch (err) {
    status = "disconnected";
    lastError = err?.message || "Failed to initialize Chromium WhatsApp window";
    emit();
  }

  return getStatusSnapshot();
}

/**
 * Opens or restores the Chromium WhatsApp window on screen
 */
async function openWindow() {
  await ensureWaWindow(true);
  return getStatusSnapshot();
}

/**
 * Disconnects / Logs out WhatsApp session and clears partition data
 */
async function disconnectWhatsApp(userDataDir) {
  try {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }

    const waSession = getWaSession();
    await waSession.clearStorageData();
    await waSession.clearCache();

    if (waWindow && !waWindow.isDestroyed()) {
      await waWindow.loadURL("https://web.whatsapp.com", {
        userAgent: CHROME_USER_AGENT,
      });
      startDomPoller();
    }
  } catch (err) {
    console.warn("[Chromium WhatsApp] Disconnect error:", err);
  }

  status = "disconnected";
  qrCodeDataUrl = null;
  phone = null;
  name = null;
  lastError = null;

  emit();
  return getStatusSnapshot();
}

/**
 * Sends a WhatsApp message via native Chromium WebContents
 */
async function sendMessage(targetPhone, message) {
  if (status !== "connected" || !waWindow || waWindow.isDestroyed()) {
    // If window is open but status was still checking, trigger a check
    if (waWindow && !waWindow.isDestroyed()) {
      await waWindow.webContents.executeJavaScript(`console.log("Triggering send from POS...")`);
    } else {
      throw new Error("Desktop WhatsApp is not connected. Please scan the QR code first.");
    }
  }

  const clean = formatInternationalPhone(targetPhone);
  if (clean.length < 10) {
    throw new Error("Invalid recipient phone number: " + targetPhone);
  }

  const encodedMsg = encodeURIComponent(String(message || ""));
  const targetUrl = `https://web.whatsapp.com/send?phone=${clean}&text=${encodedMsg}`;

  // Load URL in Chromium WhatsApp Web
  await waWindow.loadURL(targetUrl, { userAgent: CHROME_USER_AGENT });

  const startTime = Date.now();
  const maxTimeoutMs = 25000;

  while (Date.now() - startTime < maxTimeoutMs) {
    await new Promise((r) => setTimeout(r, 800));

    if (!waWindow || waWindow.isDestroyed()) {
      throw new Error("Chromium WhatsApp window closed unexpectedly.");
    }

    const result = await waWindow.webContents.executeJavaScript(`
      (function() {
        try {
          // 1. Detect invalid phone number modal
          const popup = document.querySelector('[data-testid="popup-contents"]') ||
                        document.querySelector('[role="dialog"]');
          if (popup) {
            const text = popup.innerText || "";
            if (text.includes("invalid") || text.includes("phone number") || text.includes("URL")) {
              const okBtn = popup.querySelector('button');
              if (okBtn) okBtn.click();
              return { error: "Recipient phone number is not registered on WhatsApp or is invalid." };
            }
          }

          // 2. Detect and click Send button
          const sendBtn = document.querySelector('button[data-testid="send"]') ||
                          document.querySelector('button span[data-icon="send"]')?.closest('button') ||
                          document.querySelector('span[data-icon="send"]')?.parentElement ||
                          document.querySelector('button[aria-label="Send"]');

          if (sendBtn) {
            sendBtn.click();
            return { sent: true };
          }

          // 3. Fallback: Check if message is pre-filled in textbox and dispatch Enter
          const textbox = document.querySelector('footer div[contenteditable="true"]') ||
                          document.querySelector('div[contenteditable="true"][data-tab="10"]');
          if (textbox && textbox.innerText && textbox.innerText.trim().length > 0) {
            textbox.focus();
            const evt = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true
            });
            textbox.dispatchEvent(evt);
            return { sent: true };
          }

          return { waiting: true };
        } catch(e) {
          return { waiting: true };
        }
      })()
    `).catch(() => ({ waiting: true }));

    if (result?.error) {
      throw new Error(result.error);
    }

    if (result?.sent) {
      await new Promise((r) => setTimeout(r, 1200));
      return { success: true, to: clean };
    }
  }

  throw new Error("Timed out waiting for WhatsApp message delivery. Ensure the recipient number is valid.");
}

/**
 * Sends broadcast messages sequentially
 */
async function sendBroadcast(recipients, message) {
  if (status !== "connected") {
    throw new Error("Desktop WhatsApp is not connected.");
  }
  const list = Array.isArray(recipients) ? recipients : [];
  let sent = 0;
  let failed = 0;

  for (const r of list) {
    try {
      const p = typeof r === "string" ? r : r?.phone;
      if (!p) continue;
      await sendMessage(p, message);
      sent++;
      await new Promise((res) => setTimeout(res, 1500));
    } catch (_) {
      failed++;
    }
  }

  return { success: true, sent, failed };
}

module.exports = {
  getStatusSnapshot,
  startWhatsApp,
  openWindow,
  disconnectWhatsApp,
  sendMessage,
  sendBroadcast,
  prepareQuit,
};
