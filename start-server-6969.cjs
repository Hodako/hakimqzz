/**
 * Dual High-Performance HTTP & FTP Server on Port 6969 & 2121
 * Serves Classic World and Dream Fashion POS software directly for local network download.
 */

const http = require("http");
const net = require("net");
const fs = require("fs");
const path = require("path");
const os = require("os");

const HTTP_PORT = 6969;
const FTP_PORT = 2121;
const DOWNLOADS_DIR = path.join(__dirname, "downloads");

function getLocalIp() {
  const nets = os.networkInterfaces();
  // 1. Look for physical Wi-Fi or Ethernet (192.168.* or 10.*)
  for (const name of Object.keys(nets)) {
    if (/wsl|vEthernet|hyper-v|virtual/i.test(name)) continue;
    for (const netInfo of nets[name] || []) {
      if (
        netInfo.family === "IPv4" &&
        !netInfo.internal &&
        !netInfo.address.startsWith("169.254") &&
        !netInfo.address.startsWith("172.17")
      ) {
        return netInfo.address;
      }
    }
  }
  return "192.168.110.172";
}

const localIp = getLocalIp();

// ============================================================================
// 1. HTTP Server on Port 6969 with Modern Web UI & Fast Stream Downloads
// ============================================================================

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFilesList() {
  if (!fs.existsSync(DOWNLOADS_DIR)) return [];
  const entries = fs.readdirSync(DOWNLOADS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => {
      const stats = fs.statSync(path.join(DOWNLOADS_DIR, e.name));
      const ext = path.extname(e.name).toLowerCase();
      const type = ext === ".exe" ? "Windows Setup" : ext === ".apk" ? "Android APK" : ext === ".zip" ? "Portable ZIP" : "File";
      const app = e.name.toLowerCase().includes("dream") ? "Dream Fashion" : "Classic World";
      return {
        name: e.name,
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
        updated: stats.mtime.toLocaleString(),
        ext,
        type,
        app,
      };
    });
}

function renderHtml(files) {
  const classicFiles = files.filter((f) => f.app === "Classic World");
  const dreamFiles = files.filter((f) => f.app === "Dream Fashion");

  const renderCard = (f) => `
    <div class="file-card">
      <div class="file-icon ${f.ext.slice(1)}">
        ${f.ext === ".apk" ? "📱" : f.ext === ".exe" ? "💻" : "📦"}
      </div>
      <div class="file-info">
        <div class="file-name">${f.name}</div>
        <div class="file-meta">
          <span class="badge ${f.ext.slice(1)}">${f.type}</span>
          <span class="size">${f.sizeFormatted}</span>
        </div>
      </div>
      <a href="/download/${encodeURIComponent(f.name)}" class="download-btn" download>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Download
      </a>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>POS Software Download Center • Port 6969</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090d16;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 24px 16px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .container {
      max-width: 860px;
      width: 100%;
    }
    header {
      text-align: center;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid #1e293b;
    }
    .server-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #4ade80;
      padding: 5px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 14px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      box-shadow: 0 0 8px #22c55e;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #ffffff 30%, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.sub {
      color: #94a3b8;
      font-size: 15px;
    }
    .endpoints {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin-top: 14px;
    }
    .endpoint-pill {
      background: #1e293b;
      border: 1px solid #334155;
      padding: 6px 14px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 13px;
      color: #38bdf8;
    }
    .section-title {
      font-size: 19px;
      font-weight: 700;
      margin: 24px 0 14px 0;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #e2e8f0;
    }
    .section-title span {
      background: #2563eb;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .file-card {
      background: #131b2e;
      border: 1px solid #1e293b;
      border-radius: 14px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all 0.2s ease;
    }
    .file-card:hover {
      border-color: #3b82f6;
      background: #17223b;
      transform: translateY(-1px);
    }
    .file-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }
    .file-icon.exe { background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); }
    .file-icon.apk { background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); }
    .file-icon.zip { background: rgba(234, 179, 8, 0.15); border: 1px solid rgba(234, 179, 8, 0.3); }
    .file-info {
      flex: 1;
      min-width: 0;
    }
    .file-name {
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 4px;
      word-break: break-all;
    }
    .file-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: #94a3b8;
    }
    .badge {
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge.exe { background: #1e3a8a; color: #93c5fd; }
    .badge.apk { background: #14532d; color: #86efac; }
    .badge.zip { background: #713f12; color: #fde047; }
    .size {
      font-family: monospace;
      color: #cbd5e1;
    }
    .download-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #2563eb;
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      transition: background 0.15s ease;
      flex-shrink: 0;
    }
    .download-btn:hover {
      background: #1d4ed8;
    }
    footer {
      margin-top: 36px;
      text-align: center;
      color: #64748b;
      font-size: 13px;
      line-height: 1.6;
    }
    footer a {
      color: #38bdf8;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="server-status">
        <div class="pulse-dot"></div>
        Server Online • Port 6969
      </div>
      <h1>POS Software Download Center</h1>
      <p class="sub">Download standalone executables and APKs directly over Wi-Fi</p>
      <div class="endpoints">
        <div class="endpoint-pill">HTTP: http://${localIp}:${HTTP_PORT}</div>
        <div class="endpoint-pill">Local: http://localhost:${HTTP_PORT}</div>
        <div class="endpoint-pill">FTP: ftp://${localIp}:${FTP_PORT}</div>
      </div>
    </header>

    <div class="section-title">
      Classic World POS
      <span>v2.5.2 • Retail</span>
    </div>
    <div class="grid">
      ${classicFiles.map(renderCard).join("")}
    </div>

    <div class="section-title" style="margin-top: 32px;">
      Dream Fashion POS
      <span>v2.5.2 • Fashion</span>
    </div>
    <div class="grid">
      ${dreamFiles.map(renderCard).join("")}
    </div>

    <footer>
      Direct Wi-Fi / LAN Download Portal • Resume &amp; High-Speed Chunking Supported<br>
      To connect via FTP client: Host: <code>${localIp}</code> | Port: <code>${FTP_PORT}</code> | User: <code>anonymous</code>
    </footer>
  </div>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);

  if (url === "/" || url === "/index.html") {
    const files = getFilesList();
    const html = renderHtml(files);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    res.end(html);
    return;
  }

  // Handle direct file download or /download/<filename>
  let targetFile = null;
  if (url.startsWith("/download/")) {
    targetFile = path.basename(url.replace("/download/", ""));
  } else {
    targetFile = path.basename(url);
  }

  const filePath = path.join(DOWNLOADS_DIR, targetFile);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }

  const stat = fs.statSync(filePath);
  const totalSize = stat.size;
  const ext = path.extname(targetFile).toLowerCase();
  const contentType =
    ext === ".exe"
      ? "application/vnd.microsoft.portable-executable"
      : ext === ".apk"
      ? "application/vnd.android.package-archive"
      : ext === ".zip"
      ? "application/zip"
      : "application/octet-stream";

  // Support HTTP Range headers (for resuming interrupted downloads)
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${totalSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${targetFile}"`,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": totalSize,
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Content-Disposition": `attachment; filename="${targetFile}"`,
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

server.listen(HTTP_PORT, "0.0.0.0", () => {
  console.log(`[HTTP Server] Running on http://localhost:${HTTP_PORT}`);
  console.log(`[HTTP Server] Network URL: http://${localIp}:${HTTP_PORT}`);
});

// ============================================================================
// 2. Pure Node.js RFC-959 FTP Server on Port 2121
// ============================================================================

const ftpServer = net.createServer((socket) => {
  let isUtf8 = false;
  let dataServer = null;
  let dataSocket = null;
  let authUser = null;

  const reply = (code, msg) => {
    try {
      socket.write(`${code} ${msg}\r\n`);
    } catch (_) {}
  };

  reply(220, "Classic World POS FTP Ready");

  let lineBuffer = "";
  socket.on("data", (chunk) => {
    lineBuffer += chunk.toString("utf8");
    let lines = lineBuffer.split(/\r?\n/);
    lineBuffer = lines.pop();

    for (const rawLine of lines) {
      if (!rawLine.trim()) continue;
      const parts = rawLine.trim().split(" ");
      const cmd = parts[0].toUpperCase();
      const arg = parts.slice(1).join(" ");

      switch (cmd) {
        case "USER":
          authUser = arg || "anonymous";
          reply(331, "User name okay, need password");
          break;
        case "PASS":
          reply(230, "User logged in, proceed");
          break;
        case "SYST":
          reply(215, "UNIX Type: L8");
          break;
        case "FEAT":
          reply(211, "Extensions supported:\r\n SIZE\r\n UTF8\r\n211 End");
          break;
        case "OPTS":
          if (arg.toUpperCase() === "UTF8 ON") {
            isUtf8 = true;
            reply(200, "UTF8 set to on");
          } else {
            reply(200, "OK");
          }
          break;
        case "PWD":
          reply(257, '"/" is current directory');
          break;
        case "TYPE":
          reply(200, "Type set to " + arg);
          break;
        case "PASV":
          if (dataServer) {
            dataServer.close();
            dataServer = null;
          }
          dataServer = net.createServer((ds) => {
            dataSocket = ds;
          });
          dataServer.listen(0, "0.0.0.0", () => {
            const port = dataServer.address().port;
            const ipParts = localIp.split(".").map(Number);
            const p1 = Math.floor(port / 256);
            const p2 = port % 256;
            reply(227, `Entering Passive Mode (${ipParts.join(",")},${p1},${p2})`);
          });
          break;
        case "EPSV":
          if (dataServer) {
            dataServer.close();
            dataServer = null;
          }
          dataServer = net.createServer((ds) => {
            dataSocket = ds;
          });
          dataServer.listen(0, "0.0.0.0", () => {
            const port = dataServer.address().port;
            reply(229, `Entering Extended Passive Mode (|||${port}|)`);
          });
          break;
        case "LIST":
        case "NLST":
          reply(150, "Opening data connection for file list");
          const sendList = () => {
            const files = fs.readdirSync(DOWNLOADS_DIR);
            let listing = "";
            for (const f of files) {
              const st = fs.statSync(path.join(DOWNLOADS_DIR, f));
              if (cmd === "NLST") {
                listing += `${f}\r\n`;
              } else {
                listing += `-rw-r--r-- 1 pos pos ${st.size} Nov 7 22:00 ${f}\r\n`;
              }
            }
            if (dataSocket) {
              dataSocket.end(listing, () => {
                reply(226, "Transfer complete");
                if (dataServer) { dataServer.close(); dataServer = null; }
              });
            } else {
              reply(425, "Can't open data connection");
            }
          };
          if (dataSocket) sendList();
          else if (dataServer) dataServer.once("connection", sendList);
          else reply(425, "Use PASV first");
          break;
        case "SIZE":
          const targetName = path.basename(arg);
          const fullPath = path.join(DOWNLOADS_DIR, targetName);
          if (fs.existsSync(fullPath)) {
            const st = fs.statSync(fullPath);
            reply(213, String(st.size));
          } else {
            reply(550, "File not found");
          }
          break;
        case "RETR":
          const dlName = path.basename(arg);
          const dlPath = path.join(DOWNLOADS_DIR, dlName);
          if (fs.existsSync(dlPath) && fs.statSync(dlPath).isFile()) {
            reply(150, `Opening binary mode data connection for ${dlName}`);
            const sendFile = () => {
              const stream = fs.createReadStream(dlPath);
              stream.pipe(dataSocket);
              stream.on("end", () => {
                reply(226, "Transfer complete");
                if (dataServer) { dataServer.close(); dataServer = null; }
              });
            };
            if (dataSocket) sendFile();
            else if (dataServer) dataServer.once("connection", sendFile);
            else reply(425, "Can't open data connection");
          } else {
            reply(550, "File not found");
          }
          break;
        case "QUIT":
          reply(221, "Goodbye");
          socket.end();
          break;
        default:
          reply(502, "Command not implemented");
          break;
      }
    }
  });

  socket.on("close", () => {
    if (dataServer) {
      dataServer.close();
      dataServer = null;
    }
  });
});

ftpServer.listen(FTP_PORT, "0.0.0.0", () => {
  console.log(`[FTP Server] Running on ftp://${localIp}:${FTP_PORT} (and ftp://localhost:${FTP_PORT})`);
});
