const CACHE_NAME = 'chat-space-v1';
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  // Clear old caches if you change the CACHE_NAME version
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Firebase handles its own live data fetching/offline support.
  // We use a network-first strategy for the app shell to satisfy PWA criteria
  // while ensuring users always get the latest version.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache the latest successful network response
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // If offline, serve from cache
        return caches.match(event.request);
      })
  );
});
