// service-worker.js
const CACHE_NAME = 'seb-cache-v4'; // bump version whenever you add pages
const ASSETS = [
  './',
  './index.html',
  './about.html',        // <-- ensure About is cached
  './style.css',
  './script.js',
  './manifest.json',
  './logo.png'
];

// Install: pre-cache known assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

// Fetch:
// - For page navigations (HTML), use NETWORK-FIRST so new pages show up.
// - For others (CSS/JS/images), use CACHE-FIRST with network fallback.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Treat navigations as HTML requests
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      });
    })
  );
});
