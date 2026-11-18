const path = require("path");
const fs = require("fs");

let sock = null;
let status = "disconnected"; // disconnected | connecting | qr_ready | connected
let qrCodeDataUrl = null;
let phone = null;
let name = null;
let lastError = null;
let statusListener = null;
let authDirPath = null;

function setAuthDir(dir) {
  authDirPath = dir;
  if (!fs.existsSync(authDirPath)) {
    fs.mkdirSync(authDirPath, { recursive: true });
  }
}

function getStatusSnapshot() {
  return {
    status,
    qrCodeDataUrl,
    phone,
    name,
    lastError,
    isDesktop: true,
  };
}

function emit() {
  if (typeof statusListener === "function") {
    try {
      statusListener(getStatusSnapshot());
    } catch (_) {}
  }
}

function formatJid(rawPhone) {
  let clean = String(rawPhone || "").replace(/[^0-9]/g, "");
  if (clean.startsWith("0") && clean.length === 11) {
    clean = "88" + clean;
  } else if (clean.length === 10 && clean.startsWith("1")) {
    clean = "880" + clean;
  }
  return `${clean}@s.whatsapp.net`;
}

async function startWhatsApp(userDataDir, onStatusUpdate) {
  if (onStatusUpdate) statusListener = onStatusUpdate;
  if (!authDirPath && userDataDir) {
    setAuthDir(path.join(userDataDir, "whatsapp_auth"));
  }

  if (status === "connected" && sock) {
    emit();
    return getStatusSnapshot();
  }
  if (status === "connecting" || status === "qr_ready") {
    emit();
    return getStatusSnapshot();
  }

  status = "connecting";
  qrCodeDataUrl = null;
  lastError = null;
  emit();

  try {
    const QRCode = require("qrcode");
    const pino = require("pino");
    const baileys = await import("@whiskeysockets/baileys");
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;

    const { state, saveCreds } = await useMultiFileAuthState(authDirPath);
    let version;
    try {
      const vRes = await fetchLatestBaileysVersion();
      version = vRes.version;
    } catch (_) {}

    sock = makeWASocket({
      ...(version ? { version } : {}),
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: ["Dream Fashion Desktop", "Windows", "2.5.4"],
      connectTimeoutMs: 60000,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          qrCodeDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 2 });
          status = "qr_ready";
          lastError = null;
          emit();
        } catch (err) {
          lastError = err?.message || "Failed to generate QR code";
          emit();
        }
      }

      if (connection === "open") {
        status = "connected";
        qrCodeDataUrl = null;
        lastError = null;
        const jid = sock?.user?.id || "";
        phone = jid ? jid.split(":")[0].split("@")[0] : null;
        name = sock?.user?.name || "WhatsApp Connected";
        emit();
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        sock = null;
        qrCodeDataUrl = null;

        if (!shouldReconnect) {
          status = "disconnected";
          phone = null;
          name = null;
          try {
            if (authDirPath && fs.existsSync(authDirPath)) {
              fs.rmSync(authDirPath, { recursive: true, force: true });
            }
          } catch (_) {}
          emit();
        } else {
          status = "disconnected";
          emit();
          setTimeout(() => {
            startWhatsApp(userDataDir, statusListener).catch(() => {});
          }, 2500);
        }
      }
    });
  } catch (err) {
    status = "disconnected";
    lastError = err?.message || String(err);
    sock = null;
    emit();
  }

  return getStatusSnapshot();
}

async function disconnectWhatsApp(userDataDir) {
  if (!authDirPath && userDataDir) {
    setAuthDir(path.join(userDataDir, "whatsapp_auth"));
  }
  try {
    if (sock) {
      await sock.logout().catch(() => {});
      sock = null;
    }
  } catch (_) {}

  status = "disconnected";
  qrCodeDataUrl = null;
  phone = null;
  name = null;
  lastError = null;

  try {
    if (authDirPath && fs.existsSync(authDirPath)) {
      fs.rmSync(authDirPath, { recursive: true, force: true });
    }
  } catch (_) {}

  emit();
  return getStatusSnapshot();
}

async function sendMessage(targetPhone, message) {
  if (status !== "connected" || !sock) {
    throw new Error("Desktop WhatsApp is not connected. Scan the QR code first.");
  }
  const clean = String(targetPhone || "").replace(/[^0-9]/g, "");
  if (clean.length < 10) {
    throw new Error("Invalid recipient phone number.");
  }
  const jid = formatJid(clean);
  await sock.sendMessage(jid, { text: String(message || "") });
  return { success: true, to: clean };
}

async function sendBroadcast(recipients, message) {
  if (status !== "connected" || !sock) {
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
      await new Promise((res) => setTimeout(res, 1200 + Math.floor(Math.random() * 1000)));
    } catch (_) {
      failed++;
    }
  }
  return { success: true, sent, failed };
}

module.exports = {
  getStatusSnapshot,
  startWhatsApp,
  disconnectWhatsApp,
  sendMessage,
  sendBroadcast,
};
