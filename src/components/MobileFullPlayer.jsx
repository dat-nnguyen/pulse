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
  Sliders,
  Share2,
  Database,
  Cloud
} from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

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
  onOpenEqualizer,
  onOpenShare,
  onOpenSupabase,
}) {
  if (!isOpen || !currentTrack) return null;

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isCloudConnected = isSupabaseConfigured();

  return (
    <div className="aura-fullscreen-overlay">
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
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--pulse-accent)' }}>
            Now Playing
          </span>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
            {currentTrack.album || 'Pulse Soundstage'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="aura-circle-btn"
            onClick={onOpenSupabase}
            style={{ width: 40, height: 40, position: 'relative' }}
            title={isCloudConnected ? "Cloud Sync: Connected" : "Cloud Sync Settings"}
            aria-label="Cloud Sync Settings"
          >
            <Cloud size={18} color={isCloudConnected ? "var(--pulse-accent)" : "currentColor"} />
            {isCloudConnected && (
              <span
                style={{
                  position: 'absolute',
                  top: 7,
                  right: 7,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#10b981',
                }}
              />
            )}
          </button>
          <button
            className="aura-circle-btn"
            onClick={onOpenShare}
            style={{ width: 40, height: 40 }}
          >
            <Share2 size={18} />
          </button>
        </div>
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
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', letterSpacing: -0.5, marginBottom: 4 }}>
            {currentTrack.title}
          </h2>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>{currentTrack.artist}</div>
        </div>

        <button
          className={`aura-circle-btn ${isLiked ? 'active' : ''}`}
          onClick={onToggleLike}
          style={{ width: 44, height: 44 }}
        >
          <Heart size={22} fill={isLiked ? '#f43f5e' : 'none'} color={isLiked ? '#f43f5e' : '#ffffff'} />
        </button>
      </div>

      {/* Equalizer Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button
          onClick={onOpenEqualizer}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid var(--border-medium)',
            color: '#ffffff',
            borderRadius: 20,
            padding: '5px 12px',
            fontSize: 12.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
          }}
        >
          <Sliders size={13} color="var(--pulse-accent)" />
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
            background: `linear-gradient(to right, var(--pulse-accent) 0%, var(--pulse-accent) ${progressPercent}%, rgba(255, 255, 255, 0.15) ${progressPercent}%, rgba(255, 255, 255, 0.15) 100%)`,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(currentTime)}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
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
            background: '#ffffff',
            border: 'none',
            color: '#07090e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
            flexShrink: 0,
            transition: 'transform 0.15s ease',
          }}
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={28} fill="#07090e" color="#07090e" />
          ) : (
            <Play size={28} fill="#07090e" color="#07090e" style={{ marginLeft: 3 }} />
          )}
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
    </div>
  );
}
