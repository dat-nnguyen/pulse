import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ChevronDown,
  Heart,
  Shuffle,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Repeat,
  Repeat1,
  Sliders,
  Share2,
  Cloud,
  ListMusic,
  Volume2,
  Volume1,
  VolumeX,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

export default function MobileFullPlayer({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume = 0.8,
  onVolumeChange,
  isLiked,
  isShuffle,
  repeatMode,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onOpenEqualizer,
  onOpenQueue,
  onOpenShare,
  onOpenSupabase,
}) {
  const [dominantColor, setDominantColor] = useState('rgba(0, 194, 209, 0.4)');
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume || 0.8);
  const canvasRef = useRef(null);

  // Keyboard shortcut listener (Esc to close, Space to toggle play, Arrow keys to seek)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Ignore if user is focused inside an input, textarea or contentEditable
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      } else if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay?.();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (duration > 0 && onSeek) {
          onSeek(Math.max(0, currentTime - 5));
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (duration > 0 && onSeek) {
          onSeek(Math.min(duration, currentTime + 5));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onTogglePlay, currentTime, duration, onSeek]);

  // Extract dominant color from cover art for ambient backdrop
  useEffect(() => {
    if (!currentTrack?.coverUrl) {
      setDominantColor('rgba(0, 194, 209, 0.4)');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 10, 10);
        const data = ctx.getImageData(0, 0, 10, 10).data;

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
          // Filter out extreme black and pure white
          if (brightness > 35 && brightness < 225) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }

        if (count > 0) {
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          // Boost saturation slightly
          const max = Math.max(r, g, b);
          const boost = max > 0 ? Math.min(1.25, 255 / max) : 1;
          r = Math.min(255, Math.round(r * boost));
          g = Math.min(255, Math.round(g * boost));
          b = Math.min(255, Math.round(b * boost));
          setDominantColor(`rgba(${r}, ${g}, ${b}, 0.5)`);
        }
      } catch {
        setDominantColor('rgba(0, 194, 209, 0.4)');
      }
    };
    img.onerror = () => setDominantColor('rgba(0, 194, 209, 0.4)');
    img.src = currentTrack.coverUrl;
  }, [currentTrack?.coverUrl]);

  const handleMuteToggle = () => {
    if (!onVolumeChange) return;
    if (isMuted || volume === 0) {
      setIsMuted(false);
      onVolumeChange(prevVolume > 0 ? prevVolume : 0.8);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      onVolumeChange(0);
    }
  };

  const handleVolumeInput = (e) => {
    const val = parseFloat(e.target.value);
    if (onVolumeChange) {
      if (val > 0) setIsMuted(false);
      onVolumeChange(val);
    }
  };

  if (!isOpen || !currentTrack) return null;

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const isCloudConnected = isSupabaseConfigured();
  const coverSrc = currentTrack.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
  const effectiveVolume = isMuted ? 0 : volume;

  return (
    <div className="fp-overlay" role="dialog" aria-modal="true" aria-label="Fullscreen music player">
      {/* Hidden canvas for color extraction */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Ambient backdrop layers */}
      <div className="fp-backdrop-layer" style={{ backgroundImage: `url(${coverSrc})` }} />
      <div className="fp-backdrop-glow" style={{ background: `radial-gradient(ellipse at 50% 35%, ${dominantColor} 0%, transparent 68%)` }} />
      <div className="fp-backdrop-vignette" />

      {/* Content wrapper */}
      <div className="fp-container">
        {/* Top bar */}
        <header className="fp-topbar">
          <button className="fp-icon-btn fp-close-btn" onClick={onClose} title="Minimize (Esc)" aria-label="Close fullscreen player">
            <ChevronDown size={24} />
          </button>

          <div className="fp-topbar-center">
            <span className="fp-topbar-subtitle">NOW PLAYING</span>
            <span className="fp-topbar-album" title={currentTrack.album || currentTrack.title}>
              {currentTrack.album || 'Soundtrack'}
            </span>
          </div>

          <div className="fp-topbar-actions">
            {onOpenSupabase && (
              <button
                className="fp-icon-btn"
                onClick={onOpenSupabase}
                title={isCloudConnected ? 'Cloud Sync Active' : 'Cloud Sync Settings'}
                aria-label="Cloud Sync"
              >
                <Cloud size={19} color={isCloudConnected ? 'var(--pulse-accent)' : 'currentColor'} />
                {isCloudConnected && <span className="fp-cloud-dot" />}
              </button>
            )}
            {onOpenShare && (
              <button className="fp-icon-btn" onClick={onOpenShare} title="Share track" aria-label="Share">
                <Share2 size={19} />
              </button>
            )}
          </div>
        </header>

        {/* Stage Area: responsive 2-column on desktop, vertical stacked on mobile */}
        <div className="fp-stage">
          {/* Artwork Showcase Column */}
          <div className="fp-artwork-col">
            <div className="fp-artwork-card">
              <div className="fp-artwork-ambient" style={{ backgroundColor: dominantColor }} />
              <div className={`fp-artwork-image-wrapper ${isPlaying ? 'fp-artwork--playing' : ''}`}>
                <img src={coverSrc} alt={currentTrack.title} draggable={false} className="fp-artwork-img" />
                <div className="fp-artwork-sheen" />
              </div>
            </div>
          </div>

          {/* Details & Controls Column */}
          <div className="fp-details-col">
            {/* Track Info */}
            <div className="fp-track-meta">
              <div className="fp-meta-text">
                <div className="fp-status-badge">
                  <span className={`fp-live-indicator ${isPlaying ? 'fp-live-indicator--active' : ''}`} />
                  <span>{isPlaying ? 'PLAYING' : 'PAUSED'}</span>
                </div>
                <h1 className="fp-track-title" title={currentTrack.title}>{currentTrack.title}</h1>
                <p className="fp-track-artist" title={currentTrack.artist}>{currentTrack.artist}</p>
              </div>
              <button
                className={`fp-heart-btn ${isLiked ? 'fp-heart-btn--active' : ''}`}
                onClick={onToggleLike}
                title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
                aria-label={isLiked ? 'Unlike track' : 'Like track'}
              >
                <Heart size={26} fill={isLiked ? '#ef4444' : 'transparent'} color={isLiked ? '#ef4444' : '#ffffff'} />
              </button>
            </div>

            {/* Progress Scrubber */}
            <div className="fp-scrubber-section">
              <div className="fp-scrubber-track-wrapper">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => onSeek?.(parseFloat(e.target.value))}
                  className="fp-scrubber"
                  style={{
                    background: `linear-gradient(to right, #00c2d1 0%, #00c2d1 ${progressPercent}%, rgba(255, 255, 255, 0.16) ${progressPercent}%, rgba(255, 255, 255, 0.16) 100%)`,
                  }}
                  aria-label="Seek track position"
                />
              </div>
              <div className="fp-time-row">
                <span className="fp-time-label">{formatTime(currentTime)}</span>
                <span className="fp-time-label">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main Playback Controls */}
            <div className="fp-controls-bar">
              <button
                className={`fp-btn-secondary ${isShuffle ? 'fp-btn--active' : ''}`}
                onClick={onToggleShuffle}
                title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
                aria-label="Shuffle playback"
              >
                <Shuffle size={20} />
              </button>

              <button
                className="fp-btn-transport"
                onClick={onPrev}
                title="Previous track"
                aria-label="Previous track"
              >
                <SkipBack size={26} fill="currentColor" />
              </button>

              <button
                className={`fp-btn-play ${isPlaying ? 'fp-btn-play--playing' : ''}`}
                onClick={onTogglePlay}
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause size={28} fill="#0a0d14" color="#0a0d14" />
                ) : (
                  <Play size={28} fill="#0a0d14" color="#0a0d14" style={{ marginLeft: 3 }} />
                )}
              </button>

              <button
                className="fp-btn-transport"
                onClick={onNext}
                title="Next track"
                aria-label="Next track"
              >
                <SkipForward size={26} fill="currentColor" />
              </button>

              <button
                className={`fp-btn-secondary ${repeatMode !== 'off' ? 'fp-btn--active' : ''}`}
                onClick={onToggleRepeat}
                title={repeatMode === 'one' ? 'Repeat Track' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}
                aria-label="Repeat mode"
              >
                {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
              </button>
            </div>

            {/* Bottom Accessories: Volume + Tools Chips */}
            <div className="fp-accessories-bar">
              {/* Volume Slider */}
              {onVolumeChange && (
                <div className="fp-volume-module">
                  <button
                    className="fp-btn-icon-subtle"
                    onClick={handleMuteToggle}
                    title={effectiveVolume === 0 ? 'Unmute' : 'Mute'}
                    aria-label="Toggle mute"
                  >
                    {effectiveVolume === 0 ? (
                      <VolumeX size={18} />
                    ) : effectiveVolume < 0.5 ? (
                      <Volume1 size={18} />
                    ) : (
                      <Volume2 size={18} />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={effectiveVolume}
                    onChange={handleVolumeInput}
                    className="fp-volume-slider"
                    style={{
                      background: `linear-gradient(to right, #ffffff 0%, #ffffff ${effectiveVolume * 100}%, rgba(255, 255, 255, 0.16) ${effectiveVolume * 100}%, rgba(255, 255, 255, 0.16) 100%)`,
                    }}
                    aria-label="Adjust volume"
                  />
                </div>
              )}

              {/* Utility Action Buttons */}
              <div className="fp-tools-group">
                {onOpenEqualizer && (
                  <button className="fp-tool-chip" onClick={onOpenEqualizer} title="Audio Equalizer">
                    <Sliders size={15} />
                    <span>EQ</span>
                  </button>
                )}
                {onOpenQueue && (
                  <button className="fp-tool-chip" onClick={onOpenQueue} title="Play Queue">
                    <ListMusic size={15} />
                    <span>Queue</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
