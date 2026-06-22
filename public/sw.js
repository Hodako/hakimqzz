const CACHE_NAME = "dreamfashion-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/logo.png",
  "/apple-touch-icon.png",
  "/login_illustration.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Exclude Next.js hot-reloads, API calls, and chrome extensions
  if (
    url.pathname.includes("/_next/webpack-hmr") ||
    url.pathname.includes("/api/") ||
    !url.protocol.startsWith("http")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          // If offline and request fails, serve cache
          if (cachedResponse) return cachedResponse;
          throw err;
          return new Response("Offline", { status: 503, statusText: "Offline" });
        });

      // Serve cached immediately if available, otherwise fetch
      return cachedResponse || fetchPromise;
    })
  );
});
