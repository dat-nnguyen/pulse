// Service for downloading and caching music from YouTube, SoundCloud, or direct audio URLs

import { saveTrack } from './storageService';
import { getBackendBaseUrl } from './backendService.js';
import { downloadAudioForTrack } from './audioMediaService.js';
export { getBackendBaseUrl, setBackendBaseUrl } from './backendService.js';

// Mock audio tracks removed - start with clean library
export const SAMPLE_TRACKS = [];


export async function downloadTrackToLocal(track, onProgress = () => {}) {
  try {
    onProgress({ status: 'downloading', percent: 10 });
    const audioBlob = await downloadAudioForTrack(track, onProgress);

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

// Clean and normalize YouTube watch links by stripping radio/playlist parameters (&list=RD..., &start_radio=1)
export function sanitizeMusicUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  const ytMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/watch?v=${ytMatch[1]}`;
  }
  return trimmed;
}

// Download from YouTube or direct URL via backend or direct audio stream
export async function downloadFromWebUrl(inputUrl, customMeta = {}) {
  const trimmedUrl = sanitizeMusicUrl((inputUrl || '').trim());
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
      duration: customMeta.previewUrl && (!customMeta.audioUrl || customMeta.audioUrl === customMeta.previewUrl) ? 0 : (customMeta.duration || 0),
      bitrate: '256 kbps High-Fidelity',
      format: customMeta.format || '',
      type: customMeta.type || 'music',
      isPreview: Boolean(customMeta.previewUrl && (!customMeta.audioUrl || customMeta.audioUrl === customMeta.previewUrl)),
      isDownloaded: true,
    };
    return downloadTrackToLocal(track);
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
      duration: customMeta.duration || 0,
      bitrate: '320 kbps Original',
      format: trimmedUrl.split('.').pop().split('?')[0].toUpperCase(),
      type: customMeta.type || 'music',
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
        signal: AbortSignal.timeout(600000), // Allow up to 10 minutes for large/multi-hour tracks & playlists
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
      const msg = backendErr.message || '';
      if (
        msg.includes('timed out') ||
        msg.includes('timeout') ||
        backendErr.name === 'TimeoutError'
      ) {
        throw new Error('Download timed out. The audio track is very large (e.g. multi-hour mix) or network connection is slow. Please try again.');
      }
      if (!msg.includes('fetch')) {
        throw backendErr;
      }
    }
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
            duration: 0,
            isPreview: true,
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

