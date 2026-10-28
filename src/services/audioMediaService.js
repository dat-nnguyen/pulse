import { getBackendBaseUrl } from './backendService.js';
import { repairM4aTiming } from './mp4TimingService.js';
import { downloadHlsAudio, isHlsUrl } from './hlsAudioService.js';

const STORAGE_AUDIO = 'https://wtrlpbumpwtauvxqwrrg.supabase.co/storage/v1/object/public/audio-files/audio';
const MIME_TYPES = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac',
  flac: 'audio/flac', wav: 'audio/wav', ogg: 'audio/ogg', opus: 'audio/ogg', webm: 'audio/webm',
};

export function finiteDuration(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

export function isAppleMobileAudio() {
  return typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
}

export function getCloudFallbackUrl(track) {
  if (/^https?:\/\//.test(track?.cloudAudioUrl || '')) return track.cloudAudioUrl;
  const raw = track?.audioUrl || track?.localAudioUrl || '';
  if (/^https?:\/\//.test(raw) && !isDeviceUrl(raw)) return raw;
  if (raw.includes('/audio/')) return `${STORAGE_AUDIO}/${raw.split('/audio/').pop()}`;
  return null;
}

function isDeviceUrl(url) {
  try {
    const host = new URL(url).hostname;
    return /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  } catch { return false; }
}

export function resolveAudioUrl(url) {
  if (!url) return '';
  const backend = getBackendBaseUrl();
  if (url.startsWith('/audio/')) {
    if (backend) return `${backend}${url}`;
    if (typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)) {
      return `${window.location.origin}${url}`;
    }
    return getCloudFallbackUrl({ audioUrl: url });
  }
  if (backend && isDeviceUrl(url)) return url.replace(/^https?:\/\/[^/]+/, backend);
  return url;
}

export function getTrackAudioSources(track) {
  const explicitCloud = /^https?:\/\//.test(track?.cloudAudioUrl || '') ? track.cloudAudioUrl : '';
  const direct = resolveAudioUrl(track?.localAudioUrl || track?.audioUrl);
  const candidates = [explicitCloud, direct, resolveAudioUrl(track?.audioUrl), getCloudFallbackUrl(track)];
  return [...new Set(candidates.filter((url) => url && !url.startsWith('blob:') && !url.startsWith('data:') &&
    !(typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:'))))];
}

// Trust the container bytes before old metadata: previous releases tagged M4A blobs as MP3.
export function sniffAudioMime(bytes) {
  const text = new TextDecoder().decode(bytes);
  if (text.slice(4, 8) === 'ftyp') return 'audio/mp4';
  if (text.startsWith('ID3')) return 'audio/mpeg';
  if (text.startsWith('fLaC')) return 'audio/flac';
  if (text.startsWith('OggS')) return 'audio/ogg';
  if (text.startsWith('RIFF') && text.slice(8, 12) === 'WAVE') return 'audio/wav';
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return (bytes[1] & 0xf6) === 0xf0 ? 'audio/aac' : 'audio/mpeg';
  }
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'audio/webm';
  return '';
}

export async function prepareAudioBlob(blob, track = {}) {
  if (!(blob instanceof Blob) || !blob.size) throw new Error('Downloaded audio is empty');
  const bytes = new Uint8Array(await blob.slice(0, 512).arrayBuffer());
  const detected = sniffAudioMime(bytes);
  const text = new TextDecoder().decode(bytes).trimStart();
  if (!detected && (/^(?:<!doctype|<html|<\?xml|<Error|\{|\[)/i.test(text) || /(?:text\/|json|xml)/i.test(blob.type))) {
    throw new Error('The download returned a page or error message instead of audio');
  }
  const extension = (track.format || (track.audioUrl || '').split('?')[0].split('.').pop() || '').toLowerCase();
  const mime = detected || (/^(audio\/|video\/mp4|video\/webm)/.test(blob.type) ? blob.type : MIME_TYPES[extension]);
  if (!mime) throw new Error('The downloaded file is not a supported audio file');
  const typed = blob.type === mime ? blob : blob.slice(0, blob.size, mime);
  return mime === 'audio/mp4' ? (await repairM4aTiming(typed)).blob : typed;
}

export function readAudioDuration(blob, timeoutMs = 5000) {
  if (typeof Audio === 'undefined') return Promise.resolve(0);
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    const finish = (duration = 0) => {
      clearTimeout(timer);
      audio.onloadedmetadata = audio.ondurationchange = audio.onerror = null;
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(url);
      resolve(finiteDuration(duration));
    };
    const timer = setTimeout(finish, timeoutMs);
    audio.preload = 'metadata';
    audio.onloadedmetadata = audio.ondurationchange = () => {
      if (finiteDuration(audio.duration)) finish(audio.duration);
    };
    audio.onerror = () => finish();
    audio.src = url;
  });
}

export async function fetchAudioBlob(url, track = {}, onProgress = () => {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(600000) });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  // A fragment is not a complete offline download.
  if (response.status === 206) throw new Error('The server returned incomplete audio');
  if (isHlsUrl(url) || /mpegurl/i.test(response.headers.get('content-type') || '')) {
    return prepareAudioBlob(await downloadHlsAudio(await response.text(), response.url || url, onProgress), { ...track, format: 'M4A' });
  }
  const totalBytes = Number(response.headers.get('content-length')) || 0;
  const chunks = [];
  let receivedBytes = 0;
  let blob;
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedBytes += value.length;
      onProgress({ status: 'downloading', receivedBytes, totalBytes,
        percent: totalBytes ? Math.min(95, Math.round(receivedBytes / totalBytes * 100)) : 10 });
    }
    blob = new Blob(chunks, { type: response.headers.get('content-type') || '' });
  } else {
    blob = await response.blob();
  }
  return prepareAudioBlob(blob, track);
}

export async function downloadAudioForTrack(track, onProgress = () => {}) {
  const sources = [...new Set([resolveAudioUrl(track.audioUrlHighQuality), ...getTrackAudioSources(track)].filter(Boolean))];
  let lastError = new Error('No audio source available');
  for (const source of sources) {
    try { return await fetchAudioBlob(source, track, onProgress); }
    catch (error) { lastError = error; }
  }
  // Podcast hosts often allow native playback but block browser fetch with CORS.
  // Use the configured companion downloader, which fetches the same episode server-side.
  const backend = getBackendBaseUrl();
  const localBrowser = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  if (sources.length && (backend || localBrowser)) {
    const response = await fetch(`${backend}/api/download`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: sources[0], title: track.title, artist: track.artist, album: track.album, type: track.type }),
      signal: AbortSignal.timeout(600000),
    });
    const result = await response.json();
    if (response.ok && result.success && result.track?.audioUrl) {
      return fetchAudioBlob(resolveAudioUrl(result.track.audioUrl), result.track, onProgress);
    }
    throw new Error(result.error || 'Could not download this episode for offline playback');
  }
  throw lastError;
}
