let memoryBackendUrl = null;

export function getBackendBaseUrl() {
  if (memoryBackendUrl && memoryBackendUrl.trim()) {
    return memoryBackendUrl.trim().replace(/\/+$/, '');
  }

  try {
    const custom = typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function'
      ? localStorage.getItem('pulse_backend_url')
      : null;
    if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '');
  } catch (e) {
    // localStorage not accessible (e.g. Node or restricted iframe)
  }

  const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_BACKEND_URL : null;
  if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/+$/, '');

  if (typeof window !== 'undefined') {
    const isCapacitor = window.location.protocol === 'capacitor:' || !!window.Capacitor;

    // Running inside iOS/Android native app via Capacitor
    if (isCapacitor) {
      return 'http://192.168.1.102:3030';
    }

    // Running inside Electron desktop packaged app (file://)
    if (window.location.protocol === 'file:' || !window.location.host) {
      return 'http://127.0.0.1:3030';
    }

    // Running in standard web browser on localhost or 127.0.0.1
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Relative URL "" routes through Vite dev proxy or same-origin server with zero CORS restrictions
      return '';
    }

    // Running in web browser connected via LAN IP (e.g. http://192.168.1.102:5173 on phone)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname)) {
      return `http://${window.location.hostname}:3030`;
    }
  }
  return '';
}

export function setBackendBaseUrl(url) {
  memoryBackendUrl = url && url.trim() ? url.trim().replace(/\/+$/, '') : null;
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      if (url && url.trim()) {
        localStorage.setItem('pulse_backend_url', url.trim().replace(/\/+$/, ''));
      } else {
        localStorage.removeItem('pulse_backend_url');
      }
    }
  } catch (e) {
    // Ignore localStorage access restrictions
  }
}
