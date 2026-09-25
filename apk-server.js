import http from "http";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3003;
const HOST = "0.0.0.0";
const APK_FILENAME = "hakimqzz-sms-gateway.apk";
const APK_PATH = path.join(__dirname, "public", APK_FILENAME);

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push({ name, ip: iface.address });
      }
    }
  }
  return ips;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Direct APK Download routes
  if (
    pathname === `/${APK_FILENAME}` ||
    pathname === "/download" ||
    pathname === "/apk" ||
    pathname === "/app.apk" ||
    pathname.endsWith(".apk")
  ) {
    if (!fs.existsSync(APK_PATH)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`APK file not found at: ${APK_PATH}`);
      return;
    }

    const stat = fs.statSync(APK_PATH);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", `attachment; filename="${APK_FILENAME}"`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
        res.end();
        return;
      }

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": end - start + 1,
      });

      const fileStream = fs.createReadStream(APK_PATH, { start, end });
      fileStream.on("error", (err) => {
        console.warn("[APK Server] Stream range error:", err.message);
        if (!res.headersSent) res.writeHead(500);
        res.end();
      });
      res.on("close", () => {
        fileStream.destroy();
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
      });
      const fileStream = fs.createReadStream(APK_PATH);
      fileStream.on("error", (err) => {
        console.warn("[APK Server] Stream error:", err.message);
        if (!res.headersSent) res.writeHead(500);
        res.end();
      });
      res.on("close", () => {
        fileStream.destroy();
      });
      fileStream.pipe(res);
    }
    return;
  }

  // HTML Web Landing Page
  if (pathname === "/" || pathname === "/index.html") {
    const stat = fs.existsSync(APK_PATH) ? fs.statSync(APK_PATH) : null;
    const sizeMb = stat ? (stat.size / (1024 * 1024)).toFixed(2) : "8.08";
    const lastModified = stat ? new Date(stat.mtime).toLocaleString("en-US", { timeZone: "Asia/Dhaka" }) : "Recently";
    const localIps = getLocalIpAddresses();
    const primaryIp = (localIps.find(i => i.name.toLowerCase().includes("wi-fi") || i.ip.startsWith("192.168.")) || localIps[0] || { ip: "localhost" }).ip;
    const downloadUrl = `http://${primaryIp}:${PORT}/${APK_FILENAME}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(downloadUrl)}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HakimQzz SMS Gateway APK Download</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 32px; max-width: 480px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); text-align: center; }
    .badge { display: inline-block; background: #059669; color: white; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; letter-spacing: 0.5px; }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: #ffffff; }
    p.sub { font-size: 14px; color: #94a3b8; margin-bottom: 24px; line-height: 1.5; }
    .btn-download { display: flex; align-items: center; justify-content: center; gap: 10px; background: #2563eb; color: white; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 24px; border-radius: 16px; transition: all 0.2s; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4); margin-bottom: 24px; }
    .btn-download:hover { background: #1d4ed8; transform: translateY(-2px); }
    .meta-box { background: #0f172a; border-radius: 16px; padding: 16px; margin-bottom: 24px; text-align: left; font-size: 13px; color: #cbd5e1; }
    .meta-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #1e293b; }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { color: #64748b; font-weight: 600; }
    .meta-val { font-weight: 700; color: #f1f5f9; }
    .qr-box { background: white; padding: 12px; border-radius: 16px; display: inline-block; margin-bottom: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .qr-box img { display: block; border-radius: 8px; width: 160px; height: 160px; }
    .qr-sub { font-size: 12px; color: #94a3b8; margin-bottom: 20px; }
    .warning { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 14px; padding: 14px; text-align: left; font-size: 12px; color: #fcd34d; line-height: 1.5; }
    .warning strong { color: #f59e0b; display: block; margin-bottom: 4px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">LIVE RELEASE v2.1</div>
    <h1>HakimQzz SMS Gateway</h1>
    <p class="sub">High-Speed SMS Delivery Gateway for DreamFashion POS (Supports Android 7 to Android 15)</p>

    <div class="qr-box">
      <img src="${qrCodeUrl}" alt="Scan to Download on Mobile" />
    </div>
    <div class="qr-sub">Scan QR Code with your phone camera to download directly</div>

    <a href="/${APK_FILENAME}" class="btn-download" download="${APK_FILENAME}">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
      <span>Download APK (${sizeMb} MB)</span>
    </a>

    <div class="meta-box">
      <div class="meta-row"><span class="meta-label">File:</span><span class="meta-val">${APK_FILENAME}</span></div>
      <div class="meta-row"><span class="meta-label">Version:</span><span class="meta-val">v2.1 (Build 3)</span></div>
      <div class="meta-row"><span class="meta-label">Target SDK:</span><span class="meta-val">Android 14 (API 34)</span></div>
      <div class="meta-row"><span class="meta-label">Min SDK:</span><span class="meta-val">Android 7.0 (API 24+)</span></div>
      <div class="meta-row"><span class="meta-label">Build Type:</span><span class="meta-val">Release (Signed v2/v3)</span></div>
      <div class="meta-row"><span class="meta-label">Last Updated:</span><span class="meta-val">${lastModified}</span></div>
    </div>

    <div class="warning">
      <strong>⚠️ Installation Note:</strong>
      If you previously installed an older version, please <strong>uninstall it first</strong> before installing this build to avoid signature conflicts. When prompted by Chrome, enable <em>"Allow from this source"</em>.
    </div>
  </div>
</body>
</html>`;

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`[APK Server] Port ${PORT} is already in use.`);
  } else {
    console.warn(`[APK Server] Server error:`, err.message);
  }
});

process.on("uncaughtException", (err) => {
  console.warn("[APK Server] Uncaught exception:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.warn("[APK Server] Unhandled rejection:", err);
});

process.stdin.resume();

setInterval(() => {
  // Keep event loop active
}, 30000);

process.on("exit", (code) => {
  console.log(`[APK Server] Process exiting with code: ${code}`);
});

process.on("SIGINT", () => {
  console.log("[APK Server] SIGINT received");
});

process.on("SIGTERM", () => {
  console.log("[APK Server] SIGTERM received");
});

server.listen(PORT, HOST, () => {
  console.log(`[APK Server] Running at http://${HOST}:${PORT}`);
  console.log(`[APK Server] Local Access: http://localhost:${PORT}`);
  const ips = getLocalIpAddresses();
  ips.forEach(i => {
    console.log(`[APK Server] Network Access (${i.name}): http://${i.ip}:${PORT}`);
  });
  console.log(`[APK Server] Direct Download: http://${HOST}:${PORT}/${APK_FILENAME}`);
});
