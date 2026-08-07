// Minimal service worker for offline app-shell caching.
// Only caches the static files needed to load the app UI —
// it never touches user-selected videos/logos (those are blob: URLs
// created at runtime and are intentionally left alone). The brand
// logo itself is loaded from a remote CDN (not cached here), so it
// still needs network access the first time it's shown.

const CACHE_NAME = 'bmedical-reel-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept blob: URLs (user's selected video/logo) or cross-origin
  // requests (this includes the remote CDN logo — let the browser handle it).
  if (event.request.url.startsWith('blob:') || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
