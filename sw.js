/* Chat Space service worker: PWA cache + Firebase Cloud Messaging background push. */

// Firebase Cloud Messaging (FCM) for notifications when the Chat Space tab/app is closed.
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBrnDaU89-6XHxzcJ7m6eChN-Z7nZslZaA',
  authDomain: 'chatspace-d9d08.firebaseapp.com',
  projectId: 'chatspace-d9d08',
  storageBucket: 'chatspace-d9d08.firebasestorage.app',
  messagingSenderId: '715590145141',
  appId: '1:715590145141:web:f64500d465b9a9456ed43c',
  measurementId: 'G-9LL24NCGQ3'
});

const messaging = firebase.messaging();

// Keep the existing PWA cache behavior.
const CACHE_NAME = 'chat-space-v2';
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
    ])
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone).catch(() => {});
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// FCM background notification handler.
// This runs even when the Chat Space tab is completely closed, provided
// the browser has a valid FCM subscription and the Firebase function sends it.
messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const title = data.title || payload?.notification?.title || 'Chat Space';
  const body = data.body || payload?.notification?.body || 'New activity';
  const icon = data.icon || payload?.notification?.icon || './icon-192.png';
  const chatId = data.chatId || '';
  const url = data.url || self.location.origin + '/';

  return self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    tag: data.tag || (chatId ? `chat-${chatId}` : `chatspace-${Date.now()}`),
    renotify: true,
    data: {
      url,
      chatId,
      messageId: data.messageId || '',
      notificationType: data.notificationType || 'message'
    }
  });
});

// Notification tap handler.
// Keeps your old behavior: focus Chat Space if it is already open,
// otherwise open the target URL.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification?.data || {};
  const targetUrl = data.url || self.location.origin + '/';

  event.waitUntil((async () => {
    const windowClients = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const client of windowClients) {
      try {
        // Tell the existing Chat Space page which chat to open.
        if (data.chatId) {
          client.postMessage({
            action: 'focus',
            chatId: data.chatId,
            messageId: data.messageId || ''
          });
        }

        if ('focus' in client) {
          return client.focus();
        }
      } catch (_) {}
    }

    if (clients.openWindow) {
      return clients.openWindow(targetUrl);
    }
  })());
});
