import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  tracks: new Map(), audio: new Map(), playlists: new Map(), likes: new Map(),
  cloudTracks: [], cloudError: null, configured: false,
}));
vi.mock('idb', () => ({
  openDB: async () => ({
    get: async (store, id) => state[store].get(id),
    put: async (store, value) => state[store].set(value.id, value),
    getAll: async (store) => [...state[store].values()],
    getAllFromIndex: async () => [...state.tracks.values()],
    delete: async (store, id) => state[store].delete(id),
  }),
}));
vi.mock('../src/services/supabaseService', () => ({
  isSupabaseConfigured: () => state.configured,
  saveTrackToSupabase: async () => null,
  uploadAudioToSupabaseStorage: async () => null,
  uploadCoverToSupabaseStorage: async () => null,
  fetchTracksFromSupabase: async () => state.cloudTracks,
  fetchPlaylistsFromSupabase: async () => {
    if (state.cloudError) throw state.cloudError;
    return [];
  },
  fetchLikesFromSupabase: async () => new Set(),
  savePlaylistToSupabase: async () => null,
  toggleLikeInSupabase: async () => null,
  deleteTrackFromSupabase: async () => null,
  deletePlaylistFromSupabase: async () => null,
}));
vi.mock('../src/services/audioMediaService.js', async (importOriginal) => ({
  ...await importOriginal(),
  readAudioDuration: async () => 31.25,
}));

import { fragmentedM4aFixture } from './fixtures/fragmentedM4a.js';
import { AUDIO_TIMING_VERSION, repairM4aTiming } from '../src/services/mp4TimingService.js';
import { getDB, getAllTracks, saveTrack, cacheTrackForOffline, syncLibraryWithCloud, updateTrackDuration } from '../src/services/storageService.js';
import { setBackendBaseUrl } from '../src/services/backendService.js';

beforeEach(() => {
  state.tracks.clear();
  state.audio.clear();
  state.playlists.clear();
  state.likes.clear();
  state.configured = false;
  state.cloudTracks = [];
  state.cloudError = null;
  vi.stubGlobal('navigator', { onLine: true });
  setBackendBaseUrl('');
});
afterEach(() => vi.unstubAllGlobals());

describe('Offline storage', () => {
  it('shares one database connection across concurrent storage operations', async () => {
    const [first, second] = await Promise.all([getDB(), getDB()]);
    expect(second).toBe(first);
    expect(await getDB()).toBe(first);
  });

  it('keeps iOS audio files stable when duration or cloud metadata is updated', async () => {
    vi.stubGlobal('navigator', { onLine: true, userAgent: 'iPhone', platform: 'iPhone' });
    state.tracks.set('ios', { id: 'ios', audioBlob: new Blob([fragmentedM4aFixture().bytes], { type: 'audio/mp4' }),
      duration: 358, durationVerified: true, audioTimingVersion: 3, addedAt: 1 });
    const [migrated] = await getAllTracks({ syncCloud: false });
    const cachedAudio = state.audio.get('ios').audioBlob;
    expect(migrated.audioBlob).toBe(cachedAudio);
    expect(state.tracks.get('ios').audioBlob).toBeUndefined();
    expect(state.tracks.get('ios').hasSeparateAudio).toBe(true);
    await updateTrackDuration('ios', 179);
    expect(state.audio.get('ios').audioBlob).toBe(cachedAudio);
    state.configured = true;
    state.cloudTracks = [{ id: 'ios', duration: 358, audioUrl: 'https://cdn.example/ios.m4a' }];
    const synced = await syncLibraryWithCloud();
    expect(synced.tracks[0].duration).toBe(179);
    expect(synced.tracks[0].audioBlob).toBe(cachedAudio);
    expect(state.audio.get('ios').audioBlob).toBe(cachedAudio);
    expect(state.tracks.get('ios').audioBlob).toBeUndefined();
  });

  it('returns the local library immediately without cloud reconciliation when requested', async () => {
    state.configured = true;
    state.tracks.set('local', { id: 'local', title: 'Cached song', isCloudSynced: true });
    state.cloudTracks = [{ id: 'cloud', title: 'Cloud song' }];
    const tracks = await getAllTracks({ syncCloud: false });
    expect(tracks.map((track) => track.id)).toEqual(['local']);
    expect(state.tracks.has('local')).toBe(true);
  });

  it('preserves tracks, cached audio, playlists and likes when a cloud read returns 402', async () => {
    state.configured = true;
    state.cloudError = Object.assign(new Error('exceed_storage_size_quota'), { status: 402 });
    const blob = new Blob(['ID3cached'], { type: 'audio/mpeg' });
    state.tracks.set('local', { id: 'local', isCloudSynced: true, hasSeparateAudio: true, durationVerified: true,
      audioTimingVersion: AUDIO_TIMING_VERSION });
    state.audio.set('local', { id: 'local', audioBlob: blob });
    state.playlists.set('playlist', { id: 'playlist', trackIds: ['local'], isCloudSynced: true });
    state.likes.set('local', { id: 'local' });

    const result = await syncLibraryWithCloud();

    expect(result).toMatchObject({ synced: false, reason: 'cloud-unavailable', status: 402,
      tracks: [{ id: 'local', audioBlob: blob }], playlists: [{ id: 'playlist', trackIds: ['local'] }],
      likedIds: new Set(['local']) });
    expect(state.audio.get('local').audioBlob).toBe(blob);
  });

  it('leaves local items pending when their cloud writes are rejected', async () => {
    state.configured = true;
    state.tracks.set('local', { id: 'local', title: 'Pending song' });
    state.playlists.set('playlist', { id: 'playlist', trackIds: ['local'] });

    await syncLibraryWithCloud();

    expect(state.tracks.get('local').isCloudSynced).toBeUndefined();
    expect(state.playlists.get('playlist').isCloudSynced).toBeUndefined();
  });
  it('migrates already verified doubled iOS durations and fixes cached fragments without a new download', async () => {
    const original = new Blob([fragmentedM4aFixture().bytes], { type: 'audio/mp4' });
    state.tracks.set('legends', { id: 'legends', title: 'Legends Never Die', duration: 358, durationVerified: true,
      audioTimingVersion: 3, audioBlob: original });
    vi.stubGlobal('fetch', vi.fn());
    const [corrected] = await getAllTracks();
    expect(corrected.duration).toBeCloseTo(179.02585, 4);
    expect(corrected.audioBlob).not.toBe(original);
    expect(corrected.audioTimingVersion).toBe(AUDIO_TIMING_VERSION);
    expect(state.tracks.get('legends').duration).toBeCloseTo(179.02585, 4);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('re-measures a repaired version-3 cache whose old doubled duration was marked verified', async () => {
    const timing = await repairM4aTiming(new Blob([fragmentedM4aFixture().bytes], { type: 'audio/mp4' }));
    // Reopening IndexedDB produces a new Blob identity without the in-memory repair result.
    const reopened = new Blob([await timing.blob.arrayBuffer()], { type: 'audio/mp4' });
    state.tracks.set('cached', { id: 'cached', audioBlob: reopened, duration: 62.5,
      durationVerified: true, audioTimingVersion: 3 });
    vi.stubGlobal('fetch', vi.fn());
    const [corrected] = await getAllTracks({ syncCloud: false });
    expect(corrected.duration).toBe(31.25);
    expect(corrected.durationVerified).toBe(true);
    expect(corrected.audioBlob).toBe(reopened);
    expect(corrected.audioTimingVersion).toBe(AUDIO_TIMING_VERSION);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stores actual preview duration instead of full-song search metadata', async () => {
    const saved = await saveTrack({ id: 'preview', duration: 240, audioBlob: new Blob(['ID3preview'], { type: 'audio/mpeg' }) });
    expect(saved.duration).toBe(31.25);
    expect(saved.durationVerified).toBe(true);
    expect(state.tracks.get('preview').isDownloaded).toBe(true);
  });

  it('does not report a successful offline save when the server returns HTML', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<!doctype html><html>Not found</html>', { headers: { 'Content-Type': 'text/html' } })));
    await expect(saveTrack({ id: 'broken', audioUrl: 'https://pod.example/episode.mp3', isDownloaded: true })).rejects.toThrow(/instead of audio/);
    expect(state.tracks.has('broken')).toBe(false);
  });

  it('uses an existing episode blob even when the current queue has only cloud metadata', async () => {
    const audioBlob = new Blob(['ID3podcast'], { type: 'audio/mpeg' });
    state.tracks.set('episode', { id: 'episode', audioBlob, duration: 3600 });
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const saved = await cacheTrackForOffline({ id: 'episode', audioUrl: 'https://pod.example/episode.mp3' });
    expect(saved.audioBlob).toBe(audioBlob);
    expect(saved.isDownloaded).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('replaces an old cached error page with real podcast audio when downloaded again', async () => {
    state.tracks.set('episode', { id: 'episode', audioBlob: new Blob(['<html>Not found</html>'], { type: 'text/html' }) });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Blob(['ID3podcast'], { type: 'audio/mpeg' }))));
    const saved = await cacheTrackForOffline({ id: 'episode', audioUrl: 'https://pod.example/episode.mp3' });
    expect(saved.audioBlob.type).toBe('audio/mpeg');
    expect(await state.tracks.get('episode').audioBlob.text()).toBe('ID3podcast');
  });

  it('preserves measured local durations and local fallback URLs through cloud sync', async () => {
    state.configured = true;
    state.tracks.set('one', { id: 'one', duration: 31.25, durationVerified: true,
      localAudioUrl: 'http://old-companion:3030/audio/one.m4a', audioBlob: new Blob(['audio']), format: 'M4A' });
    state.cloudTracks = [{ id: 'one', duration: 240, audioUrl: 'https://cloud.example/one.m4a', format: 'MP3' },
      { id: 'two', duration: 3600, audioUrl: 'https://cloud.example/two.mp3', isDownloaded: true }];
    await syncLibraryWithCloud();
    expect(state.tracks.get('one')).toMatchObject({ duration: 31.25, durationVerified: true,
      localAudioUrl: 'http://old-companion:3030/audio/one.m4a', format: 'M4A', isDownloaded: true });
    expect(state.tracks.get('two').isDownloaded).toBe(false);
  });

  it('persists duration corrections from playback without downloading or uploading the file again', async () => {
    state.tracks.set('one', { id: 'one', duration: 180 });
    vi.stubGlobal('fetch', vi.fn());
    await updateTrackDuration('one', 29.7);
    expect(state.tracks.get('one')).toMatchObject({ duration: 29.7, durationVerified: true });
    expect(fetch).not.toHaveBeenCalled();
  });
});
