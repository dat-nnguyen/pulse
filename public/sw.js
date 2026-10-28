// Each release gets its own cache; keep previous bundles for tabs still playing.
const CACHE_NAME = 'pulse-cache-__PULSE_BUILD_ID__';
const SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch('/asset-manifest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Offline asset manifest is unavailable');
    const assets = await response.json();
    if (!Array.isArray(assets) || assets.some((path) => typeof path !== 'string' || !/^\/assets\/[\w.-]+\.(js|css)$/.test(path))) {
      throw new Error('Invalid offline asset manifest');
    }
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...SHELL, ...assets]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = (await caches.keys()).filter((key) => key.startsWith('pulse-cache-'));
    const keep = new Set([CACHE_NAME, ...keys.filter((key) => key !== CACHE_NAME).slice(-2)]);
    await Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') || url.pathname.startsWith('/audio/') ||
    request.destination === 'audio' || request.destination === 'video' || request.headers.has('range')) return;

  const save = (response) => {
    if (response?.status === 200) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
    }
    return response;
  };
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(save).catch(async () =>
      (await caches.match(request)) || (await caches.match('/')) || (await caches.match('/index.html'))));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then(save)));
    return;
  }
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
