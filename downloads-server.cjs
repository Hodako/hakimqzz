const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8089;
const DOWNLOADS_DIR = path.resolve(__dirname, "downloads");

const MIME_TYPES = {
  ".exe": "application/vnd.microsoft.portable-executable",
  ".zip": "application/zip",
  ".apk": "application/vnd.android.package-archive",
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer((req, res) => {
  // Normalize request url
  const cleanUrl = decodeURIComponent(req.url.split("?")[0]);
  const reqPath = cleanUrl === "/" ? "" : cleanUrl.replace(/^\/+/, "");
  const targetFile = path.join(DOWNLOADS_DIR, reqPath);

  // Security check: ensure path is within DOWNLOADS_DIR
  if (!targetFile.startsWith(DOWNLOADS_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("Access Denied");
  }

  // Handle Root Directory Listing
  if (!reqPath || reqPath === "") {
    fs.readdir(DOWNLOADS_DIR, (err, files) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        return res.end("Error reading directory");
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      const itemsHtml = files
        .map((f) => {
          const stats = fs.statSync(path.join(DOWNLOADS_DIR, f));
          const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
          return `<li><a href="/${encodeURIComponent(f)}" style="font-size: 16px; font-weight: bold; text-decoration: none; color: #0284c7;">${f}</a> <span style="color: #64748b; font-family: monospace;">(${sizeMb} MB)</span></li>`;
        })
        .join("\n");

      res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Classic World POS - Software Downloads</title>
  <style>body { font-family: sans-serif; padding: 30px; background: #f8fafc; color: #0f172a; max-width: 800px; margin: auto; } h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; } ul { list-style: none; padding: 0; } li { padding: 12px 16px; background: white; margin: 8px 0; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; } li:hover { background: #f1f5f9; }</style>
</head>
<body>
  <h1>📦 Classic World POS - Software Downloads</h1>
  <ul>${itemsHtml}</ul>
</body>
</html>`);
    });
    return;
  }

  // Handle File Download
  fs.stat(targetFile, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("File Not Found");
    }

    const ext = path.extname(targetFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const fileName = path.basename(targetFile);

    // Support HTTP Range requests for reliable resumable downloads
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      });

      if (req.method === "HEAD") {
        return res.end();
      }

      const stream = fs.createReadStream(targetFile, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": stats.size,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      });

      if (req.method === "HEAD") {
        return res.end();
      }

      const stream = fs.createReadStream(targetFile);
      stream.pipe(res);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[File Server] Serving downloads on http://127.0.0.1:${PORT}`);
});
