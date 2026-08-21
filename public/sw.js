const CACHE_NAME = "dreamfashion-v12";

const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/logo.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

// ── Install: Pre-cache core shell & images ───────────────────────────
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

// ── Activate: Clean up old caches ────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Cache-First for static assets, Stale-While-Revalidate for pages ──
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip API routes, WebSockets and HMR
  if (
    !url.protocol.startsWith("http") ||
    url.pathname.includes("/_next/webpack-hmr") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Cache fonts, images, and static chunks Cache-First for instant loads
  const isStaticAsset = (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".ttf") ||
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("banglawebfonts.pages.dev")
  );

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        try {
          const networkRes = await fetch(event.request);
          if (networkRes && networkRes.status === 200) {
            cache.put(event.request, networkRes.clone());
          }
          return networkRes;
        } catch (_) {
          return cached || new Response("", { status: 408 });
        }
      })
    );
    return;
  }

  // Stale-While-Revalidate for navigation and HTML pages
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkPromise = fetch(event.request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            cache.put(event.request, networkRes.clone());
          }
          return networkRes;
        })
        .catch(() => cached);

      return cached || networkPromise;
    })
  );
});
