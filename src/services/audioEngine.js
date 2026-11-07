// Audio Engine with Web Audio API Equalizer, Visualizer, and MediaSession lock-screen controls
import { getBackendBaseUrl } from './backendService.js';
import { finiteDuration, getTrackAudioSources, prepareAudioBlob, downloadAudioForTrack, isAppleMobileAudio } from './audioMediaService.js';
import { repairM4aTiming, AUDIO_TIMING_VERSION } from './mp4TimingService.js';
import { isHlsUrl } from './hlsAudioService.js';
export { getCloudFallbackUrl } from './audioMediaService.js';

const traceTiming = (detail) => {
  if (import.meta.env.VITE_AUDIO_DIAGNOSTICS === '1') console.info('Pulse audio timing', JSON.stringify(detail));
};

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
    this.hls = null;
    this.frequencyData = new Uint8Array(32);
    this.contextRecovery = null;
    this.isAudioInterrupted = false;

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
    this.setupPlatformAudio();
    this.unlockAudioForIOS();
  }

  setupPlatformAudio() {
    // Safari's audio session API lets audio keep playing with the silent switch
    // enabled and makes this element behave as music rather than ambient sound.
    try {
      if (isAppleMobileAudio() && navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch { /* Older WebKit uses the native AVAudioSession configuration. */ }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('pulseAudioSession', (event) => this.handleAudioSessionEvent(event.detail));
      window.addEventListener('pageshow', () => this.refreshPlaybackState());
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) this.refreshPlaybackState();
      });
    }
  }

  handleAudioSessionEvent(detail) {
    if (detail?.type === 'interruptionBegan') {
      this.isAudioInterrupted = true;
      clearTimeout(this.startupTimer);
      clearTimeout(this.contextRecovery?.timer);
      this.contextRecovery = null;
      this.audio.pause();
    } else if (detail?.type === 'interruptionEnded') {
      this.isAudioInterrupted = false;
      if (detail.shouldResume && this.wantsToPlay) {
        this.play().catch((error) => this.notify('error', error));
      } else this.pause();
    } else if (detail?.type === 'headphonesDisconnected') {
      this.pause();
    }
  }

  refreshPlaybackState() {
    if (!this.currentTrack || this.pendingPreparation || this.isAudioInterrupted) return;
    this.isPlaying = !this.audio.paused && !this.audio.ended;
    this.notify('playState', this.isPlaying);
    this.notify('timeUpdate', { currentTime: this.audio.currentTime || 0, duration: this.knownDuration });
    this.updateMediaSessionPosition(this.audio.currentTime || 0, this.knownDuration);
    if (this.isPlaying) this.resumeAudioContext();
  }

  unlockAudioForIOS() {
    if (this.hasUnlockedAudio || typeof window === 'undefined') return;
    const unlock = () => {
      if (this.hasUnlockedAudio) return;
      this.hasUnlockedAudio = true;
      this.resumeAudioContext();
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
      traceTiming({ event: 'metadata', duration, storedDuration: this.currentTrack?.duration,
        timingVersion: this.currentTrack?.audioTimingVersion, bytes: this.currentTrack?.audioBlob?.size,
        sourceIndex: this.sourceIndex, sourceKind: this.audio.src?.split(':')[0] });
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
      this.resumeAudioContext();
      this.notify('playState', true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    });
    listen('playing', () => clearTimeout(this.startupTimer));
    listen('waiting', () => { if (this.wantsToPlay) this.armStartupTimeout(); });
    listen('stalled', () => { if (this.wantsToPlay) this.armStartupTimeout(); });
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
    if (this.isAudioInterrupted) return;
    const version = this.sourceVersion;
    const position = this.audio.currentTime || 0;
    this.startupTimer = setTimeout(() => {
      if (version === this.sourceVersion && this.wantsToPlay && !this.isAudioInterrupted && (this.audio.currentTime || 0) <= position) {
        this.advanceSource(new Error('Audio source did not become ready'));
      }
    }, 8000);
  }

  advanceSource(error) {
    traceTiming({ event: 'fallback', sourceIndex: this.sourceIndex, error: error?.message || error?.code });
    clearTimeout(this.startupTimer);
    this.hls?.destroy();
    this.hls = null;
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
      this.audio.pause();
      this.notify('playState', false);
      this.notify('error', error);
      return false;
    }
    this.startSelectedSource(resumeAt);
    return true;
  }

  startSelectedSource(resumeAt = 0) {
    const version = this.sourceVersion;
    if (resumeAt > 0) {
      const audio = this.audio;
      audio.addEventListener('loadedmetadata', () => {
        if (audio === this.audio && version === this.sourceVersion) this.seek(resumeAt);
      }, { once: true });
    }
    const pending = this.attachSource(this.sourceCandidates[this.sourceIndex]);
    this.pendingPreparation = pending ? pending.then(() => {
      if (version === this.sourceVersion) this.pendingPreparation = null;
    }).catch((failure) => {
      if (version === this.sourceVersion) this.advanceSource(failure);
    }) : null;
    if (this.wantsToPlay) this.play().catch((playError) => this.notify('error', playError));
  }

  useNativePlayback() {
    clearTimeout(this.contextRecovery?.timer);
    this.contextRecovery = null;
    const previous = this.audio;
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.playsInline = true;
    this.audio.volume = this.volume;
    this.audio.muted = previous.muted;
    this.setupAudioListeners();
    previous.pause();
    previous.removeAttribute('src');
    previous.load();
    this.sourceNode?.disconnect();
    if (this.audioCtx) {
      this.audioCtx.onstatechange = null;
      this.audioCtx.close().catch(() => {});
    }
    this.audioCtx = this.sourceNode = this.analyserNode = this.bassNode = null;
    this.eqNodes = [];
    this.isWebAudioInitialized = false;
    this.frequencyData.fill(0);
  }

  resumeAudioContext() {
    const context = this.audioCtx;
    if (!context || context.state === 'running' || this.isAudioInterrupted) return;
    const version = this.sourceVersion;
    if (this.contextRecovery?.context === context && this.contextRecovery.version === version) return;
    clearTimeout(this.contextRecovery?.timer);
    const recovery = { context, version, timer: null };
    this.contextRecovery = recovery;
    const clearRecovery = () => {
      clearTimeout(recovery.timer);
      if (this.contextRecovery === recovery) this.contextRecovery = null;
    };
    const recover = () => {
      clearRecovery();
      if (context !== this.audioCtx || version !== this.sourceVersion || !this.wantsToPlay || this.isAudioInterrupted) return;
      const position = this.audio.currentTime || 0;
      this.useNativePlayback();
      this.sourceIndex -= 1;
      this.advanceSourceForEqualizer(position);
    };
    if (context.state === 'closed') recover();
    else {
      // A device interruption may leave resume() pending without a media error.
      recovery.timer = setTimeout(() => {
        if (context.state === 'running') clearRecovery();
        else recover();
      }, 2500);
      context.resume().then(() => {
        if (context.state === 'running') clearRecovery();
      }).catch(recover);
    }
  }

  initWebAudio(force = false) {
    if (this.isWebAudioInitialized || !force) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();

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
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);
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
      this.audioCtx.onstatechange = () => {
        if (this.wantsToPlay) this.resumeAudioContext();
      };
      this.resumeAudioContext();
      // Existing native streams must be re-requested with CORS before entering
      // Web Audio; otherwise even CORS-capable hosts produce silent output.
      if (/^https?:/.test(this.audio.src) && !this.audio.crossOrigin) {
        const resumeAt = this.audio.currentTime || 0;
        this.sourceIndex -= 1;
        this.advanceSourceForEqualizer(resumeAt);
      }
    } catch (err) {
      console.warn('Web Audio initialization note (CORS or permissions):', err);
      const position = this.audio.currentTime || 0;
      this.useNativePlayback();
      if (this.sourceCandidates[this.sourceIndex]) {
        this.sourceIndex -= 1;
        this.advanceSourceForEqualizer(position);
      }
    }
  }

  advanceSourceForEqualizer(resumeAt) {
    this.hls?.destroy();
    this.hls = null;
    this.sourceVersion += 1;
    this.sourceIndex += 1;
    this.startSelectedSource(resumeAt);
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
      ? /^(audio|video)\/mp4/i.test(track.audioBlob.type) || track.audioTimingVersion !== AUDIO_TIMING_VERSION
      : /^(M4A|MP4)$/i.test(track.format || '') || /\.(m4a|mp4)(?:[?#]|$)/i.test(track.audioUrl || track.cloudAudioUrl || ''));
  }

  async preparePlaybackTrack(track) {
    // File-backed IndexedDB blobs can regain their original MP4 header after a
    // cache rewrite in WebKit. Decode a detached memory copy, even when an old
    // cache flag claims the file has already been repaired.
    let cachedBlob = null;
    if (track.audioBlob instanceof Blob && track.audioBlob.size) {
      try {
        cachedBlob = new Blob([new Uint8Array(await track.audioBlob.arrayBuffer())], { type: track.audioBlob.type });
      } catch {
        // An older metadata rewrite may already have invalidated this handle.
        const { getTrackById } = await import('./storageService.js');
        const fresh = await getTrackById(track.id);
        if (fresh?.audioBlob instanceof Blob) {
          try { cachedBlob = new Blob([new Uint8Array(await fresh.audioBlob.arrayBuffer())], { type: fresh.audioBlob.type }); }
          catch { /* Recover from the companion/cloud copy below. */ }
        }
      }
    }
    const audioBlob = cachedBlob ? await prepareAudioBlob(cachedBlob, track) : await downloadAudioForTrack(track);
    const timing = await repairM4aTiming(audioBlob);
    traceTiming({ event: 'prepared', bytes: audioBlob.size, duration: timing.duration, changed: timing.changed });
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
      if (isHlsUrl(src) && !this.audio.canPlayType?.('application/vnd.apple.mpegurl')) return;
      this.preloadAudio.preload = prepared.type === 'podcast' || prepared.duration > 1800 ? 'metadata' : 'auto';
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
    const source = this.sourceCandidates[0] || '';
    return this.attachSource(source);
  }

  attachSource(source) {
    if (isHlsUrl(source) && !this.audio.canPlayType?.('application/vnd.apple.mpegurl')) {
      const version = this.sourceVersion;
      return import('hls.js').then(({ default: Hls }) => {
        if (version !== this.sourceVersion) return;
        if (!Hls.isSupported()) throw new Error('HLS audio is not supported by this browser');
        this.hls = new Hls({ maxBufferLength: 30, backBufferLength: 30 });
        this.hls.on(Hls.Events.ERROR, (_event, data) => {
          if (version === this.sourceVersion && data.fatal) this.advanceSource(new Error(`Audio stream failed: ${data.details}`));
        });
        this.hls.loadSource(source);
        this.hls.attachMedia(this.audio);
      });
    }
    this.configureSource(this.audio, source);
    this.audio.load();
  }

  loadTrack(track) {
    if (!track) return;
    traceTiming({ event: 'load', duration: track.duration, format: track.format, mime: track.audioBlob?.type,
      timingVersion: track.audioTimingVersion, bytes: track.audioBlob?.size, preparation: this.needsTimingPreparation(track) });
    clearTimeout(this.startupTimer);
    this.sourceVersion += 1;
    const version = this.sourceVersion;
    this.hls?.destroy();
    this.hls = null;
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
      this.pendingPreparation = (warmPreparation || this.preparePlaybackTrack(track)).then(async (prepared) => {
        if (version !== this.sourceVersion) return;
        this.currentTrack = prepared;
        await this.applyTrackSource(prepared, warmBlob);
        if (version === this.sourceVersion) this.pendingPreparation = null;
      }).catch((error) => {
        if (version !== this.sourceVersion) return;
        this.pendingPreparation = null;
        this.wantsToPlay = false;
        this.notify('playState', false);
        this.notify('error', error);
      });
    } else {
      const pending = this.applyTrackSource(track, warmBlob);
      this.pendingPreparation = pending ? pending.then(() => {
        if (version === this.sourceVersion) this.pendingPreparation = null;
      }).catch((error) => {
        if (version !== this.sourceVersion) return;
        this.pendingPreparation = null;
        this.wantsToPlay = false;
        this.notify('error', error);
      }) : null;
    }
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
    if (this.isAudioInterrupted) return;
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
      if (version !== this.sourceVersion || !this.wantsToPlay || this.isAudioInterrupted) return;
    }
    if (!this.sourceCandidates[this.sourceIndex]) {
      this.wantsToPlay = false;
      return;
    }
    this.audio.defaultPlaybackRate = 1;
    this.audio.playbackRate = 1;
    this.resumeAudioContext();
    if (version !== this.sourceVersion) return;
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
    if (this.isPlaying || (this.wantsToPlay && (this.pendingPreparation || this.isAudioInterrupted))) this.pause();
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
    if (this.analyserNode) {
      if (this.frequencyData.length !== this.analyserNode.frequencyBinCount) {
        this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
      }
      this.analyserNode.getByteFrequencyData(this.frequencyData);
    } else this.frequencyData.fill(0);
    return this.frequencyData;
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
