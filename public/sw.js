const CACHE_NAME = "dreamfashion-v7";

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

// ── Fetch: Network-First with safe fallback for static chunks ───────────────
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
    // Try network first for static chunks to ensure fresh builds post-deploy
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== "opaque") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone).catch(() => {});
            });
            return response;
          }
          // If server returns 400/404/503 (stale chunk hash), try cached version or fallback
          return caches.match(event.request).then((cached) => cached || response);
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // Network-First for pages
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
        .catch(() => caches.match(event.request))
    );
  }
});
