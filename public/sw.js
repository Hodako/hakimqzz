const CACHE_NAME = "hakimqzz-pos-v17";

const PRECACHE_ASSETS = [
  "/manifest.json",
  "/logo.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

// ── Install: Pre-cache static media only (no HTML with chunk manifests) ───
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res && res.status === 200) {
              await cache.put(url, res);
            }
          } catch (_) {}
        })
      );
    })
  );
  self.skipWaiting();
});

// ── Activate: Clean up all obsolete caches immediately ────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Deleting obsolete cache:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch Handler ─────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip non-http, WebSockets, HMR and API RPC routes
  if (
    !url.protocol.startsWith("http") ||
    url.pathname.includes("/_next/webpack-hmr") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // 1. Navigation / HTML pages -> Always Network-First to get fresh chunk hashes
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkRes;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response("Offline", {
            status: 503,
            statusText: "Offline",
            headers: { "Content-Type": "text/plain" },
          });
        })
    );
    return;
  }

  // 2. Next.js Static JS Chunks -> Fetch directly with network fallback
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Let it throw naturally so ChunkLoadError triggers auto-recovery
        throw new Error("Chunk load failed from network");
      })
    );
    return;
  }

  // 3. Static Media (Fonts, Images) -> Cache-First
  const isMediaAsset =
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".ttf") ||
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("banglawebfonts.pages.dev");

  if (isMediaAsset) {
    event.respondWith(
      caches.match(event.request).then(async (cached) => {
        if (cached) return cached;
        try {
          const networkRes = await fetch(event.request);
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkRes;
        } catch (_) {
          return new Response("", { status: 404 });
        }
      })
    );
    return;
  }
});
