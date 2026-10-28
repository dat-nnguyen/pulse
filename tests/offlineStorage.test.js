import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ tracks: new Map(), cloudTracks: [], configured: false }));
vi.mock('idb', () => ({
  openDB: async () => ({
    get: async (store, id) => store === 'tracks' ? state.tracks.get(id) : undefined,
    put: async (store, value) => { if (store === 'tracks') state.tracks.set(value.id, value); },
    getAll: async (store) => store === 'tracks' ? [...state.tracks.values()] : [],
    getAllFromIndex: async () => [...state.tracks.values()],
    delete: async (store, id) => { if (store === 'tracks') state.tracks.delete(id); },
  }),
}));
vi.mock('../src/services/supabaseService', () => ({
  isSupabaseConfigured: () => state.configured,
  saveTrackToSupabase: async () => null,
  uploadAudioToSupabaseStorage: async () => null,
  uploadCoverToSupabaseStorage: async () => null,
  fetchTracksFromSupabase: async () => state.cloudTracks,
  fetchPlaylistsFromSupabase: async () => [],
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
import { getAllTracks, saveTrack, cacheTrackForOffline, syncLibraryWithCloud, updateTrackDuration } from '../src/services/storageService.js';
import { setBackendBaseUrl } from '../src/services/backendService.js';

beforeEach(() => {
  state.tracks.clear();
  state.configured = false;
  state.cloudTracks = [];
  vi.stubGlobal('navigator', { onLine: true });
  setBackendBaseUrl('');
});
afterEach(() => vi.unstubAllGlobals());

describe('Offline storage', () => {
  it('returns the local library immediately without cloud reconciliation when requested', async () => {
    state.configured = true;
    state.tracks.set('local', { id: 'local', title: 'Cached song', isCloudSynced: true });
    state.cloudTracks = [{ id: 'cloud', title: 'Cloud song' }];
    const tracks = await getAllTracks({ syncCloud: false });
    expect(tracks.map((track) => track.id)).toEqual(['local']);
    expect(state.tracks.has('local')).toBe(true);
  });
  it('migrates already verified doubled iOS durations and fixes cached fragments without a new download', async () => {
    const original = new Blob([fragmentedM4aFixture().bytes], { type: 'audio/mp4' });
    state.tracks.set('legends', { id: 'legends', title: 'Legends Never Die', duration: 358, durationVerified: true, audioBlob: original });
    vi.stubGlobal('fetch', vi.fn());
    const [corrected] = await getAllTracks();
    expect(corrected.duration).toBeCloseTo(179.02585, 4);
    expect(corrected.audioBlob).not.toBe(original);
    expect(corrected.audioTimingVersion).toBe(3);
    expect(state.tracks.get('legends').duration).toBeCloseTo(179.02585, 4);
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
