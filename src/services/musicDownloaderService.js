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

export function getBackendBaseUrl() {
  const custom = localStorage.getItem('pulse_backend_url');
  if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '');
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/+$/, '');
  return '';
}

// Download from YouTube or direct URL via backend or direct audio stream
export async function downloadFromWebUrl(inputUrl, customMeta = {}) {
  const trimmedUrl = inputUrl.trim();
  const baseUrl = getBackendBaseUrl();

  // 1. Try companion backend server (local Mac or cloud Render/Railway)
  try {
    const res = await fetch(`${baseUrl}/api/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: trimmedUrl, ...customMeta }),
      signal: AbortSignal.timeout(60000), // Allow 60s for high-quality audio extraction
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.track) {
        let track = data.track;
        if (baseUrl && track.audioUrl && track.audioUrl.startsWith('/audio/')) {
          track.audioUrl = `${baseUrl}${track.audioUrl}`;
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
    // If backend threw an explicit error from server
    if (backendErr.message && !backendErr.message.includes('fetch') && !backendErr.message.includes('timeout')) {
      throw backendErr;
    }
    // Otherwise backend server is not running or unreachable, proceed to fallback
  }

  // 2. Direct Audio URL (.mp3, .m4a, .flac, .wav, .ogg, .aac)
  const isDirectAudio = /\.(mp3|m4a|wav|flac|ogg|aac)(\?.*)?$/i.test(trimmedUrl);
  if (isDirectAudio) {
    const filename = trimmedUrl.split('/').pop().split('?')[0];
    const cleanTitle = decodeURIComponent(filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    const track = {
      id: `web_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: customMeta.title || cleanTitle,
      artist: customMeta.artist || 'Web Stream',
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

  // 3. YouTube link on standalone web / Vercel without local backend server
  const isYouTube = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i.test(trimmedUrl);
  if (isYouTube) {
    throw new Error(
      'YouTube audio extraction requires the Pulse local server running on your Mac (run "npm run server" in terminal). Alternatively, you can paste any direct .mp3 / .m4a link or import local files directly!'
    );
  }

  throw new Error('Please enter a valid YouTube link or direct audio URL (.mp3, .m4a, .flac).');
}
