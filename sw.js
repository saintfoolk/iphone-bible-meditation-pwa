const CACHE_NAME = "bible-meditation-app-v8";
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/u, "");
const scopedPath = (path) => `${SCOPE_PATH}${path}`;
const APP_SHELL = [
  scopedPath("/"),
  scopedPath("/library"),
  scopedPath("/lectionary"),
  scopedPath("/search"),
  scopedPath("/meditation/today"),
  scopedPath("/journal"),
  scopedPath("/manifest.webmanifest"),
  scopedPath("/icon.svg"),
  scopedPath("/apple-touch-icon.png"),
  scopedPath("/icons/icon-192.png"),
  scopedPath("/icons/icon-512.png"),
  scopedPath("/icons/maskable-icon-512.png"),
  scopedPath("/icons/apple-touch-icon.png"),
  scopedPath("/sounds/bell.mp3")
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    return (await cache.match(request)) || cache.match(scopedPath("/"));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) {
        void cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => null);

  return cached || fresh || cache.match(scopedPath("/"));
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith(scopedPath("/api/"))) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
