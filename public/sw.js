// Pulse Audio Player — Modern Service Worker
const CACHE_NAME = 'pulse-cache-v2';

// Only precache truly static shell assets
const PRECACHE_ASSETS = [
  '/',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  // Take control immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache error (non-fatal):', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // Delete all old or previous caches (including spotify-local-v1)
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Purging legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass service worker for local development, API requests, Vite dev server, or audio streaming
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/audio/') ||
    event.request.destination === 'audio' ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages): Network-First
  // Always fetch fresh HTML so user gets the latest bundle hashes. Fallback to cache only when offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // 2. Static bundled assets (/assets/*): Cache-First with Network fallback
  // These have content hashes in their filename so they are immutable.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 3. All other requests: Network-First with safe fallback (NEVER fallback to index.html for assets)
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
