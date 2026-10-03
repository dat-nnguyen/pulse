// Audio Engine with Web Audio API Equalizer, Visualizer, and MediaSession lock-screen controls
import { getBackendBaseUrl } from './musicDownloaderService.js';

class AudioEngine {
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

    this.setupAudioListeners();
    this.setupMediaSession();
  }

  setupAudioListeners() {
    this.audio.addEventListener('timeupdate', () => {
      const cur = this.audio.currentTime || 0;
      const dur = this.audio.duration || 0;
      this.notify('timeUpdate', { currentTime: cur, duration: dur });
      this.updateMediaSessionPosition(cur, dur);
    });

    this.audio.addEventListener('durationchange', () => {
      this.notify('durationChange', this.audio.duration || 0);
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      this.notify('playState', true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notify('playState', false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    });

    this.audio.addEventListener('ended', () => {
      this.notify('ended');
    });

    this.audio.addEventListener('error', (e) => {
      const mediaErr = this.audio.error;
      console.warn('Audio playback error:', mediaErr ? `code ${mediaErr.code}: ${mediaErr.message}` : e);

      // Multi-step fallback 1: If current src was local /audio/ or failed, try cloudAudioUrl if available
      if (this.currentTrack?.cloudAudioUrl && this.audio.src !== this.currentTrack.cloudAudioUrl) {
        console.log('Local stream failed, falling back to Supabase Cloud Audio URL...');
        this.audio.removeAttribute('crossOrigin');
        this.audio.src = this.currentTrack.cloudAudioUrl;
        this.audio.load();
        if (this.isPlaying) {
          this.audio.play().catch((playErr) => console.warn('Cloud audio fallback play error:', playErr));
        }
        return;
      }

      // Multi-step fallback 2: Automatic blob fallback: if blob URL failed, fallback to local/server URL
      if (this.currentBlobUrl && (this.currentTrack?.localAudioUrl || this.currentTrack?.audioUrl)) {
        console.warn('Blob audio failed, falling back to direct server URL...');
        this.currentBlobUrl = null;
        let fallbackSrc = this.currentTrack.localAudioUrl || this.currentTrack.audioUrl;
        const backendBase = getBackendBaseUrl();
        if (fallbackSrc.startsWith('/audio/') && backendBase) {
          fallbackSrc = `${backendBase}${fallbackSrc}`;
        }
        this.audio.removeAttribute('crossOrigin');
        this.audio.src = fallbackSrc;
        this.audio.load();
        if (this.isPlaying) {
          this.audio.play().catch((playErr) => console.warn('Fallback play error:', playErr));
        }
        return;
      }

      // Multi-step fallback 3: Automatic CORS fallback: if failed with crossOrigin, retry without crossOrigin
      if (this.audio.crossOrigin) {
        console.log('CORS playback issue detected. Retrying without crossOrigin attribute...');
        this.audio.removeAttribute('crossOrigin');
        const currentSrc = this.audio.src;
        this.audio.src = '';
        this.audio.src = currentSrc;
        this.audio.load();
        if (this.isPlaying) {
          this.audio.play().catch((playErr) => console.warn('CORS fallback play error:', playErr));
        }
        return;
      }

      this.notify('error', e);
    });
  }

  initWebAudio(force = false) {
    if (this.isWebAudioInitialized) return;
    const isIOS = typeof navigator !== 'undefined' && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
    // On iOS WebKit, avoid createMediaElementSource unless explicitly forced (e.g. Equalizer)
    // because WebKit mutes cross-origin streams and disables AVAudioSession background lock-screen playback
    if (isIOS && !force) return;

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
    } catch (err) {
      console.warn('Web Audio initialization note (CORS or permissions):', err);
    }
  }

  // Setup Apple & standard lock screen controls via MediaSession
  setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    const actionHandlers = [
      ['play', () => this.play()],
      ['pause', () => this.pause()],
      ['previoustrack', () => this.notify('prevTrackRequest')],
      ['nexttrack', () => this.notify('nextTrackRequest')],
      ['seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        this.seek(Math.max(this.audio.currentTime - skipTime, 0));
      }],
      ['seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        this.seek(Math.min(this.audio.currentTime + skipTime, this.audio.duration || 0));
      }],
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
  }

  updateMediaSessionMetadata(track) {
    if (!('mediaSession' in navigator) || !track) return;

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

  async loadTrack(track) {
    if (!track) return;
    this.currentTrack = track;
    this.initWebAudio();

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {}
    }

    // Determine audio URL (blob url or streaming url)
    let src = '';
    let isLocalBlob = false;

    if (track.audioBlob && track.audioBlob instanceof Blob && track.audioBlob.size > 0) {
      if (this.currentBlobUrl) {
        try {
          URL.revokeObjectURL(this.currentBlobUrl);
        } catch (e) {}
      }
      this.currentBlobUrl = URL.createObjectURL(track.audioBlob);
      src = this.currentBlobUrl;
      isLocalBlob = true;
    } else if (track.cloudAudioUrl && track.cloudAudioUrl.startsWith('http')) {
      src = track.cloudAudioUrl;
    } else {
      src = track.localAudioUrl || track.audioUrl || '';
    }

    const isIOS = typeof navigator !== 'undefined' && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );

    const backendBase = getBackendBaseUrl();

    // If relative audio path, resolve to local backend server or same-origin
    if (src && src.startsWith('/audio/')) {
      if (backendBase) {
        src = `${backendBase}${src}`;
      } else if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
        src = `${window.location.origin}${src}`;
      } else {
        src = `http://127.0.0.1:3030${src}`;
      }
    } else if (src && backendBase && (src.includes('127.0.0.1:3030') || src.includes('localhost:3030') || src.includes('192.168.'))) {
      src = src.replace(/http:\/\/[^/]+(:3030)?/, backendBase);
    }

    // Avoid Mixed Content error if page is loaded on HTTPS:
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && src.startsWith('http://')) {
      if (track.cloudAudioUrl && track.cloudAudioUrl.startsWith('https://')) {
        src = track.cloudAudioUrl;
      }
    }

    // Blob and data URLs must NEVER have crossOrigin set in WebKit/Chromium
    if (isLocalBlob || src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('file:')) {
      this.audio.removeAttribute('crossOrigin');
    } else if (isIOS) {
      // On iOS WebKit, omitting crossOrigin ensures native AVPlayer streams without CORS preflight restrictions
      this.audio.removeAttribute('crossOrigin');
    } else if (src.startsWith('http://') || src.startsWith('https://')) {
      this.audio.crossOrigin = 'anonymous';
    } else {
      this.audio.removeAttribute('crossOrigin');
    }

    this.audio.src = src;
    this.audio.load();
    this.updateMediaSessionMetadata(track);
    this.notify('trackChange', track);
  }

  async play() {
    if (!this.audio.src) {
      console.warn('AudioEngine: No audio source loaded to play');
      return;
    }
    this.initWebAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {}
    }
    try {
      await this.audio.play();
    } catch (e) {
      console.warn('Playback error / autoplay prevention:', e);
      if (this.audio.crossOrigin) {
        console.log('Retrying audio.play() without crossOrigin attribute...');
        this.audio.removeAttribute('crossOrigin');
        const currSrc = this.audio.src;
        this.audio.src = '';
        this.audio.src = currSrc;
        this.audio.load();
        await this.audio.play();
      } else {
        throw e;
      }
    }
  }

  pause() {
    this.audio.pause();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      if (!this.audio.src && this.currentTrack) {
        this.loadTrack(this.currentTrack).then(() => this.play().catch(() => {}));
        return;
      }
      if (!this.audio.src) return;
      this.play().catch(() => {});
    }
  }

  seek(seconds) {
    if (isFinite(seconds)) {
      this.audio.currentTime = seconds;
      this.updateMediaSessionPosition(seconds, this.audio.duration);
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
