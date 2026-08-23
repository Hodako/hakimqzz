import { createServer } from "http";
import { parse } from "url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const app = next({ dev, hostname });
const handle = app.getRequestHandler();

// Listen on primary port 80, secondary port 445, and dev/fallback port 8080
const requestedPorts = [
  parseInt(process.env.PORT || "80", 10),
  parseInt(process.env.ALT_PORT || "445", 10),
  8080,
];

// Remove duplicate ports
const targetPorts = Array.from(new Set(requestedPorts));

app.prepare().then(() => {
  const requestHandler = (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  };

  targetPorts.forEach((port) => {
    try {
      const server = createServer(requestHandler);
      server.listen(port, hostname, () => {
        console.log(`[HakimQzz POS] Ready & listening on http://${hostname}:${port}`);
      });
      server.on("error", (err) => {
        if (err.code === "EACCES") {
          console.warn(`[HakimQzz POS] Port ${port} requires root/admin privileges on this OS.`);
        } else if (err.code === "EADDRINUSE") {
          console.warn(`[HakimQzz POS] Port ${port} is currently in use by another service.`);
        } else {
          console.warn(`[HakimQzz POS] Error on port ${port}:`, err.message);
        }
      });
    } catch (err) {
      console.warn(`[HakimQzz POS] Could not start server on port ${port}:`, err.message);
    }
  });
});
