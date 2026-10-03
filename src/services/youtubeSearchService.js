// Frontend service for searching YouTube tracks

import { getBackendBaseUrl } from './musicDownloaderService';

const PUBLIC_INVIDIOUS_INSTANCES = [
  'https://inv.tux.pizza',
  'https://invidious.nerdvpn.de',
  'https://vid.puffyan.us',
];

/**
 * Searches YouTube tracks using companion backend, with public Invidious fallback.
 *
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array>} Array of YouTube search results
 */
export async function searchYouTube(query, limit = 15) {
  const trimmed = (query || '').trim();
  if (!trimmed) return [];

  const baseUrl = getBackendBaseUrl();

  // 1. Primary: Local Companion Audio Server
  try {
    const searchUrl = baseUrl
      ? `${baseUrl}/api/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`
      : (typeof window !== 'undefined' ? `/api/search?q=${encodeURIComponent(trimmed)}&limit=${limit}` : null);

    if (searchUrl) {
      const res = await fetch(searchUrl, {
        signal: AbortSignal.timeout(9000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.results) && data.results.length > 0) {
          return data.results;
        }
      }
    }
  } catch (err) {
    console.warn('Companion backend YouTube search error, attempting fallback:', err.message);
  }

  // 2. High-reliability Web Music Search (Apple Music API: open CORS, zero API keys, official metadata & preview streams)
  try {
    const itunesRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&entity=song&limit=${limit}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (itunesRes.ok) {
      const itunesData = await itunesRes.json();
      if (itunesData && Array.isArray(itunesData.results) && itunesData.results.length > 0) {
        return itunesData.results.map((song) => {
          const durationSec = Math.round((song.trackTimeMillis || 0) / 1000);
          const duration = durationSec > 0
            ? `${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, '0')}`
            : '3:30';
          const cover = song.artworkUrl100
            ? song.artworkUrl100.replace('100x100bb', '600x600bb')
            : (song.artworkUrl60 || '');

          return {
            id: `apple_${song.trackId}`,
            title: song.trackName,
            cleanTitle: song.trackName,
            cleanArtist: song.artistName,
            channel: song.artistName,
            duration,
            durationSec,
            views: song.primaryGenreName ? `${song.primaryGenreName} • ${song.collectionName || 'Single'}` : 'Web Audio',
            publishedTime: song.releaseDate ? new Date(song.releaseDate).getFullYear().toString() : '',
            thumbnail: cover,
            audioUrl: song.previewUrl || '',
            previewUrl: song.previewUrl || '',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.artistName} - ${song.trackName}`)}`,
          };
        });
      }
    }
  } catch (appleErr) {
    console.warn('Apple music search fallback notice:', appleErr.message);
  }

  // 3. Fallback: Public Invidious API
  for (const instance of PUBLIC_INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(
        `${instance}/api/v1/search?q=${encodeURIComponent(trimmed)}&type=video`,
        { signal: AbortSignal.timeout(3000) }
      );

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.slice(0, limit).map((v) => {
            const durationSec = v.lengthSeconds || 0;
            const duration =
              durationSec > 0
                ? `${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, '0')}`
                : '';

            const thumbnails = v.videoThumbnails || [];
            const thumbnail =
              thumbnails.length > 0
                ? thumbnails[thumbnails.length - 1].url
                : `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

            return {
              id: v.videoId,
              title: v.title,
              cleanTitle: v.title,
              cleanArtist: v.author || 'Various Artists',
              channel: v.author || 'YouTube',
              duration,
              views: v.viewCount ? `${Number(v.viewCount).toLocaleString()} views` : '',
              publishedTime: v.publishedText || '',
              thumbnail,
              url: `https://www.youtube.com/watch?v=${v.videoId}`,
            };
          });
        }
      }
    } catch (e) {
      // Continue to next fallback
    }
  }

  throw new Error('Unable to fetch music search results. Please check your network connection.');
}
