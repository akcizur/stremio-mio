const CACHE_NAME = "mio-shell-v2";
const APP_ROOT = new URL("./", self.location.href);
const APP_ROOT_PATH = APP_ROOT.pathname;
const appUrl = (path = "") => new URL(path, APP_ROOT).toString();
const APP_ASSETS_PATH = new URL("assets/", APP_ROOT).pathname;
const APP_SHELL = [
  appUrl(""),
  appUrl("mio.svg"),
  appUrl("manifest.webmanifest"),
  appUrl("offline.html")
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("mio-shell-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== APP_ROOT.origin || !url.pathname.startsWith(APP_ROOT_PATH)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(appUrl(""), response.clone());
        }
        return response;
      } catch {
        return (await caches.match(appUrl(""))) || (await caches.match(appUrl("offline.html")));
      }
    })());
    return;
  }

  const isAppAsset =
    url.pathname.startsWith(APP_ASSETS_PATH) ||
    url.pathname === new URL("mio.svg", APP_ROOT).pathname ||
    url.pathname === new URL("manifest.webmanifest", APP_ROOT).pathname;

  if (!isAppAsset) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
