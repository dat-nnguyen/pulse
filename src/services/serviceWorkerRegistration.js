export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(window.location.protocol)) return;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  if (import.meta.env.DEV || local) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        const worker = registration.active || registration.waiting || registration.installing;
        if (worker && new URL(worker.scriptURL).pathname === '/sw.js') registration.unregister();
      }
    }).catch(() => {});
    return;
  }
  const register = () => navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    .catch((error) => console.warn('Offline setup failed:', error));
  if (document.readyState === 'complete') void register();
  else window.addEventListener('load', register, { once: true });
}
