// A minimal service worker required for PWA installation
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Allows the app to work offline by doing nothing (letting the browser handle it)
});
