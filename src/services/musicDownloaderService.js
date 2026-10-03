// Service for downloading and caching music from YouTube, SoundCloud, or direct audio URLs

import { saveTrack } from './storageService';

// Mock audio tracks removed - start with clean library
export const SAMPLE_TRACKS = [];


export async function downloadTrackToLocal(track, onProgress = () => {}) {
  try {
    onProgress({ status: 'downloading', percent: 10 });
    const url = track.audioUrlHighQuality || track.audioUrl;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed with status ${response.status}`);

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    
    const reader = response.body.getReader();
    let receivedBytes = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedBytes += value.length;
      if (totalBytes > 0) {
        const percent = Math.min(95, Math.round((receivedBytes / totalBytes) * 100));
        onProgress({ status: 'downloading', percent, receivedBytes, totalBytes });
      }
    }

    const mimeType = track.format === 'FLAC' ? 'audio/flac' : 'audio/mpeg';
    const audioBlob = new Blob(chunks, { type: mimeType });

    onProgress({ status: 'saving', percent: 98 });
    const saved = await saveTrack({
      ...track,
      audioBlob,
      isDownloaded: true,
      fileSizeBytes: audioBlob.size,
      downloadedAt: Date.now(),
    });

    onProgress({ status: 'complete', percent: 100 });
    return saved;
  } catch (err) {
    console.error('Download to local error:', err);
    throw err;
  }
}

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
      return 'http://10.11.217.214:3030';
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

    // Running in web browser connected via LAN IP (e.g. http://10.11.217.214:5173 on phone)
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

// Download from YouTube or direct URL via backend or direct audio stream
export async function downloadFromWebUrl(inputUrl, customMeta = {}) {
  const trimmedUrl = (inputUrl || '').trim();
  const baseUrl = getBackendBaseUrl();

  // 1. Direct audio stream provided in customMeta (e.g. from 1-Click Search on web)
  if (customMeta.audioUrl || customMeta.previewUrl) {
    const directAudio = customMeta.audioUrl || customMeta.previewUrl;
    const track = {
      id: `track_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: customMeta.title || 'Web Audio Track',
      artist: customMeta.artist || 'Web Artist',
      album: customMeta.album || 'Web Audio Downloads',
      audioUrl: directAudio,
      coverUrl: customMeta.coverUrl || '',
      duration: customMeta.duration || 180,
      bitrate: '256 kbps High-Fidelity',
      format: 'M4A',
      type: 'music',
      isDownloaded: true,
    };
    return downloadTrackToLocal(track);
  }

  // 2. Try companion backend server (local Mac or cloud Render/Railway)
  if (baseUrl || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))) {
    try {
      const res = await fetch(`${baseUrl}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl, ...customMeta }),
        signal: AbortSignal.timeout(90000), // Allow 90s for high-quality audio extraction
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.track) {
          let track = data.track;
          track.isDownloaded = true;
          const effectiveHost = baseUrl || (typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://127.0.0.1:3030' : '');
          if (effectiveHost && track.audioUrl && track.audioUrl.startsWith('/audio/')) {
            track.audioUrl = `${effectiveHost}${track.audioUrl}`;
          }
          return saveTrack(track);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.error) {
          throw new Error(errData.error);
        }
      }
    } catch (backendErr) {
      if (backendErr.message && !backendErr.message.includes('fetch') && !backendErr.message.includes('timeout')) {
        throw backendErr;
      }
    }
  }

  // 3. Direct Audio URL (.mp3, .m4a, .flac, .wav, .ogg, .aac)
  const isDirectAudio = /\.(mp3|m4a|wav|flac|ogg|aac)(\?.*)?$/i.test(trimmedUrl);
  if (isDirectAudio) {
    const rawFilename = trimmedUrl.split('/').pop().split('?')[0];
    const cleanName = decodeURIComponent(rawFilename.replace(/\.[^/.]+$/, '').replace(/[_]/g, ' ')).trim();
    let title = customMeta.title || cleanName;
    let artist = customMeta.artist || 'Web Audio';

    if (!customMeta.title && !customMeta.artist && cleanName.includes(' - ')) {
      const parts = cleanName.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }

    const track = {
      id: `web_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title,
      artist,
      album: customMeta.album || 'Downloaded Tracks',
      audioUrl: trimmedUrl,
      coverUrl: customMeta.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      duration: 180,
      bitrate: '320 kbps Original',
      format: trimmedUrl.split('.').pop().split('?')[0].toUpperCase(),
      type: 'music',
    };
    return downloadTrackToLocal(track);
  }

  // 4. Standalone Web Fallback for YouTube or title queries
  if (customMeta.title || customMeta.artist) {
    try {
      const searchRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(`${customMeta.artist || ''} ${customMeta.title || ''}`.trim())}&entity=song&limit=1`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const topSong = searchData.results?.[0];
        if (topSong && topSong.previewUrl) {
          const track = {
            id: `web_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            title: topSong.trackName || customMeta.title,
            artist: topSong.artistName || customMeta.artist,
            album: topSong.collectionName || 'Web Audio Downloads',
            audioUrl: topSong.previewUrl,
            coverUrl: topSong.artworkUrl100 ? topSong.artworkUrl100.replace('100x100bb', '600x600bb') : '',
            duration: Math.round((topSong.trackTimeMillis || 180000) / 1000),
            bitrate: '256 kbps High-Fidelity',
            format: 'M4A',
            type: 'music',
            isDownloaded: true,
          };
          return downloadTrackToLocal(track);
        }
      }
    } catch (e) {
      // Continue to final error
    }
  }

  // 5. Friendly guidance if offline without companion backend
  const isYouTube = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i.test(trimmedUrl);
  if (isYouTube) {
    throw new Error(
      'To extract full YouTube audio, please connect the Pulse Companion Server in Sync & Wi-Fi settings, or use the Search tab for instant 1-click web music downloads!'
    );
  }

  throw new Error('Please enter a valid music title, YouTube link, or direct audio URL (.mp3, .m4a, .flac).');
}

// Download up to 10 tracks from a list of URLs
export async function downloadMultipleFromWebUrls(urls = [], onProgress = () => {}) {
  const cleanUrls = urls
    .map((u) => u.trim())
    .filter((u) => u.length > 0)
    .slice(0, 10); // Enforce max 10

  if (cleanUrls.length === 0) {
    throw new Error('No valid URLs provided.');
  }

  const results = {
    total: cleanUrls.length,
    successful: [],
    failed: [],
  };

  for (let i = 0; i < cleanUrls.length; i++) {
    const url = cleanUrls[i];
    onProgress({
      index: i,
      total: cleanUrls.length,
      currentUrl: url,
      status: 'downloading',
      percent: Math.round((i / cleanUrls.length) * 100),
    });

    try {
      const track = await downloadFromWebUrl(url);
      results.successful.push({ url, track });
      onProgress({
        index: i,
        total: cleanUrls.length,
        currentUrl: url,
        track,
        status: 'success',
        percent: Math.round(((i + 1) / cleanUrls.length) * 100),
      });
    } catch (err) {
      console.warn(`Failed to download ${url}:`, err);
      results.failed.push({ url, error: err.message || 'Download failed' });
      onProgress({
        index: i,
        total: cleanUrls.length,
        currentUrl: url,
        error: err.message || 'Download failed',
        status: 'error',
        percent: Math.round(((i + 1) / cleanUrls.length) * 100),
      });
    }
  }

  return results;
}

