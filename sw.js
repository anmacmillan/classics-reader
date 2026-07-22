const CACHE = "classics-reader-v10";
const CORE = [
  "./", "index.html", "styles.css", "app.js", "data.js", "dictionary.js",
  "generated/imported-books.js", "generated/imported-latin-dictionary.js",
  "generated/imported-greek-dictionary.js",
  "generated/imported-old-english-dictionary.js", "icon.png", "manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(response => {
      if (response.ok || response.type === "opaque") {
        caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
      }
      return response;
    });
  }));
});
