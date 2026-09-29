import React from 'react';
import { Play, Pause, SkipForward, Heart } from 'lucide-react';

export default function MobileMiniPlayer({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  isLiked,
  onTogglePlay,
  onNext,
  onToggleLike,
  onOpenFullscreen,
}) {
  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="aura-mobile-miniplayer">
      {/* Background audio progress line at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 10,
          right: 10,
          height: 2,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: '#00d2df',
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }}
        onClick={onOpenFullscreen}
      >
        <img
          src={currentTrack.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=80'}
          alt={currentTrack.title}
          style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', boxShadow: '0 4px 10px rgba(0,0,0,0.4)' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack.title}
          </span>
          <span style={{ fontSize: 11.5, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack.artist}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          className={`aura-control-btn ${isLiked ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike();
          }}
        >
          <Heart size={18} fill={isLiked ? '#f43f5e' : 'none'} color={isLiked ? '#f43f5e' : '#94a3b8'} />
        </button>

        <button
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--text-primary)',
            border: 'none',
            color: 'var(--aura-bg)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
        </button>

        <button
          className="aura-control-btn"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
        >
          <SkipForward size={20} />
        </button>
      </div>
    </div>
  );
}
