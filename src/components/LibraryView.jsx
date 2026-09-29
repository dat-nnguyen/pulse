import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Heart,
  Clock,
  HardDriveDownload,
  Trash2,
  Sparkles,
  Disc3,
  Shuffle,
  Search,
  ChevronLeft,
  Music,
  Plus
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
  onBack,
  onOpenDownloader,
}) {
  const [playlistFilter, setPlaylistFilter] = useState('');

  // Determine tracks to display based on selected playlist
  let title = 'Your Library';
  let description = 'All lossless and offline tracks';
  let bannerGradient = 'linear-gradient(180deg, #18202f 0%, #0b0e14 100%)';
  let coverArt = null;
  let rawTracks = tracks;

  if (playlistId === 'liked') {
    title = 'Favorites';
    description = 'Your favorite songs saved to your library';
    bannerGradient = 'linear-gradient(180deg, #3b114d 0%, #0b0e14 100%)';
    rawTracks = tracks.filter((t) => likedIds.has(t.id));
  } else if (playlistId === 'downloaded') {
    title = 'Offline Storage';
    description = 'Saved locally to device storage • Lossless & 320kbps Original';
    bannerGradient = 'linear-gradient(180deg, #0c2b3d 0%, #0b0e14 100%)';
    rawTracks = tracks.filter((t) => t.isDownloaded);
  } else if (playlistId && playlistId !== 'all') {
    const pl = playlists.find((p) => p.id === playlistId);
    if (pl) {
      title = pl.name;
      description = pl.description || 'Custom playlist';
      coverArt = pl.coverUrl;
      const idSet = new Set(pl.trackIds || []);
      rawTracks = tracks.filter((t) => idSet.has(t.id));
    }
  }

  // In-playlist search filter
  const displayTracks = useMemo(() => {
    if (!playlistFilter.trim()) return rawTracks;
    const q = playlistFilter.toLowerCase().trim();
    return rawTracks.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.artist?.toLowerCase().includes(q) ||
        t.album?.toLowerCase().includes(q)
    );
  }, [rawTracks, playlistFilter]);

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isPlaylistActive =
    currentTrack && displayTracks.some((t) => t.id === currentTrack.id);

  return (
    <div className="aura-scroll-area" style={{ padding: 0 }}>
      {/* Hero Banner */}
      <div
        className="pulse-playlist-hero"
        style={{
          background: bannerGradient,
          position: 'relative',
        }}
      >

        {coverArt ? (
          <img
            src={coverArt}
            alt={title}
            className="pulse-hero-art"
          />
        ) : (
          <div
            className="pulse-hero-art"
            style={{
              borderRadius: 12,
              background:
                playlistId === 'liked'
                  ? 'linear-gradient(135deg, #7f00ff, #e11d48)'
                  : playlistId === 'downloaded'
                  ? 'linear-gradient(135deg, #0284c7, #0d9488)'
                  : 'linear-gradient(135deg, #1e293b, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {playlistId === 'liked' ? (
              <Heart size={48} fill="#ffffff" color="#ffffff" />
            ) : playlistId === 'downloaded' ? (
              <HardDriveDownload size={48} color="#ffffff" />
            ) : (
              <Disc3 size={48} color="#64748b" />
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--pulse-accent)' }}>
            Playlist
          </span>
          <h1
            style={{
              fontSize: 'clamp(26px, 4.5vw, 46px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '2px 0',
              color: '#f8fafc',
            }}
          >
            {title}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 13.5, margin: 0 }}>{description}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#e2e8f0', marginTop: 4 }}>
            <span>Pulse Audio</span>
            <span>•</span>
            <span>{rawTracks.length} {rawTracks.length === 1 ? 'track' : 'tracks'}</span>
          </div>
        </div>
      </div>

      {/* Action Row & In-Playlist Search */}
      <div className="pulse-playlist-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Main Play/Pause Button */}
          <button
            className="aura-btn-primary"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => {
              if (isPlaylistActive && isPlaying) {
                onTogglePlay();
              } else if (displayTracks.length > 0) {
                onPlayTrack(displayTracks[0]);
              }
            }}
            title="Play All"
          >
            {isPlaylistActive && isPlaying ? (
              <Pause size={22} fill="#080a10" color="#080a10" />
            ) : (
              <Play size={22} fill="#080a10" color="#080a10" style={{ marginLeft: 2 }} />
            )}
          </button>

          {/* Shuffle Button */}
          <button
            className="aura-circle-btn"
            title="Shuffle playlist"
            onClick={() => {
              if (displayTracks.length > 0) {
                const randomIndex = Math.floor(Math.random() * displayTracks.length);
                onPlayTrack(displayTracks[randomIndex]);
              }
            }}
          >
            <Shuffle size={18} />
          </button>
        </div>

        {/* IN-PLAYLIST SEARCH BAR (Fast Filter) */}
        <div className="pulse-playlist-search">
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search within playlist..."
            value={playlistFilter}
            onChange={(e) => setPlaylistFilter(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: 13,
              width: '100%',
            }}
          />
          {playlistFilter && (
            <button
              onClick={() => setPlaylistFilter('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 12,
                padding: 0,
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Tracks Table */}
      <div style={{ padding: '8px 32px 40px 32px' }}>
        {displayTracks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <p style={{ fontSize: 16, marginBottom: 8, color: '#f8fafc' }}>
              {playlistFilter ? 'No matching tracks found in this playlist.' : 'This playlist is empty.'}
            </p>
            {onOpenDownloader && !playlistFilter && (
              <button
                className="aura-btn-primary"
                onClick={onOpenDownloader}
                style={{ marginTop: 12, fontSize: 13 }}
              >
                <Plus size={16} />
                <span>Import Music</span>
              </button>
            )}
          </div>
        ) : (
          <table className="track-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th>Title</th>
                <th>Album</th>
                <th>Bitrate</th>
                <th style={{ textAlign: 'right', width: 75 }}>
                  <Clock size={14} />
                </th>
                <th style={{ width: 85, textAlign: 'right' }}></th>
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
                        </div>
                      ) : (
                        <span className="index-number">{index + 1}</span>
                      )}
                    </td>

                    <td>
                      <div className="track-primary-cell">
                        {track.coverUrl ? (
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="track-cell-thumb"
                          />
                        ) : (
                          <div
                            className="track-cell-thumb"
                            style={{
                              background: '#151d2c',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Music size={16} color="#64748b" />
                          </div>
                        )}
                        <div className="track-cell-info">
                          <div
                            className="track-cell-title"
                            style={{ color: isCurrent ? 'var(--pulse-accent)' : 'inherit' }}
                          >
                            {track.title}
                          </div>
                          <div className="track-cell-artist">{track.artist}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ color: '#94a3b8', fontSize: 13 }}>
                      {track.album || 'Single'}
                    </td>

                    <td>
                      <span className="aura-badge-lossless" style={{ fontSize: 10, padding: '2px 8px' }}>
                        <Sparkles size={10} />
                        <span>{track.bitrate || '320K'}</span>
                      </span>
                    </td>

                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: 13, fontVariantNumeric: 'tabular-nums', paddingRight: 16 }}>
                      {formatTime(track.duration)}
                    </td>

                    <td style={{ paddingRight: 16, textAlign: 'right' }}>
                      <div
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className={`aura-control-btn track-like-btn ${isTrackLiked ? 'active' : ''}`}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isTrackLiked ? 'rgba(244, 63, 94, 0.12)' : 'transparent',
                            border: isTrackLiked ? '1px solid rgba(244, 63, 94, 0.3)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onClick={() => onToggleLike(track.id)}
                          title={isTrackLiked ? 'Remove from Favorites' : 'Add to Favorites'}
                        >
                          <Heart
                            size={16}
                            fill={isTrackLiked ? '#f43f5e' : 'none'}
                            color={isTrackLiked ? '#f43f5e' : '#94a3b8'}
                          />
                        </button>
                        {onDeleteTrack && (
                          <button
                            className="aura-control-btn track-delete-btn"
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              transition: 'all 0.15s ease',
                            }}
                            onClick={() => {
                              if (window.confirm(`Delete "${track.title}" from library?`)) {
                                onDeleteTrack(track.id);
                              }
                            }}
                            title="Delete track"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
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
