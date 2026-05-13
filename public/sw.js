const CACHE_NAME = 'a380-cbt-v1';
const ASSETS = [
  './',
  'index.html',
  'https://unpkg.com/@ruffle-rs/ruffle',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
