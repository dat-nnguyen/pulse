import React from 'react';
import {
  Play,
  Pause,
  Heart,
  Clock,
  HardDriveDownload,
  Trash2,
  Sparkles,
  Disc3,
  Shuffle
} from 'lucide-react';

export default function LibraryView({
  playlistId,
  playlists = [],
  tracks = [],
  likedIds = new Set(),
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onToggleLike,
  onDeleteTrack,
  onPlayAll,
}) {
  // Determine tracks to display based on selected playlist
  let title = 'Your Library';
  let description = 'All tracks, podcasts, and offline downloads';
  let bannerGradient = 'linear-gradient(180deg, #333333 0%, #121212 100%)';
  let coverArt = null;
  let displayTracks = tracks;

  if (playlistId === 'liked') {
    title = 'Liked Songs';
    description = 'Your favorite songs saved to your local library';
    bannerGradient = 'linear-gradient(180deg, #450af5 0%, #121212 100%)';
    displayTracks = tracks.filter((t) => likedIds.has(t.id));
  } else if (playlistId === 'downloaded') {
    title = 'Offline Downloads';
    description = 'Saved locally to device storage • Lossless & 320kbps Original';
    bannerGradient = 'linear-gradient(180deg, #0575e6 0%, #121212 100%)';
    displayTracks = tracks.filter((t) => t.isDownloaded);
  } else if (playlistId) {
    const pl = playlists.find((p) => p.id === playlistId);
    if (pl) {
      title = pl.name;
      description = pl.description || 'Custom Playlist';
      coverArt = pl.coverUrl;
      const idSet = new Set(pl.trackIds || []);
      displayTracks = tracks.filter((t) => idSet.has(t.id));
    }
  }

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isPlaylistActive =
    currentTrack && displayTracks.some((t) => t.id === currentTrack.id);

  return (
    <div className="spotify-scroll-area" style={{ padding: 0 }}>
      {/* Hero Banner with Dominant Gradient */}
      <div
        style={{
          background: bannerGradient,
          padding: '40px 32px 24px 32px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 28,
        }}
      >
        {coverArt ? (
          <img
            src={coverArt}
            alt={title}
            style={{ width: 192, height: 192, borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.6)', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: 192,
              height: 192,
              borderRadius: 8,
              background: playlistId === 'liked' ? 'linear-gradient(135deg, #450af5, #c4efd9)' : '#282828',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            }}
          >
            {playlistId === 'liked' ? (
              <Heart size={64} fill="#ffffff" color="#ffffff" />
            ) : playlistId === 'downloaded' ? (
              <HardDriveDownload size={64} color="#ffffff" />
            ) : (
              <Disc3 size={64} color="#727272" />
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            Playlist
          </span>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 900, letterSpacing: -1, lineHeight: 1.1 }}>
            {title}
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>{description}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#ffffff', fontWeight: 600 }}>
            <span>Spotify Local</span>
            <span>•</span>
            <span>{displayTracks.length} {displayTracks.length === 1 ? 'song' : 'songs'}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '24px 32px' }}>
        <button
          className="quick-card-play-btn"
          style={{
            width: 56,
            height: 56,
            opacity: 1,
            transform: 'none',
            boxShadow: '0 8px 24px rgba(30, 215, 96, 0.4)',
          }}
          onClick={() => {
            if (isPlaylistActive && isPlaying) {
              onTogglePlay();
            } else if (displayTracks.length > 0) {
              onPlayTrack(displayTracks[0]);
            }
          }}
          title="Play"
        >
          {isPlaylistActive && isPlaying ? (
            <Pause size={26} fill="#000000" />
          ) : (
            <Play size={26} fill="#000000" style={{ marginLeft: 3 }} />
          )}
        </button>

        <button
          className="control-btn"
          title="Shuffle playlist"
          onClick={() => {
            if (displayTracks.length > 0) {
              const randomIndex = Math.floor(Math.random() * displayTracks.length);
              onPlayTrack(displayTracks[randomIndex]);
            }
          }}
        >
          <Shuffle size={24} />
        </button>
      </div>

      {/* Tracks Table */}
      <div style={{ padding: '0 32px 40px 32px' }}>
        {displayTracks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#b3b3b3' }}>
            <p style={{ fontSize: 16, marginBottom: 12 }}>No songs found in this playlist.</p>
            <p style={{ fontSize: 13 }}>Use the Download & Ingest tab to add your favorite music or podcasts.</p>
          </div>
        ) : (
          <table className="track-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th>Title</th>
                <th>Album</th>
                <th>Quality</th>
                <th style={{ textAlign: 'right', width: 80 }}>
                  <Clock size={16} />
                </th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {displayTracks.map((track, index) => {
                const isCurrent = currentTrack?.id === track.id;
                const isTrackLiked = likedIds.has(track.id);

                return (
                  <tr
                    key={track.id}
                    className={`track-table-row ${isCurrent ? 'active' : ''}`}
                    onClick={() => onPlayTrack(track)}
                  >
                    <td className="track-table-index">
                      {isCurrent && isPlaying ? (
                        <div className="animated-bars">
                          <div className="eq-bar" />
                          <div className="eq-bar" />
                          <div className="eq-bar" />
                          <div className="eq-bar" />
                        </div>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </td>

                    <td>
                      <div className="track-table-main">
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="track-table-cover"
                        />
                        <div className="track-table-title-col">
                          <span className="track-table-title">{track.title}</span>
                          <span className="track-table-artist">{track.artist}</span>
                        </div>
                      </div>
                    </td>

                    <td style={{ color: '#b3b3b3' }}>{track.album || 'Single'}</td>

                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#1ed760',
                          background: 'rgba(30, 215, 96, 0.1)',
                          padding: '2px 8px',
                          borderRadius: 12,
                        }}
                      >
                        {track.bitrate || 'Original'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right', color: '#b3b3b3' }}>
                      {formatTime(track.duration)}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          className="sidebar-icon-btn"
                          style={{ padding: 4 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLike(track.id);
                          }}
                        >
                          <Heart
                            size={16}
                            fill={isTrackLiked ? '#1ed760' : 'none'}
                            color={isTrackLiked ? '#1ed760' : '#b3b3b3'}
                          />
                        </button>
                        <button
                          className="sidebar-icon-btn"
                          style={{ padding: 4 }}
                          title="Delete from Library"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete "${track.title}" from library?`)) {
                              onDeleteTrack(track.id);
                            }
                          }}
                        >
                          <Trash2 size={16} color="#727272" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
