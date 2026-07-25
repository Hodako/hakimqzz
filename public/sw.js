const CACHE_NAME = "dreamfashion-v6";

// Only static assets that definitely exist — no page routes
// Page routes are handled by network-first at runtime
const PRECACHE_ASSETS = [
  "/manifest.json",
  "/logo.png",
  "/apple-touch-icon.png",
  "/icon-512.png",
];

// ── Install: pre-cache static assets individually (never crash the SW) ──────
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
            // Silently skip assets that fail (network offline, 404, etc.)
            console.warn("[SW] Pre-cache skipped:", url, err);
          }
        })
      );
      return results;
    })
  );
  self.skipWaiting();
});

// ── Activate: delete ALL old caches (removes stale main-app.js etc.) ────────
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

// ── Fetch: safe cache.put() — only store valid 200 responses ─────────────────
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip: non-http, Next.js HMR, API routes, chrome-extension, cross-origin fonts
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
    // Cache-First: hashed JS/CSS/font chunks never change filename
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type !== "opaque") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone).catch(() => {});
            });
          }
          return response;
        }).catch(() => caches.match(event.request, { ignoreSearch: true }));
      })
    );
  } else {
    // Network-First: pages & other assets — serve fresh, fall back to cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache valid, same-origin, non-opaque successful responses
          if (
            response &&
            response.status === 200 &&
            response.type === "basic"
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone).catch(() => {});
            });
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request, { ignoreSearch: true }).then(
            (cached) => cached || new Response("Offline", { status: 503 })
          )
        )
    );
  }
});
