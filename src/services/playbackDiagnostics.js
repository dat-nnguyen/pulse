import { getBackendBaseUrl } from './backendService.js';
import { getTrackAudioSources, sniffAudioMime } from './audioMediaService.js';

// Opt-in device diagnostics: record status/format only, never media, tokens or URLs.
export async function auditPlaylistSources(tracks, playlists) {
  const probe = async (url) => {
    try {
      const response = await fetch(url, { headers: { Range: 'bytes=0-511' }, signal: AbortSignal.timeout(5000) });
      const reader = response.body?.getReader();
      const chunk = reader ? (await reader.read()).value : null;
      await reader?.cancel();
      return { status: response.status, mime: chunk ? sniffAudioMime(chunk.subarray(0, 512)) : response.headers.get('content-type') };
    } catch (error) { return { error: error.name }; }
  };
  const backend = getBackendBaseUrl();
  console.info('Pulse source audit', JSON.stringify({ companion: backend ? await probe(`${backend}/api/status`) : null }));
  for (let index = 0; index < playlists.length; index += 1) {
    const ids = new Set(playlists[index].trackIds || []);
    const items = tracks.filter((track) => ids.has(track.id));
    const track = items[0];
    const result = { playlistIndex: index, tracks: items.length, cached: items.filter((item) => item.audioBlob?.size).length };
    if (track) {
      result.format = track.format;
      if (track.audioBlob?.size) {
        try { result.cachedMime = sniffAudioMime(new Uint8Array(await track.audioBlob.slice(0, 512).arrayBuffer())); }
        catch (error) { result.cacheError = error.name; }
      }
      result.sources = await Promise.all(getTrackAudioSources(track).slice(0, 2).map(probe));
    }
    console.info('Pulse source audit', JSON.stringify(result));
  }
}
