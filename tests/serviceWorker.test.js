import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function worker({ cached = new Map(), fetch = vi.fn().mockRejectedValue(new Error('offline')), keys = [] } = {}) {
  const listeners = {};
  const cache = { addAll: vi.fn().mockResolvedValue(), put: vi.fn().mockResolvedValue() };
  const caches = { match: vi.fn(async (key) => cached.get(key.url || key)),
    open: vi.fn(async () => cache), keys: vi.fn(async () => keys), delete: vi.fn(async () => true) };
  const self = { location: { origin: 'https://pulse.example' }, addEventListener: (event, handler) => { listeners[event] = handler; },
    skipWaiting: vi.fn(async () => {}), clients: { claim: vi.fn(async () => {}) } };
  vm.runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), { self, caches, fetch, URL, Set, Promise, Error });
  const request = (path, extra = {}) => ({ url: `https://pulse.example${path}`, method: 'GET', mode: 'cors',
    destination: 'script', headers: { has: () => false }, ...extra });
  const event = (request) => ({ request, respondWith: vi.fn(), waitUntil: vi.fn() });
  return { listeners, caches, cache, self, fetch, request, event };
}

describe('Web offline playback shell', () => {
  it('falls back to the app shell for an uncached route while offline', async () => {
    const response = { body: 'offline shell' };
    const w = worker({ cached: new Map([['/index.html', response]]) });
    const event = w.event(w.request('/playlist/workout', { mode: 'navigate' }));
    w.listeners.fetch(event);
    expect(await event.respondWith.mock.calls[0][0]).toBe(response);
  });

  it('bypasses audio, API, ranges and cloud requests instead of returning HTML', () => {
    const w = worker();
    for (const request of [w.request('/audio/song.m4a'), w.request('/api/search'), w.request('/file', { destination: 'audio' }),
      w.request('/file', { headers: { has: () => true } }), w.request('/file', { url: 'https://cdn.example/song.m4a' })]) {
      const event = w.event(request);
      w.listeners.fetch(event);
      expect(event.respondWith).not.toHaveBeenCalled();
    }
  });

  it('preloads every generated route chunk before activating an offline release', async () => {
    const w = worker({ fetch: vi.fn(async () => ({ ok: true, json: async () => ['/assets/app-123.js', '/assets/Downloader-456.js'] })) });
    const event = w.event();
    w.listeners.install(event);
    await event.waitUntil.mock.calls[0][0];
    expect(w.cache.addAll).toHaveBeenCalledWith(['/', '/index.html', '/favicon.svg', '/manifest.json', '/assets/app-123.js', '/assets/Downloader-456.js']);
    expect(w.self.skipWaiting).toHaveBeenCalledOnce();
  });

  it('keeps previous bundles for open music players and leaves unrelated caches alone', async () => {
    const w = worker({ keys: ['unrelated-cache', 'pulse-cache-old', 'pulse-cache-previous1', 'pulse-cache-previous2', 'pulse-cache-__PULSE_BUILD_ID__'] });
    const event = w.event();
    w.listeners.activate(event);
    await event.waitUntil.mock.calls[0][0];
    expect(w.caches.delete).toHaveBeenCalledExactlyOnceWith('pulse-cache-old');
    expect(w.self.clients.claim).toHaveBeenCalledOnce();
  });
});
