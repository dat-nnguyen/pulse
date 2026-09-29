export async function fetchLyrics(trackName, artistName = '') {
  try {
    const query = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
    });
    const response = await fetch(`https://lrclib.net/api/get?${query.toString()}`, {
      headers: {
        'User-Agent': 'AuraMusicPlayer/1.0.0 (https://github.com/dat-nnguyen/real-free-music-player)',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        syncedLyrics: data.syncedLyrics || null,
        plainLyrics: data.plainLyrics || null,
      };
    }
  } catch (err) {
    // Graceful error handling
  }

  return { syncedLyrics: null, plainLyrics: null };
}
