// Service for previewing and testing track sound before downloading
import { getBackendBaseUrl } from './musicDownloaderService';

const previewCache = new Map();

/**
 * Resolves a playable audio preview stream for a search result item.
 * Tries:
 * 1. Existing previewUrl or audioUrl on the item
 * 2. Companion backend audio streaming endpoint (/api/stream?id=...)
 * 3. High-fidelity 30s studio preview via Apple Music/iTunes API
 * 4. Fallback to direct YouTube stream / embed
 *
 * @param {Object} item - Search result item
 * @returns {Promise<{ url: string, type: 'audio' | 'youtube_embed', title: string, artist: string }>}
 */
export async function resolvePreviewSource(item) {
  if (!item) throw new Error('No track provided for preview');

  if (previewCache.has(item.id)) {
    return previewCache.get(item.id);
  }

  // 1. Direct audio stream already attached
  if (item.audioUrl || item.previewUrl) {
    const res = {
      url: item.audioUrl || item.previewUrl,
      type: 'audio',
      title: item.cleanTitle || item.title,
      artist: item.cleanArtist || item.channel,
      duration: item.durationSec || 30,
    };
    previewCache.set(item.id, res);
    return res;
  }

  const baseUrl = getBackendBaseUrl();

  // 2. Local Companion Server stream (fastest, lossless yt-dlp pipe)
  if (baseUrl || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))) {
    const streamEndpoint = baseUrl ? `${baseUrl}/api/stream?id=${encodeURIComponent(item.id)}` : `/api/stream?id=${encodeURIComponent(item.id)}`;
    
    // Quick test if stream endpoint responds
    try {
      const ping = await fetch(streamEndpoint, {
        method: 'HEAD',
        signal: AbortSignal.timeout(2500),
      });
      if (ping.ok || ping.status === 206 || ping.status === 200) {
        const res = {
          url: streamEndpoint,
          type: 'audio',
          title: item.cleanTitle || item.title,
          artist: item.cleanArtist || item.channel,
          duration: item.durationSec || 180,
        };
        previewCache.set(item.id, res);
        return res;
      }
    } catch (e) {
      // Companion server may not be active; fall through to web options
    }
  }

  // 3. Instant studio-grade audio preview via Apple Music / iTunes API
  const searchKeywords = `${item.cleanArtist || item.channel || ''} ${item.cleanTitle || item.title || ''}`.trim();
  if (searchKeywords) {
    try {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(searchKeywords)}&entity=song&limit=1`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (itunesRes.ok) {
        const data = await itunesRes.json();
        const top = data.results?.[0];
        if (top && top.previewUrl) {
          const res = {
            url: top.previewUrl,
            type: 'audio',
            title: top.trackName || item.cleanTitle || item.title,
            artist: top.artistName || item.cleanArtist || item.channel,
            duration: Math.round((top.trackTimeMillis || 30000) / 1000),
            artwork: top.artworkUrl100 ? top.artworkUrl100.replace('100x100bb', '600x600bb') : item.thumbnail,
          };
          previewCache.set(item.id, res);
          return res;
        }
      }
    } catch (itunesErr) {
      // Continue to next fallback
    }
  }

  // 4. Invidious direct audio stream
  const invidiousInstances = [
    'https://invidious.nerdvpn.de',
    'https://vid.puffyan.us',
    'https://inv.tux.pizza',
  ];
  for (const instance of invidiousInstances) {
    try {
      const audioUrl = `${instance}/latest_version?id=${item.id}&itag=140`;
      const test = await fetch(audioUrl, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
      if (test.ok || test.status === 206 || test.status === 200) {
        const res = {
          url: audioUrl,
          type: 'audio',
          title: item.cleanTitle || item.title,
          artist: item.cleanArtist || item.channel,
          duration: item.durationSec || 180,
        };
        previewCache.set(item.id, res);
        return res;
      }
    } catch (e) {
      // Try next
    }
  }

  // 5. Embedded YouTube preview player fallback (guaranteed to work for any YouTube ID)
  if (item.id && !item.id.startsWith('apple_')) {
    const res = {
      url: `https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&enablejsapi=1`,
      type: 'youtube_embed',
      title: item.cleanTitle || item.title,
      artist: item.cleanArtist || item.channel,
      duration: item.durationSec || 180,
    };
    previewCache.set(item.id, res);
    return res;
  }

  throw new Error('Unable to find an audio preview stream for this track.');
}
