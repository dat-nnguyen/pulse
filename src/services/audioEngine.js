// Audio Engine with Web Audio API Equalizer, Visualizer, and MediaSession lock-screen controls
import { getBackendBaseUrl } from './backendService.js';
import { finiteDuration, getTrackAudioSources, prepareAudioBlob, downloadAudioForTrack, isAppleMobileAudio } from './audioMediaService.js';
import { repairM4aTiming, AUDIO_TIMING_VERSION } from './mp4TimingService.js';
export { getCloudFallbackUrl } from './audioMediaService.js';

export class AudioEngine {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.playsInline = true;
    if (typeof this.audio.setAttribute === 'function') {
      this.audio.setAttribute('playsinline', 'true');
      this.audio.setAttribute('webkit-playsinline', 'true');
    }

    this.audioCtx = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.bassNode = null;
    this.eqNodes = [];
    this.isWebAudioInitialized = false;
    this.currentBlobUrl = null;

    this.currentTrack = null;
    this.isPlaying = false;
    this.volume = 0.8;
    this.audio.volume = this.volume;
    this.preloadAudio = null;
    this.preloadedTrackId = null;
    this.preloadedBlobUrl = null;
    this.sourceVersion = 0;
    this.sourceCandidates = [];
    this.sourceIndex = -1;
    this.wantsToPlay = false;
    this.startupTimer = null;
    this.knownDuration = 0;
    this.pendingPreparation = null;
    this.preloadPreparation = null;

    // Callbacks
    this.listeners = {
      timeUpdate: [],
      durationChange: [],
      playState: [],
      ended: [],
      trackChange: [],
      error: [],
      eqChange: [],
    };

    this.hasUnlockedAudio = false;
    this.setupAudioListeners();
    this.setupMediaSession();
    this.unlockAudioForIOS();
  }

  unlockAudioForIOS() {
    if (this.hasUnlockedAudio || typeof window === 'undefined') return;
    const unlock = () => {
      if (this.hasUnlockedAudio) return;
      this.hasUnlockedAudio = true;
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      // The real play call runs directly in the gesture. A silent sample's delayed
      // promise used to pause and clear a newly selected track on the first tap.
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('touchend', unlock, true);
      window.removeEventListener('click', unlock, true);
    };
    window.addEventListener('touchstart', unlock, { capture: true, passive: true });
    window.addEventListener('touchend', unlock, { capture: true, passive: true });
    window.addEventListener('click', unlock, { capture: true, passive: true });
  }

  setupAudioListeners() {
    const audio = this.audio;
    const listen = (event, callback) => audio.addEventListener(event, (...args) => {
      if (audio === this.audio && !(this.currentTrack && !this.sourceCandidates.length)) callback(...args);
    });
    const durationChanged = () => {
      const duration = audio.readyState >= 1 ? finiteDuration(audio.duration) : 0;
      if (!duration || duration === this.knownDuration) return;
      this.knownDuration = duration;
      this.notify('durationChange', duration);
      this.notify('durationResolved', { trackId: this.currentTrack?.id, duration });
      this.updateMediaSessionPosition(audio.currentTime || 0, duration);
    };
    listen('loadedmetadata', durationChanged);
    listen('durationchange', durationChanged);
    listen('timeupdate', () => {
      durationChanged();
      const currentTime = Math.max(0, audio.currentTime || 0);
      this.notify('timeUpdate', { currentTime, duration: this.knownDuration });
      this.updateMediaSessionPosition(currentTime, this.knownDuration);
    });
    listen('play', () => {
      this.isPlaying = true;
      if (this.audioCtx?.state === 'suspended') this.audioCtx.resume().catch(() => {});
      this.notify('playState', true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    });
    listen('playing', () => clearTimeout(this.startupTimer));
    listen('pause', () => {
      this.isPlaying = false;
      this.notify('playState', false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    });
    listen('ended', () => {
      this.isPlaying = false;
      this.wantsToPlay = false;
      this.notify('playState', false);
      this.notify('ended');
    });
    listen('error', () => {
      if (!audio.error || audio.error.code === 1 || !this.currentTrack) return;
      this.advanceSource(audio.error);
    });
  }

  configureSource(audio, source) {
    // Native playback avoids requiring CORS from podcast hosts. Only an active
    // Web Audio graph needs anonymous CORS for remote media.
    if (!source) {
      audio.removeAttribute('src');
      return;
    }
    if (this.isWebAudioInitialized && /^https?:/.test(source)) audio.crossOrigin = 'anonymous';
    else audio.removeAttribute('crossOrigin');
    audio.src = source;
  }

  armStartupTimeout() {
    clearTimeout(this.startupTimer);
    if (this.sourceIndex + 1 >= this.sourceCandidates.length) return;
    const version = this.sourceVersion;
    this.startupTimer = setTimeout(() => {
      if (version === this.sourceVersion && this.wantsToPlay && this.audio.readyState < 3) {
        this.advanceSource(new Error('Audio source did not become ready'));
      }
    }, 8000);
  }

  advanceSource(error) {
    clearTimeout(this.startupTimer);
    if (this.sourceIndex >= this.sourceCandidates.length) return false;
    const resumeAt = this.audio.currentTime || 0;
    // CORS failure through an enabled EQ must fall back to a native element:
    // removing crossOrigin alone leaves MediaElementAudioSource output silent.
    if (this.isWebAudioInitialized && /^https?:/.test(this.audio.src)) {
      this.useNativePlayback();
      this.sourceIndex -= 1;
    }
    this.sourceVersion += 1;
    const source = this.sourceCandidates[++this.sourceIndex];
    if (!source) {
      this.wantsToPlay = false;
      this.isPlaying = false;
      this.notify('playState', false);
      this.notify('error', error);
      return false;
    }
    this.configureSource(this.audio, source);
    if (resumeAt > 0) {
      const audio = this.audio;
      const version = this.sourceVersion;
      audio.addEventListener('loadedmetadata', () => {
        if (audio === this.audio && version === this.sourceVersion) this.seek(resumeAt);
      }, { once: true });
    }
    this.audio.load();
    if (this.wantsToPlay) this.play().catch((playError) => this.notify('error', playError));
    return true;
  }

  useNativePlayback() {
    const previous = this.audio;
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.playsInline = true;
    this.audio.volume = this.volume;
    this.setupAudioListeners();
    previous.pause();
    previous.removeAttribute('src');
    previous.load();
    this.sourceNode?.disconnect();
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = this.sourceNode = this.analyserNode = this.bassNode = null;
    this.eqNodes = [];
    this.isWebAudioInitialized = false;
  }

  initWebAudio(force = false) {
    if (this.isWebAudioInitialized || !force) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();
      try {
        this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);
      } catch (nodeErr) {
        console.warn('createMediaElementSource notice (audio may still play normally):', nodeErr);
        return;
      }

      // Create Equalizer bands: 60Hz, 250Hz, 1kHz, 4kHz, 16kHz
      const frequencies = [60, 250, 1000, 4000, 16000];
      this.eqNodes = frequencies.map((freq, index) => {
        const filter = this.audioCtx.createBiquadFilter();
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === frequencies.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.4;
        }
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      // Bass Boost Node
      this.bassNode = this.audioCtx.createBiquadFilter();
      this.bassNode.type = 'lowshelf';
      this.bassNode.frequency.value = 80;
      this.bassNode.gain.value = 0;

      // Spectrum Analyser
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Connect graph: Source -> Bass -> EQ 0..4 -> Analyser -> Destination
      let currentNode = this.sourceNode;
      currentNode.connect(this.bassNode);
      currentNode = this.bassNode;

      for (const eqNode of this.eqNodes) {
        currentNode.connect(eqNode);
        currentNode = eqNode;
      }

      currentNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);

      this.isWebAudioInitialized = true;
      // Existing native streams must be re-requested with CORS before entering
      // Web Audio; otherwise even CORS-capable hosts produce silent output.
      if (/^https?:/.test(this.audio.src) && !this.audio.crossOrigin) {
        const resumeAt = this.audio.currentTime || 0;
        this.sourceIndex -= 1;
        this.advanceSourceForEqualizer(resumeAt);
      }
    } catch (err) {
      console.warn('Web Audio initialization note (CORS or permissions):', err);
    }
  }

  advanceSourceForEqualizer(resumeAt) {
    this.sourceVersion += 1;
    const version = this.sourceVersion;
    const source = this.sourceCandidates[++this.sourceIndex];
    this.configureSource(this.audio, source);
    this.audio.addEventListener('loadedmetadata', () => {
      if (version === this.sourceVersion) this.seek(resumeAt);
    }, { once: true });
    this.audio.load();
    if (this.wantsToPlay) this.play().catch((error) => this.notify('error', error));
  }

  // Setup Apple & standard lock screen controls via MediaSession
  setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    const actionHandlers = [
      ['play', () => this.play().catch((error) => this.notify('error', error))],
      ['pause', () => this.pause()],
      ['previoustrack', () => this.notify('prevTrackRequest')],
      ['nexttrack', () => this.notify('nextTrackRequest')],
      ['seekto', (details) => {
        if (details.seekTime != null) {
          this.seek(details.seekTime);
        }
      }],
      ['stop', () => {
        this.pause();
        this.seek(0);
      }],
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        // unsupported action in this browser
      }
    }

    // Explicitly unregister WebKit's default 10-second lock-screen skip buttons.
    for (const action of ['seekbackward', 'seekforward']) {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch (error) {
        // unsupported action in this browser
      }
    }
  }

  updateMediaSessionMetadata(track) {
    if (!('mediaSession' in navigator) || !track || typeof window.MediaMetadata !== 'function') return;

    const artwork = [];
    if (track.coverUrl) {
      let resolvedCover = track.coverUrl;
      const backendBase = getBackendBaseUrl();
      if (resolvedCover.startsWith('/audio/')) {
        resolvedCover = backendBase ? `${backendBase}${resolvedCover}` : (typeof window !== 'undefined' ? `${window.location.origin}${resolvedCover}` : resolvedCover);
      } else if (backendBase && (resolvedCover.includes('127.0.0.1:3030') || resolvedCover.includes('localhost:3030') || resolvedCover.includes('192.168.'))) {
        resolvedCover = resolvedCover.replace(/http:\/\/[^/]+(:3030)?/, backendBase);
      }
      artwork.push(
        { src: resolvedCover, sizes: '96x96', type: 'image/png' },
        { src: resolvedCover, sizes: '128x128', type: 'image/png' },
        { src: resolvedCover, sizes: '192x192', type: 'image/png' },
        { src: resolvedCover, sizes: '256x256', type: 'image/png' },
        { src: resolvedCover, sizes: '384x384', type: 'image/png' },
        { src: resolvedCover, sizes: '512x512', type: 'image/png' }
      );
    }

    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: track.title || 'Untitled Track',
      artist: track.artist || 'Unknown Artist',
      album: track.album || 'Local Library',
      artwork: artwork,
    });
  }

  updateMediaSessionPosition(currentTime, duration) {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (duration && isFinite(duration) && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: this.audio.playbackRate || 1.0,
          position: Math.min(currentTime, duration),
        });
      } catch (e) {
        // Ignore edge position timing exceptions
      }
    }
  }

  clearPreload() {
    if (this.preloadAudio) {
      this.preloadAudio.pause();
      this.preloadAudio.removeAttribute('src');
      this.preloadAudio.load();
      this.preloadAudio = null;
    }
    if (this.preloadedBlobUrl) URL.revokeObjectURL(this.preloadedBlobUrl);
    this.preloadedBlobUrl = null;
    this.preloadedTrackId = null;
    this.preloadPreparation = null;
  }

  needsTimingPreparation(track) {
    return isAppleMobileAudio() && (track.audioBlob instanceof Blob
      ? track.audioTimingVersion !== AUDIO_TIMING_VERSION
      : /^(M4A|MP4)$/i.test(track.format || '') || /\.(m4a|mp4)(?:[?#]|$)/i.test(track.audioUrl || track.cloudAudioUrl || ''));
  }

  async preparePlaybackTrack(track) {
    const audioBlob = track.audioBlob instanceof Blob && track.audioBlob.size
      ? await prepareAudioBlob(track.audioBlob, track) : await downloadAudioForTrack(track);
    const timing = await repairM4aTiming(audioBlob);
    const prepared = { ...track, audioBlob, audioTimingVersion: AUDIO_TIMING_VERSION,
      ...(timing.duration ? { duration: timing.duration, durationVerified: true } : {}) };
    this.notify('trackPrepared', prepared);
    return prepared;
  }

  preloadTrack(track) {
    if (track && track.id === this.preloadedTrackId) return;
    this.clearPreload();
    if (!track || track.id === this.currentTrack?.id) return;
    this.preloadedTrackId = track.id;
    const preload = (prepared) => {
      if (this.preloadedTrackId !== prepared.id || this.currentTrack?.id === prepared.id) return;
      let src;
      if (prepared.audioBlob instanceof Blob && prepared.audioBlob.size > 0) {
        this.preloadedBlobUrl = URL.createObjectURL(prepared.audioBlob);
        src = this.preloadedBlobUrl;
      } else src = getTrackAudioSources(prepared)[0];
      if (!src) return;
      this.preloadAudio = new Audio();
      this.preloadAudio.preload = prepared.type === 'podcast' ? 'metadata' : 'auto';
      this.configureSource(this.preloadAudio, src);
      this.preloadAudio.load();
    };
    if (this.needsTimingPreparation(track)) {
      this.preloadPreparation = this.preparePlaybackTrack(track);
      this.preloadPreparation.then(preload).catch(() => {
        if (this.preloadedTrackId === track.id) this.clearPreload();
      });
    } else preload(track);
  }

  applyTrackSource(track, warmBlob = null) {
    if (track.audioBlob instanceof Blob && track.audioBlob.size > 0) {
      this.currentBlobUrl = warmBlob || URL.createObjectURL(track.audioBlob);
    }
    this.sourceCandidates = [this.currentBlobUrl, ...getTrackAudioSources(track)].filter(Boolean);
    this.sourceIndex = 0;
    this.audio.defaultPlaybackRate = 1;
    this.audio.playbackRate = 1;
    this.audio.preservesPitch = true;
    this.configureSource(this.audio, this.sourceCandidates[0] || '');
    this.audio.load();
  }

  loadTrack(track) {
    if (!track) return;
    clearTimeout(this.startupTimer);
    this.sourceVersion += 1;
    const version = this.sourceVersion;
    this.wantsToPlay = false;
    this.audio.pause();
    const oldBlobUrl = this.currentBlobUrl;
    this.currentBlobUrl = null;
    const isWarm = this.preloadedTrackId === track.id;
    const warmBlob = isWarm ? this.preloadedBlobUrl : null;
    const warmPreparation = isWarm ? this.preloadPreparation : null;
    if (warmBlob) this.preloadedBlobUrl = null;
    this.currentTrack = track;
    this.knownDuration = 0;
    this.isPlaying = false;
    this.pendingPreparation = null;
    if (this.needsTimingPreparation(track)) {
      // Repair before the first decode: this error emits no media error, so a
      // fallback triggered only by `error` never fixes the doubled iOS timeline.
      this.sourceCandidates = [];
      this.configureSource(this.audio, '');
      this.audio.load();
      this.pendingPreparation = (warmPreparation || this.preparePlaybackTrack(track)).then((prepared) => {
        if (version !== this.sourceVersion) return;
        this.currentTrack = prepared;
        this.applyTrackSource(prepared, warmBlob);
        this.pendingPreparation = null;
      }).catch((error) => {
        if (version !== this.sourceVersion) return;
        this.pendingPreparation = null;
        this.wantsToPlay = false;
        this.notify('playState', false);
        this.notify('error', error);
      });
    } else this.applyTrackSource(track, warmBlob);
    if (oldBlobUrl) URL.revokeObjectURL(oldBlobUrl);
    this.clearPreload();
    this.notify('trackChange', track);
    this.notify('timeUpdate', { currentTime: 0, duration: 0 });
    this.notify('durationChange', 0);
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try { navigator.mediaSession.setPositionState(); } catch { /* unsupported */ }
    }
    this.updateMediaSessionMetadata(track);
  }

  async play() {
    if (!this.currentTrack) return;
    this.wantsToPlay = true;
    const version = this.sourceVersion;
    if (this.pendingPreparation) {
      // Safari requires a play call in the original gesture. Prime the same
      // element while the M4A is repaired; never clear/pause it from a delayed
      // promise, which could otherwise interrupt the real track.
      if (isAppleMobileAudio()) {
        this.audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        this.audio.play().catch(() => {});
      }
      await this.pendingPreparation;
      if (version !== this.sourceVersion || !this.wantsToPlay) return;
    }
    if (!this.sourceCandidates[this.sourceIndex]) {
      this.wantsToPlay = false;
      return;
    }
    this.audio.defaultPlaybackRate = 1;
    this.audio.playbackRate = 1;
    if (this.audioCtx?.state === 'suspended') this.audioCtx.resume().catch(() => {});
    this.armStartupTimeout();
    try {
      // Invoke synchronously in the tap/click handler for WebKit's gesture policy.
      await this.audio.play();
    } catch (error) {
      if (version !== this.sourceVersion || !this.wantsToPlay) return;
      clearTimeout(this.startupTimer);
      if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
        this.wantsToPlay = false;
        this.isPlaying = false;
        this.notify('playState', false);
        throw error;
      }
      if (!this.advanceSource(error)) throw error;
    }
  }

  pause() {
    this.wantsToPlay = false;
    clearTimeout(this.startupTimer);
    this.audio.pause();
  }

  togglePlay() {
    if (this.wantsToPlay || this.isPlaying) this.pause();
    else if (this.currentTrack) {
      if (!this.pendingPreparation && (!this.audio.src || !this.sourceCandidates[this.sourceIndex])) this.loadTrack(this.currentTrack);
      this.play().catch((error) => this.notify('error', error));
    }
  }

  seek(seconds) {
    if (Number.isFinite(seconds)) {
      const duration = finiteDuration(this.audio.duration);
      const position = Math.max(0, duration ? Math.min(seconds, duration) : seconds);
      try { this.audio.currentTime = position; } catch { return; }
      this.notify('timeUpdate', { currentTime: position, duration: this.knownDuration });
      this.updateMediaSessionPosition(position, this.knownDuration);
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    this.audio.volume = this.volume;
  }

  setEqualizerBand(bandIndex, gainDb) {
    if (this.eqNodes[bandIndex]) {
      this.eqNodes[bandIndex].gain.setTargetAtTime(gainDb, this.audioCtx?.currentTime || 0, 0.05);
      this.notify('eqChange', { bandIndex, gainDb });
    }
  }

  setBassBoost(gainDb) {
    if (this.bassNode) {
      this.bassNode.gain.setTargetAtTime(gainDb, this.audioCtx?.currentTime || 0, 0.05);
    }
  }

  applyEQPreset(preset) {
    // preset: array of 5 dB gains, e.g. [4, 2, 0, 1, 3]
    if (!Array.isArray(preset)) return;
    preset.forEach((gain, index) => {
      this.setEqualizerBand(index, gain);
    });
  }

  getFrequencyData() {
    if (!this.analyserNode) return new Uint8Array(32);
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    };
  }

  notify(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data));
    }
  }
}

export const audioEngine = new AudioEngine();
