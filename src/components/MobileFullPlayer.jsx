import React from 'react';
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
  Mic2,
  Sliders,
  Share2,
  Sparkles
} from 'lucide-react';

export default function MobileFullPlayer({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
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
  onOpenLyrics,
  onOpenEqualizer,
  onOpenShare,
}) {
  if (!isOpen || !currentTrack) return null;

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="aura-fullscreen-overlay">
      {/* Dynamic Ambient Background Blur */}
      <div
        className="aura-fullscreen-backdrop-art"
        style={{
          backgroundImage: `url(${currentTrack.coverUrl || ''})`,
        }}
      />

      {/* Top Header: Down Chevron, Title, Share */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <button
          className="aura-circle-btn"
          onClick={onClose}
          style={{ width: 40, height: 40 }}
        >
          <ChevronDown size={24} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#00f2fe' }}>
            NOW PLAYING
          </span>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
            {currentTrack.album || 'Aura Soundstage'}
          </div>
        </div>

        <button
          className="aura-circle-btn"
          onClick={onOpenShare}
          style={{ width: 40, height: 40 }}
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Large Artwork Frame */}
      <div className="aura-art-frame">
        <img
          src={currentTrack.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
          alt={currentTrack.title}
        />
      </div>

      {/* Track Title, Artist & Like Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ minWidth: 0, flex: 1, paddingRight: 16 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', letterSpacing: -0.5, marginBottom: 4 }}>
            {currentTrack.title}
          </h2>
          <div style={{ fontSize: 15, color: '#94a3b8' }}>{currentTrack.artist}</div>
        </div>

        <button
          className={`aura-circle-btn ${isLiked ? 'active' : ''}`}
          onClick={onToggleLike}
          style={{ width: 44, height: 44 }}
        >
          <Heart size={22} fill={isLiked ? '#00f2fe' : 'none'} color={isLiked ? '#00f2fe' : '#ffffff'} />
        </button>
      </div>

      {/* Quality Badge & Equalizer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="aura-badge-lossless" style={{ fontSize: 10.5, padding: '4px 10px' }}>
          <Sparkles size={12} />
          <span>{currentTrack.bitrate || '320K LOSSLESS'}</span>
        </div>

        <button
          onClick={onOpenEqualizer}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid var(--border-glass)',
            color: '#ffffff',
            borderRadius: 20,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
          }}
        >
          <Sliders size={13} color="#00f2fe" />
          <span>Equalizer</span>
        </button>
      </div>

      {/* Scrubber & Timeline */}
      <div style={{ width: '100%', marginBottom: 28 }}>
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="aura-scrubber"
          style={{
            width: '100%',
            height: 5,
            background: `linear-gradient(to right, #00f2fe 0%, #4facfe ${progressPercent}%, rgba(255, 255, 255, 0.15) ${progressPercent}%, rgba(255, 255, 255, 0.15) 100%)`,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 12, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(currentTime)}
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', marginBottom: 28 }}>
        <button
          className={`aura-control-btn ${isShuffle ? 'active' : ''}`}
          onClick={onToggleShuffle}
        >
          <Shuffle size={22} />
        </button>

        <button className="aura-control-btn" onClick={onPrev}>
          <SkipBack size={30} />
        </button>

        <button
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--aura-gradient)',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0, 242, 254, 0.4)',
          }}
          onClick={onTogglePlay}
        >
          {isPlaying ? <Pause size={30} fill="#ffffff" /> : <Play size={30} fill="#ffffff" style={{ marginLeft: 3 }} />}
        </button>

        <button className="aura-control-btn" onClick={onNext}>
          <SkipForward size={30} />
        </button>

        <button
          className={`aura-control-btn ${repeatMode !== 'off' ? 'active' : ''}`}
          onClick={onToggleRepeat}
        >
          {repeatMode === 'one' ? <Repeat1 size={22} /> : <Repeat size={22} />}
        </button>
      </div>

      {/* Lyrics Drawer preview */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid var(--border-glass-bright)',
          borderRadius: 18,
          padding: 18,
          cursor: 'pointer',
          backdropFilter: 'blur(20px)',
        }}
        onClick={onOpenLyrics}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#00f2fe', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mic2 size={16} /> Karaoke Synced Lyrics
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Tap to Expand</span>
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#f8fafc', lineHeight: 1.4 }}>
          Tap to view real-time synchronized lyrics & tap-to-seek
        </p>
      </div>
    </div>
  );
}
