const CACHE_NAME = "dreamfashion-v8";

// Only static assets that definitely exist — no page routes
const PRECACHE_ASSETS = [
  "/manifest.json",
  "/logo.png",
  "/apple-touch-icon.png",
  "/icon-512.png",
];

// ── Install: pre-cache static assets individually ───────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(
        PRECACHE_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "reload" });
            if (response && response.status === 200) {
              await cache.put(url, response);
            }
          } catch (err) {
            console.warn("[SW] Pre-cache skipped:", url, err);
          }
        })
      );
      return results;
    })
  );
  self.skipWaiting();
});

// ── Activate: delete ALL old caches ─────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Guaranteed Response fallback to avoid "Failed to convert value to 'Response'" ──
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (
    !url.protocol.startsWith("http") ||
    url.pathname.includes("/_next/webpack-hmr") ||
    url.pathname.startsWith("/api/") ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  const isHashedAsset = url.pathname.startsWith("/_next/static/");

  if (isHashedAsset) {
    // Hashed static assets (JS/CSS)
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (response && response.status === 200 && response.type !== "opaque") {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone).catch(() => {});
              });
            }
            return response;
          })
          .catch(() => {
            // Return fallback 404 Response instead of undefined to satisfy event.respondWith
            return new Response("Asset not found", {
              status: 404,
              statusText: "Not Found",
              headers: { "Content-Type": "text/plain" },
            });
          });
      })
    );
  } else {
    // Page routes — Network-First
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone).catch(() => {});
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response("Offline", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain" },
          });
        })
    );
  }
});
