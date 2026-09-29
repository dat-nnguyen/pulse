import React from 'react';
import { Play, Pause, Sparkles, HardDriveDownload, Heart, Podcast as PodcastIcon, Radio } from 'lucide-react';
import { FEATURED_PODCASTS } from '../services/podcastService';

export default function HomeView({
  tracks = [],
  likedCount = 0,
  onPlayTrack,
  onPlayPlaylist,
  currentTrack,
  isPlaying,
  onTogglePlay,
  onSelectPodcast,
  onOpenDownloader,
}) {
  const offlineTracks = tracks.filter((t) => t.isDownloaded);

  return (
    <div className="aura-scroll-area">
      {/* Soundstage Spotlight Hero */}
      {currentTrack && (
        <div className="aura-ambient-spotlight">
          <div className="aura-spotlight-art-container">
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="aura-spotlight-art"
            />
          </div>

          <div className="aura-spotlight-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="aura-badge-lossless">
                <Sparkles size={11} />
                <span>{currentTrack.bitrate || '320K LOSSLESS'}</span>
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {currentTrack.album || 'Studio Master'}
              </span>
            </div>

            <h1 className="aura-spotlight-title">{currentTrack.title}</h1>
            <div className="aura-spotlight-artist">{currentTrack.artist}</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="aura-btn-primary"
                onClick={onTogglePlay}
                style={{ padding: '10px 24px', fontSize: 14 }}
              >
                {isPlaying ? <Pause size={18} fill="#ffffff" /> : <Play size={18} fill="#ffffff" />}
                <span>{isPlaying ? 'Pause Session' : 'Play Now'}</span>
              </button>

              <button
                className="aura-circle-btn"
                title="View in Library"
                onClick={() => onPlayPlaylist('downloaded')}
              >
                <HardDriveDownload size={18} color="#00f2fe" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Listening Modes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 32 }}>
        <div
          className="aura-glass-card"
          style={{
            cursor: 'pointer',
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--aura-bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
          onClick={() => onPlayPlaylist('liked')}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'var(--aura-surface-active)',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Heart size={18} fill="#f43f5e" color="#f43f5e" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Favorites Lounge</div>
            <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{likedCount} saved tracks</div>
          </div>
        </div>

        <div
          className="aura-glass-card"
          style={{
            cursor: 'pointer',
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--aura-bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
          onClick={() => onPlayPlaylist('downloaded')}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'var(--aura-surface-active)',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HardDriveDownload size={18} color="#00d2df" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Offline Vault</div>
            <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{offlineTracks.length} local lossless songs</div>
          </div>
        </div>

        <div
          className="aura-glass-card"
          style={{
            cursor: 'pointer',
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--aura-bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
          onClick={onOpenDownloader}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'var(--aura-surface-active)',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Radio size={18} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Sound Ingest</div>
            <div style={{ fontSize: 11.5, color: '#94a3b8' }}>Fetch YouTube, Podcasts & Files</div>
          </div>
        </div>
      </div>

      {/* Section 1: Curated Lossless Masters */}
      <div className="aura-section-header">
        <div>
          <h2 className="aura-section-title">Master Audio Sessions</h2>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
            Direct bit-perfect audio preserved with hardware equalization
          </p>
        </div>
      </div>

      <div className="aura-cards-grid">
        {tracks.map((track) => {
          const isThisPlaying = currentTrack?.id === track.id && isPlaying;
          return (
            <div
              key={track.id}
              className="aura-media-card"
              onClick={() => onPlayTrack(track)}
            >
              <div className="aura-card-art-box">
                <img src={track.coverUrl} alt={track.title} className="aura-card-art" />
                <button
                  className="aura-card-floating-play"
                  style={isThisPlaying ? { opacity: 1, transform: 'none' } : {}}
                  title="Play Track"
                >
                  {isThisPlaying ? <Pause size={20} fill="#ffffff" /> : <Play size={20} fill="#ffffff" style={{ marginLeft: 2 }} />}
                </button>
              </div>
              <div className="aura-card-title">{track.title}</div>
              <div className="aura-card-subtitle">{track.artist} • {track.bitrate}</div>
            </div>
          );
        })}
      </div>

      {/* Section 2: Podcasts & Shows */}
      <div className="aura-section-header" style={{ marginTop: 44 }}>
        <div>
          <h2 className="aura-section-title">Podcasts & Spoken Audio</h2>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
            Direct broadcast feeds • Stream or download episodes offline
          </p>
        </div>
        <button
          onClick={onOpenDownloader}
          style={{ background: 'transparent', border: 'none', color: '#00f2fe', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          Explore All Shows
        </button>
      </div>

      <div className="aura-cards-grid">
        {FEATURED_PODCASTS.map((podcast) => (
          <div
            key={podcast.id}
            className="aura-media-card"
            onClick={() => onSelectPodcast(podcast)}
          >
            <div className="aura-card-art-box">
              <img src={podcast.coverUrl} alt={podcast.name} className="aura-card-art" />
              <button className="aura-card-floating-play" title="View Show">
                <PodcastIcon size={20} color="#ffffff" />
              </button>
            </div>
            <div className="aura-card-title">{podcast.name}</div>
            <div className="aura-card-subtitle">{podcast.artist} • {podcast.genre}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
