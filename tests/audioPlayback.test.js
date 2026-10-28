import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { downloadAudioForTrack, fetchAudioBlob, getTrackAudioSources, prepareAudioBlob, readAudioDuration } from '../src/services/audioMediaService.js';
import { setBackendBaseUrl } from '../src/services/backendService.js';
import { fragmentedM4aFixture } from './fixtures/fragmentedM4a.js';
import { repairM4aTiming } from '../src/services/mp4TimingService.js';
import { parseDurationToSeconds } from '../src/services/podcastService.js';
const hlsInstances = vi.hoisted(() => []);
vi.mock('hls.js', () => ({ default: class {
  static isSupported() { return true; }
  static Events = { ERROR: 'error' };
  constructor() { this.destroy = vi.fn(); this.loadSource = vi.fn(); hlsInstances.push(this); }
  on() {}
  attachMedia(audio) { audio.src = 'blob:hls-media-source'; }
} }));

class TestAudio extends EventTarget {
  constructor() {
    super();
    this._src = '';
    this.readyState = 0;
    this.currentTime = 0;
    this.duration = NaN;
    this.crossOrigin = null;
    this.load = vi.fn();
    this.play = vi.fn(() => {
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    });
    this.pause = vi.fn(() => this.dispatchEvent(new Event('pause')));
    TestAudio.instances.push(this);
  }
  static instances = [];
  set src(value) {
    this._src = value;
    this.currentTime = 0;
    this.duration = NaN;
    this.readyState = 0;
  }
  get src() { return this._src; }
  setAttribute() {}
  removeAttribute(name) { if (name === 'crossOrigin') this.crossOrigin = null; else if (name === 'src') this.src = ''; }
  metadata(duration) {
    this.duration = duration;
    this.readyState = 1;
    this.onloadedmetadata?.();
    this.dispatchEvent(new Event('loadedmetadata'));
  }
  fail() {
    this.error = { code: 4, message: 'Unsupported source' };
    this.dispatchEvent(new Event('error'));
  }
}

let AudioEngine;
const mp4 = () => new Blob([new Uint8Array([0, 0, 0, 24]), 'ftypM4A ', new Uint8Array(128)], { type: 'audio/mpeg' });
const track = (id, extra = {}) => ({ id, audioUrl: `https://cdn.example/${id}.mp3`, ...extra });

beforeAll(async () => {
  vi.stubGlobal('Audio', TestAudio);
  ({ AudioEngine } = await import('../src/services/audioEngine.js'));
});
beforeEach(() => {
  vi.stubGlobal('Audio', TestAudio);
  setBackendBaseUrl('');
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Playback transitions', () => {
  it('uses native HLS on iPhone and a media-source player on browsers without native HLS', async () => {
    const native = new AudioEngine();
    native.audio.canPlayType = () => 'probably';
    native.loadTrack(track('podcast', { audioUrl: 'https://cdn.example/podcast.m3u8', format: 'HLS' }));
    await native.play();
    expect(native.audio.src).toBe('https://cdn.example/podcast.m3u8');
    const browser = new AudioEngine();
    browser.loadTrack(track('podcast', { audioUrl: 'https://cdn.example/podcast.m3u8', format: 'HLS' }));
    await browser.play();
    expect(hlsInstances.at(-1).loadSource).toHaveBeenCalledWith('https://cdn.example/podcast.m3u8');
    expect(browser.audio.src).toBe('blob:hls-media-source');
    const hls = hlsInstances.at(-1);
    browser.loadTrack(track('next'));
    expect(hls.destroy).toHaveBeenCalledOnce();
  });
  it('repairs a legacy iPhone M4A before decoding instead of waiting for a playback error', async () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone', platform: 'iPhone' });
    const createURL = vi.spyOn(URL, 'createObjectURL');
    const engine = new AudioEngine();
    engine.audio.playbackRate = 0.5;
    const original = new Blob([fragmentedM4aFixture().bytes], { type: 'audio/mpeg' });
    engine.loadTrack(track('legacy', { audioBlob: original, format: 'M4A', duration: 358 }));
    const playing = engine.play();
    expect(engine.audio.src).toMatch(/^data:audio\/wav/);
    await playing;
    expect(engine.audio.play).toHaveBeenCalledTimes(2);
    const decodedBlob = createURL.mock.calls.at(-1)[0];
    expect(decodedBlob.type).toBe('audio/mp4');
    expect((await repairM4aTiming(decodedBlob)).changed).toBe(false);
    expect(engine.currentTrack.duration).toBeCloseTo(179.02585, 4);
    expect(engine.audio.playbackRate).toBe(1);
  });

  it('repairs and caches a streamed iPhone M4A and reuses in-flight preloading', async () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone', platform: 'iPhone' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Blob([fragmentedM4aFixture().bytes], { type: 'audio/mp4' }))));
    const engine = new AudioEngine();
    const prepared = vi.fn();
    engine.on('trackPrepared', prepared);
    const next = track('remote', { format: 'M4A' });
    engine.preloadTrack(next);
    engine.loadTrack(next);
    await engine.play();
    expect(fetch).toHaveBeenCalledOnce();
    expect(prepared).toHaveBeenCalledOnce();
    expect(engine.currentTrack.audioBlob).toBeInstanceOf(Blob);
    expect(engine.currentTrack.duration).toBeCloseTo(179.02585, 4);
    expect(engine.audio.src).toMatch(/^blob:/);
  });

  it('resets duration and time immediately, then reports the new file duration', () => {
    const engine = new AudioEngine();
    const time = vi.fn();
    const duration = vi.fn();
    const resolved = vi.fn();
    engine.on('timeUpdate', time);
    engine.on('durationChange', duration);
    engine.on('durationResolved', resolved);
    engine.loadTrack(track('old'));
    engine.audio.metadata(3600);
    engine.audio.currentTime = 3500;
    engine.loadTrack(track('new', { duration: 180 }));
    expect(time).toHaveBeenLastCalledWith({ currentTime: 0, duration: 0 });
    expect(duration).toHaveBeenLastCalledWith(0);
    engine.audio.metadata(Infinity);
    expect(duration).toHaveBeenLastCalledWith(0);
    engine.audio.metadata(29.75);
    expect(duration).toHaveBeenLastCalledWith(29.75);
    expect(resolved).toHaveBeenLastCalledWith({ trackId: 'new', duration: 29.75 });
  });

  it('plays synchronously on the same mobile media element and ignores superseded play failures', async () => {
    const engine = new AudioEngine();
    const audio = engine.audio;
    let rejectOld;
    audio.play.mockImplementationOnce(() => new Promise((_, reject) => { rejectOld = reject; }));
    engine.loadTrack(track('old'));
    const oldPlay = engine.play();
    expect(audio.play).toHaveBeenCalledTimes(1);
    engine.loadTrack(track('new'));
    await engine.play();
    rejectOld(new DOMException('Interrupted', 'AbortError'));
    await oldPlay;
    expect(engine.audio).toBe(audio);
    expect(audio.src).toBe('https://cdn.example/new.mp3');
    expect(engine.wantsToPlay).toBe(true);
    expect(audio.crossOrigin).toBeNull();
  });

  it('reuses the preloaded offline URL and releases discarded preload resources', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const engine = new AudioEngine();
    const next = track('next', { audioBlob: new Blob(['ID3audio'], { type: 'audio/mpeg' }) });
    engine.preloadTrack(next);
    const url = engine.preloadedBlobUrl;
    engine.loadTrack(next);
    expect(engine.audio.src).toBe(url);
    expect(revoke).not.toHaveBeenCalledWith(url);
    engine.preloadTrack(track('unused', { audioBlob: mp4() }));
    const unused = engine.preloadedBlobUrl;
    engine.preloadTrack(null);
    expect(revoke).toHaveBeenCalledWith(unused);
    engine.loadTrack(track('later'));
    expect(revoke).toHaveBeenCalledWith(url);
  });

  it('tries each fallback once and stops instead of alternating forever', async () => {
    const engine = new AudioEngine();
    const errors = vi.fn();
    engine.on('error', errors);
    engine.loadTrack(track('remote', { cloudAudioUrl: 'https://cloud.example/file.mp3' }));
    await engine.play();
    engine.audio.fail();
    expect(engine.audio.src).toBe('https://cdn.example/remote.mp3');
    engine.audio.fail();
    engine.audio.fail();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(engine.wantsToPlay).toBe(false);
  });

  it('falls back when a source never becomes ready and cancels the watchdog on pause', async () => {
    vi.useFakeTimers();
    const engine = new AudioEngine();
    engine.loadTrack(track('remote', { cloudAudioUrl: 'https://cloud.example/file.mp3' }));
    await engine.play();
    await vi.advanceTimersByTimeAsync(8000);
    expect(engine.audio.src).toBe('https://cdn.example/remote.mp3');
    engine.loadTrack(track('paused', { cloudAudioUrl: 'https://cloud.example/file.mp3' }));
    await engine.play();
    engine.pause();
    await vi.advanceTimersByTimeAsync(16000);
    expect(engine.audio.src).toBe('https://cloud.example/file.mp3');
  });

  it('does not reload a valid source when autoplay permission is denied', async () => {
    const engine = new AudioEngine();
    engine.loadTrack(track('one'));
    engine.audio.play.mockRejectedValue(new DOMException('Gesture required', 'NotAllowedError'));
    const loads = engine.audio.load.mock.calls.length;
    await expect(engine.play()).rejects.toMatchObject({ name: 'NotAllowedError' });
    expect(engine.audio.load).toHaveBeenCalledTimes(loads);
    expect(engine.wantsToPlay).toBe(false);
  });

  it('clamps seek positions for long podcasts', () => {
    const engine = new AudioEngine();
    engine.loadTrack(track('podcast'));
    engine.audio.metadata(7200);
    engine.seek(-10);
    expect(engine.audio.currentTime).toBe(0);
    engine.seek(9000);
    expect(engine.audio.currentTime).toBe(7200);
  });
});

describe('Offline audio integrity', () => {
  it('parses podcast durations in seconds, minutes, or hours without producing NaN', () => {
    expect(parseDurationToSeconds(' 3723 ')).toBe(3723);
    expect(parseDurationToSeconds('62:03')).toBe(3723);
    expect(parseDurationToSeconds('1:02:03')).toBe(3723);
    expect(parseDurationToSeconds('N/A')).toBe(0);
  });
  it('repairs legacy M4A blobs labeled as MP3 without altering the bytes', async () => {
    const original = mp4();
    const repaired = await prepareAudioBlob(original, { format: 'MP3' });
    expect(repaired.type).toBe('audio/mp4');
    expect(await repaired.arrayBuffer()).toEqual(await original.arrayBuffer());
  });

  it('rejects HTML/JSON error pages and empty files instead of caching them as audio', async () => {
    await expect(prepareAudioBlob(new Blob(['<!doctype html><html>404</html>'], { type: 'audio/mpeg' }))).rejects.toThrow(/instead of audio/);
    await expect(prepareAudioBlob(new Blob(['{"error":"not found"}'], { type: 'application/json' }))).rejects.toThrow(/instead of audio/);
    await expect(prepareAudioBlob(new Blob([]))).rejects.toThrow(/empty/);
  });

  it('preserves a podcast response MIME, and rejects partial downloads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Blob(['ID3podcast'], { type: 'audio/mpeg' }))));
    expect((await fetchAudioBlob('https://pod.example/episode')).type).toBe('audio/mpeg');
    fetch.mockResolvedValue(new Response('ID3fragment', { status: 206 }));
    await expect(fetchAudioBlob('https://pod.example/episode')).rejects.toThrow(/incomplete/);
  });

  it('uses the companion downloader if a podcast host blocks browser downloads', async () => {
    setBackendBaseUrl('http://companion:3030');
    vi.stubGlobal('fetch', vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, track: { audioUrl: '/audio/episode.mp3', format: 'MP3' } })))
      .mockResolvedValueOnce(new Response(new Blob(['ID3podcast'], { type: 'audio/mpeg' }))));
    const blob = await downloadAudioForTrack(track('episode', { type: 'podcast' }));
    expect(blob.type).toBe('audio/mpeg');
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ url: 'https://cdn.example/episode.mp3', type: 'podcast' });
    expect(fetch.mock.calls[2][0]).toBe('http://companion:3030/audio/episode.mp3');
    setBackendBaseUrl('');
  });

  it('reads actual media duration and releases the temporary URL', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const result = readAudioDuration(mp4());
    const probe = TestAudio.instances.at(-1);
    const url = probe.src;
    probe.metadata(32.5);
    expect(await result).toBe(32.5);
    expect(revoke).toHaveBeenCalledWith(url);
    expect(probe.src).toBe('');
  });

  it('keeps a reachable local source before an unverified inferred cloud URL', () => {
    setBackendBaseUrl('http://companion:3030');
    const sources = getTrackAudioSources({ audioUrl: '/audio/song.m4a' });
    expect(sources[0]).toBe('http://companion:3030/audio/song.m4a');
    expect(sources[1]).toMatch(/supabase/);
    setBackendBaseUrl('');
  });
});
