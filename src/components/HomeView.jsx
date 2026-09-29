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
            <div
              className="aura-spotlight-bloom"
              style={{ backgroundImage: `url(${currentTrack.coverUrl})` }}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 36 }}>
        <div
          className="aura-glass-card"
          style={{
            cursor: 'pointer',
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'linear-gradient(135deg, rgba(127, 0, 255, 0.15) 0%, rgba(244, 63, 94, 0.08) 100%)',
            border: '1px solid rgba(127, 0, 255, 0.25)',
          }}
          onClick={() => onPlayPlaylist('liked')}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #7f00ff, #f43f5e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(244, 63, 94, 0.35)',
            }}
          >
            <Heart size={20} fill="#ffffff" color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Favorites Lounge</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{likedCount} saved tracks</div>
          </div>
        </div>

        <div
          className="aura-glass-card"
          style={{
            cursor: 'pointer',
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.15) 0%, rgba(79, 172, 254, 0.08) 100%)',
            border: '1px solid rgba(0, 242, 254, 0.25)',
          }}
          onClick={() => onPlayPlaylist('downloaded')}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 242, 254, 0.35)',
            }}
          >
            <HardDriveDownload size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Offline Vault</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{offlineTracks.length} local lossless songs</div>
          </div>
        </div>

        <div
          className="aura-glass-card"
          style={{
            cursor: 'pointer',
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
          onClick={onOpenDownloader}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            }}
          >
            <Radio size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Sound Ingest</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Fetch YouTube, Podcasts & Files</div>
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
