const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 7890;
const DOWNLOADS_DIR = path.join(__dirname, "..", "downloads");

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  
  if (urlPath === "/" || urlPath === "/index.html") {
    // Render modern HTML landing page - ONLY latest DreamFashion software ZIP
    const files = fs
      .readdirSync(DOWNLOADS_DIR)
      .filter((name) => name.toLowerCase().startsWith("dreamfashion") && name.toLowerCase().endsWith(".zip"))
      .map((name) => {
        const stat = fs.statSync(path.join(DOWNLOADS_DIR, name));
        return {
          name,
          size: formatBytes(stat.size),
          isZip: true,
          isExe: false,
        };
      });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DreamFashion POS — Software Download</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: linear-gradient(135deg, #090e17 0%, #0d1b2a 50%, #1b263b 100%);
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      padding: 40px;
      max-width: 620px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    p.subtitle {
      color: #94a3b8;
      font-size: 15px;
      margin-bottom: 32px;
      line-height: 1.5;
    }
    .file-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 28px;
    }
    .file-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(30, 41, 59, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 18px 20px;
      text-align: left;
      transition: all 0.2s ease;
    }
    .file-item:hover {
      border-color: rgba(16, 185, 129, 0.4);
      background: rgba(30, 41, 59, 0.9);
      transform: translateY(-2px);
    }
    .file-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .file-name {
      font-weight: 700;
      color: #f8fafc;
      font-size: 15px;
      word-break: break-all;
    }
    .file-meta {
      font-size: 13px;
      color: #64748b;
    }
    .btn-download {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
      transition: all 0.2s;
      white-space: nowrap;
      margin-left: 14px;
    }
    .btn-download:hover {
      background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
      transform: scale(1.02);
    }
    .notes {
      font-size: 13px;
      color: #64748b;
      line-height: 1.6;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 20px;
    }
    .notes b { color: #cbd5e1; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Windows x64 Release • v2.5.2</div>
    <h1>DreamFashion POS Software</h1>
    <p class="subtitle">Complete standalone Windows desktop application with SteadFast Courier & WhatsApp client compute.</p>
    
    <div class="file-list">
      ${files
        .map(
          (f) => `
        <div class="file-item">
          <div class="file-info">
            <div class="file-name">${f.name}</div>
            <div class="file-meta">${f.isZip ? "Full Package (Recommended)" : "Executable"} • Size: <b>${f.size}</b></div>
          </div>
          <a class="btn-download" href="/download/${encodeURIComponent(f.name)}" download>Download</a>
        </div>
      `
        )
        .join("")}
    </div>

    <div class="notes">
      <b>Installation:</b> Download the <code>.zip</code> package, extract all files to any folder, and run <code>DreamFashion-POS.exe</code>.
    </div>
  </div>
</body>
</html>`;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  // Handle direct file download
  let filename = "";
  if (urlPath.startsWith("/download/")) {
    filename = urlPath.slice("/download/".length);
  } else {
    filename = urlPath.replace(/^\//, "");
  }

  const filePath = path.join(DOWNLOADS_DIR, filename);

  // Security check: ensure path is within DOWNLOADS_DIR
  if (!filePath.startsWith(DOWNLOADS_DIR) || !fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("File Not Found");
    return;
  }

  const stat = fs.statSync(filePath);
  const headers = {
    "Content-Type": "application/octet-stream",
    "Content-Length": stat.size,
    "Content-Disposition": `attachment; filename="${filename}"`,
  };

  res.writeHead(200, headers);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[Download Server] Serving on http://127.0.0.1:${PORT}`);
});
