/**
 * Native Chromium WhatsApp Web Client for Dream Fashion POS Desktop
 * Runs 100% locally inside Electron's built-in Chromium engine (Client Compute).
 * Optimized for high speed: Fast in-page SPA navigation (no full page reload).
 * Never demotes "connected" session back to "connecting" during message delivery.
 */

const { BrowserWindow, session, app } = require("electron");
const path = require("path");
const http = require("http");
const https = require("https");

let waWindow = null;
let status = "disconnected"; // disconnected | connecting | qr_ready | connected
let qrCodeDataUrl = null;
let phone = null;
let name = null;
let lastError = null;
let statusListener = null;
let pollTimer = null;
let isQuitting = false;
let isSending = false;

// OpenWA Gateway Configuration
let openWaConfig = {
  gatewayUrl: process.env.OPENWA_GATEWAY_URL || "http://127.0.0.1:2785",
  sessionId: process.env.OPENWA_SESSION_ID || "dreamfashion",
  apiKey: process.env.OPENWA_API_KEY || "",
  enabled: true,
};
let openWaOnline = false;

function setOpenWaConfig(cfg) {
  if (!cfg) return;
  openWaConfig = {
    gatewayUrl: (cfg.gatewayUrl || openWaConfig.gatewayUrl || "http://127.0.0.1:2785").trim(),
    sessionId: (cfg.sessionId || openWaConfig.sessionId || "dreamfashion").trim(),
    apiKey: (cfg.apiKey !== undefined ? cfg.apiKey : openWaConfig.apiKey).trim(),
    enabled: cfg.enabled !== undefined ? Boolean(cfg.enabled) : true,
  };
}

/**
 * Rapid HTTP request to OpenWA REST API Gateway
 */
function requestOpenWa(endpointPath, method, data, timeoutMs = 5000) {
  return new Promise((resolve) => {
    try {
      const baseUrl = openWaConfig.gatewayUrl.replace(/\/+$/, "");
      const fullUrl = new URL(baseUrl + endpointPath);
      const isHttps = fullUrl.protocol === "https:";
      const lib = isHttps ? https : http;

      const bodyBuffer = data ? Buffer.from(JSON.stringify(data), "utf8") : null;
      const headers = {
        Accept: "application/json",
      };
      if (bodyBuffer) {
        headers["Content-Type"] = "application/json";
        headers["Content-Length"] = String(bodyBuffer.length);
      }
      if (openWaConfig.apiKey) {
        headers["X-API-Key"] = openWaConfig.apiKey;
        headers["Authorization"] = `Bearer ${openWaConfig.apiKey}`;
      }

      const req = lib.request(
        fullUrl,
        {
          method: method || "GET",
          headers,
          timeout: timeoutMs,
        },
        (res) => {
          let chunks = "";
          res.on("data", (chunk) => {
            chunks += chunk;
          });
          res.on("end", () => {
            let parsed = null;
            try {
              parsed = JSON.parse(chunks);
            } catch (_) {
              parsed = chunks;
            }
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              data: parsed,
            });
          });
        }
      );

      req.on("error", (err) => resolve({ ok: false, error: err.message }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, error: "OpenWA request timed out" });
      });

      if (bodyBuffer) {
        req.write(bodyBuffer);
      }
      req.end();
    } catch (err) {
      resolve({ ok: false, error: err.message });
    }
  });
}

/**
 * Tries sending a WhatsApp message via OpenWA Gateway in ~50ms
 */
async function trySendViaOpenWa(cleanPhone, message) {
  if (!openWaConfig.enabled) return null;
  const chatId = `${cleanPhone}@c.us`;
  const endpoint = `/api/sessions/${encodeURIComponent(openWaConfig.sessionId)}/messages/send-text`;

  const res = await requestOpenWa(endpoint, "POST", { chatId, text: message }, 8000);
  if (res && res.ok) {
    openWaOnline = true;
    return {
      success: true,
      via: "openwa",
      messageId: res.data?.id || res.data?.messageId,
    };
  }
  return null;
}

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
    engine: openWaOnline ? "openwa" : "chromium",
    openWaOnline,
    openWaConfig: {
      gatewayUrl: openWaConfig.gatewayUrl,
      sessionId: openWaConfig.sessionId,
      enabled: openWaConfig.enabled,
    },
    isSending,
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
            // 1. Check if logged in (Chat list / search bar / side panel / main header)
            const chatList = document.querySelector('#pane-side') ||
                             document.querySelector('[data-testid="chat-list"]') ||
                             document.querySelector('[aria-label="Chat list"]') ||
                             document.querySelector('header [data-icon="chat"]') ||
                             document.querySelector('#main') ||
                             document.querySelector('footer div[contenteditable="true"]') ||
                             document.querySelector('div[contenteditable="true"][data-tab="3"]');
            
            if (chatList) {
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

            return { status: "unknown" };
          } catch(e) {
            return { status: "unknown", error: e.message };
          }
        })()
      `).catch(() => ({ status: "unknown" }));

      if (state) {
        let changed = false;

        if (state.status === "connected") {
          if (status !== "connected") {
            status = "connected";
            qrCodeDataUrl = null;
            changed = true;
          }
          if (state.name && state.name !== name) {
            name = state.name;
            changed = true;
          }
        } else if (state.status === "qr_ready") {
          if (status !== "qr_ready" || (state.qrCodeDataUrl && state.qrCodeDataUrl !== qrCodeDataUrl)) {
            status = "qr_ready";
            qrCodeDataUrl = state.qrCodeDataUrl;
            changed = true;
          }
        } else if (status !== "connected") {
          // CRITICAL: NEVER demote an already "connected" session back to "connecting"!
          // Only show "connecting" if we were NOT connected previously
          if (status !== "connecting") {
            status = "connecting";
            changed = true;
          }
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
 * Uses rapid in-page SPA navigation to prevent full-page reloads and eliminate "connecting..." delays!
 */
async function sendMessage(targetPhone, message) {
  const clean = formatInternationalPhone(targetPhone);
  if (clean.length < 10) {
    throw new Error("Invalid recipient phone number: " + targetPhone);
  }

  isSending = true;
  emit();

  try {
    // 1. Try Lightning-Fast OpenWA REST API Gateway first (~50-100ms instant delivery!)
    const openWaResult = await trySendViaOpenWa(clean, message);
    if (openWaResult && openWaResult.success) {
      return { success: true, via: "openwa", to: clean, messageId: openWaResult.messageId };
    }

    if (status !== "connected" || !waWindow || waWindow.isDestroyed()) {
      throw new Error("WhatsApp is not connected. Connect via OpenWA Gateway or scan the QR code in Settings.");
    }
    const encodedMsg = encodeURIComponent(String(message || ""));
    const targetUrl = `https://web.whatsapp.com/send?phone=${clean}&text=${encodedMsg}`;

    // 1. Fast in-page navigation: use window.location inside the already-loaded WhatsApp Web instance
    // This avoids Electron's blocking did-finish-load wait and reuses the existing active session
    try {
      await waWindow.webContents.executeJavaScript(`
        (function() {
          const target = "${targetUrl}";
          // Try history pushState first for instant SPA routing
          try {
            window.history.pushState({}, '', target);
            window.dispatchEvent(new PopStateEvent('popstate'));
          } catch(_) {}
          
          if (!window.location.href.includes("${clean}")) {
            window.location.href = target;
          }
        })()
      `);
    } catch (_) {
      // Fallback: non-blocking loadURL
      waWindow.loadURL(targetUrl, { userAgent: CHROME_USER_AGENT }).catch(() => {});
    }

    // 2. High-frequency check (every 300ms) for Send button or message textbox
    const startTime = Date.now();
    const maxTimeoutMs = 18000;

    while (Date.now() - startTime < maxTimeoutMs) {
      await new Promise((r) => setTimeout(r, 300));

      if (!waWindow || waWindow.isDestroyed()) {
        throw new Error("Chromium WhatsApp window was closed unexpectedly.");
      }

      const result = await waWindow.webContents.executeJavaScript(`
        (function() {
          try {
            // 1. Detect invalid phone number modal
            const popup = document.querySelector('[data-testid="popup-contents"]') ||
                          document.querySelector('[role="dialog"]');
            if (popup) {
              const text = (popup.innerText || "").toLowerCase();
              if (text.includes("invalid") || text.includes("phone number") || text.includes("url")) {
                const okBtn = popup.querySelector('button');
                if (okBtn) okBtn.click();
                return { error: "Recipient phone number is not registered on WhatsApp or is invalid." };
              }
            }

            // 2. Detect Send button (all known WhatsApp Web selector variants)
            const sendBtn = document.querySelector('button[data-testid="send"]') ||
                            document.querySelector('button[aria-label="Send"]') ||
                            document.querySelector('button[aria-label*="send" i]') ||
                            document.querySelector('span[data-icon="send"]')?.closest('button') ||
                            document.querySelector('span[data-icon="send"]')?.parentElement ||
                            document.querySelector('footer button:has(span[data-icon="send"])');

            if (sendBtn && !sendBtn.disabled) {
              sendBtn.click();
              return { sent: true };
            }

            // 3. Fallback: If text is inside the message input box, dispatch Enter key
            const textbox = document.querySelector('footer div[contenteditable="true"]') ||
                            document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
                            document.querySelector('#main footer div[role="textbox"]');

            if (textbox && textbox.innerText && textbox.innerText.trim().length > 0) {
              textbox.focus();
              const enterEvt = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true
              });
              textbox.dispatchEvent(enterEvt);
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
        // Quick 500ms safety wait for transmission to complete
        await new Promise((r) => setTimeout(r, 500));
        return { success: true, to: clean };
      }
    }

    throw new Error("Timed out waiting for WhatsApp message delivery. Ensure recipient number is valid.");
  } finally {
    isSending = false;
    emit();
  }
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
      await new Promise((res) => setTimeout(res, 1200));
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
  setOpenWaConfig,
  requestOpenWa,
};
