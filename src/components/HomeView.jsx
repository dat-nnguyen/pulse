import React from 'react';
import {
  Play,
  Pause,
  Heart,
  HardDriveDownload,
  Disc3,
  Plus,
  Music,
  FolderPlus,
  Sparkles,
  ArrowRight,
  CloudDownload
} from 'lucide-react';

export default function HomeView({
  playlists = [],
  tracks = [],
  likedCount = 0,
  onPlayTrack,
  onOpenPlaylist,
  onCreatePlaylist,
  onOpenDownloader,
  currentTrack,
  isPlaying,
  onTogglePlay,
}) {
  const offlineTracks = tracks.filter((t) => t.isDownloaded);

  return (
    <div className="aura-scroll-area">
      {/* Top Banner / User Vault Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
          paddingBottom: 20,
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#f8fafc',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Your Playlists
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: 13.5, color: '#94a3b8' }}>
            {playlists.length + 2} collections • {tracks.length} lossless & original tracks
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="aura-btn-primary"
            onClick={onCreatePlaylist}
            style={{ fontSize: 13 }}
          >
            <Plus size={16} />
            <span>New Playlist</span>
          </button>

          <button
            className="aura-btn-secondary"
            onClick={onOpenDownloader}
            style={{ fontSize: 13 }}
          >
            <CloudDownload size={16} />
            <span>Add Audio</span>
          </button>
        </div>
      </div>

      {/* Primary Collections Cards (Favorites, Offline, All Tracks) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          marginBottom: 36,
        }}
      >
        {/* Favorites / Liked Songs */}
        <div
          className="aura-glass-card aura-playlist-card"
          onClick={() => onOpenPlaylist('liked')}
          style={{
            cursor: 'pointer',
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: 'var(--aura-bg-elevated)',
            border: '1px solid var(--border-subtle)',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #7f00ff, #e11d48)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Heart size={26} fill="#ffffff" color="#ffffff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
              Favorites
            </div>
            <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>
              {likedCount} liked tracks
            </div>
          </div>
          <div className="aura-card-play-btn" title="Open Favorites">
            <ArrowRight size={18} color="#00d2df" />
          </div>
        </div>

        {/* Offline Downloads */}
        <div
          className="aura-glass-card aura-playlist-card"
          onClick={() => onOpenPlaylist('downloaded')}
          style={{
            cursor: 'pointer',
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: 'var(--aura-bg-elevated)',
            border: '1px solid var(--border-subtle)',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #0284c7, #0d9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <HardDriveDownload size={26} color="#ffffff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
              Offline Storage
            </div>
            <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>
              {offlineTracks.length} cached tracks
            </div>
          </div>
          <div className="aura-card-play-btn" title="Open Offline">
            <ArrowRight size={18} color="#00d2df" />
          </div>
        </div>

        {/* All Songs Library */}
        <div
          className="aura-glass-card aura-playlist-card"
          onClick={() => onOpenPlaylist('all')}
          style={{
            cursor: 'pointer',
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: 'var(--aura-bg-elevated)',
            border: '1px solid var(--border-subtle)',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #2563eb, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Music size={26} color="#ffffff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
              All Tracks
            </div>
            <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>
              {tracks.length} total tracks
            </div>
          </div>
          <div className="aura-card-play-btn" title="Open All Tracks">
            <ArrowRight size={18} color="#00d2df" />
          </div>
        </div>
      </div>

      {/* User Custom Playlists Grid */}
      <div style={{ marginBottom: 40 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Custom Playlists
          </h2>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>
            {playlists.length} custom {playlists.length === 1 ? 'playlist' : 'playlists'}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 18,
          }}
        >
          {/* Create New Playlist Card */}
          <div
            onClick={onCreatePlaylist}
            style={{
              cursor: 'pointer',
              borderRadius: 14,
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.02)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 220,
              textAlign: 'center',
              transition: 'all 0.2s ease',
            }}
            className="aura-create-playlist-card"
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(0, 210, 223, 0.1)',
                border: '1px solid rgba(0, 210, 223, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Plus size={22} color="#00d2df" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
              Create Playlist
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Build a custom collection
            </div>
          </div>

          {/* User Playlist Cards */}
          {playlists.map((pl) => (
            <div
              key={pl.id}
              className="aura-glass-card aura-playlist-card"
              onClick={() => onOpenPlaylist(pl.id)}
              style={{
                cursor: 'pointer',
                borderRadius: 14,
                padding: 14,
                background: 'var(--aura-bg-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#151d2c',
                  marginBottom: 12,
                  position: 'relative',
                }}
              >
                {pl.coverUrl ? (
                  <img
                    src={pl.coverUrl}
                    alt={pl.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    }}
                  >
                    <Disc3 size={42} color="#64748b" />
                  </div>
                )}
              </div>

              <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pl.name}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>
                {pl.trackIds?.length || 0} {pl.trackIds?.length === 1 ? 'track' : 'tracks'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
