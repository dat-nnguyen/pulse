import React, { useEffect, useRef } from 'react';
import {
  Play,
  Heart,
  ListPlus,
  Trash2,
  ListX,
  Disc3,
  Plus,
} from 'lucide-react';

/**
 * Right-click context menu for tracks.
 *
 * Props:
 *   x, y          – pixel position on screen
 *   track         – the track object
 *   playlists     – all user playlists (for "Add to Playlist" submenu)
 *   playlistId    – currently viewed playlist id (null if not in a playlist)
 *   isLiked       – boolean
 *   onClose       – close the menu
 *   onPlay        – play this track
 *   onToggleLike  – toggle like
 *   onAddToPlaylist(trackId, playlistId) – add track to playlist
 *   onRemoveFromPlaylist(trackId, playlistId) – remove from current playlist only
 *   onDeleteFromLibrary(trackId) – delete from entire library
 */
export default function TrackContextMenu({
  x,
  y,
  track,
  playlists = [],
  playlistId,
  isLiked,
  onClose,
  onPlay,
  onToggleLike,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onDeleteFromLibrary,
}) {
  const menuRef = useRef(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Keep menu inside viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) menuRef.current.style.left = `${vw - rect.width - 8}px`;
    if (rect.bottom > vh) menuRef.current.style.top = `${vh - rect.height - 8}px`;
  }, [x, y]);

  const isInPlaylist =
    playlistId &&
    playlistId !== 'liked' &&
    playlistId !== 'downloaded' &&
    playlistId !== 'all';

  // User playlists the track is NOT already in
  const addablePlaylists = playlists.filter(
    (pl) => !pl.trackIds?.includes(track.id)
  );

  const menuItem = (icon, label, onClick, variant = 'normal') => (
    <button
      key={label}
      onClick={(e) => { e.stopPropagation(); onClick(); onClose(); }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: variant === 'danger'
          ? 'var(--pulse-danger)'
          : variant === 'success'
          ? 'var(--pulse-accent)'
          : 'var(--text-primary)',
        fontSize: 13,
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        textAlign: 'left',
        borderRadius: 6,
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--pulse-surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      {label}
    </button>
  );

  const divider = (key) => (
    <div key={key} style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 10px' }} />
  );

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 9000,
        background: 'var(--pulse-surface)',
        border: '1px solid var(--border-medium)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)',
        padding: '6px 4px',
        minWidth: 220,
        maxWidth: 280,
        animation: 'contextMenuIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Track info header */}
      <div
        style={{
          padding: '6px 12px 10px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 4,
        }}
      >
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {track.title}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {track.artist || 'Unknown Artist'}
        </div>
      </div>

      {/* Play */}
      {menuItem(<Play size={15} />, 'Play now', onPlay, 'success')}

      {/* Like / Unlike */}
      {menuItem(
        <Heart size={15} fill={isLiked ? '#f43f5e' : 'none'} color={isLiked ? '#f43f5e' : 'currentColor'} />,
        isLiked ? 'Remove from Favorites' : 'Add to Favorites',
        onToggleLike
      )}

      {divider('d1')}

      {/* Add to playlist submenu */}
      <div style={{ padding: '2px 0' }}>
        <div
          style={{
            padding: '4px 12px',
            fontSize: 10.5,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Add to Playlist
        </div>

        {addablePlaylists.length === 0 ? (
          <div
            style={{
              padding: '6px 12px',
              fontSize: 12,
              color: 'var(--text-muted)',
              fontStyle: 'italic',
            }}
          >
            Already in all playlists
          </div>
        ) : (
          addablePlaylists.map((pl) =>
            menuItem(
              pl.coverUrl
                ? <img src={pl.coverUrl} alt={pl.name} style={{ width: 16, height: 16, borderRadius: 4, objectFit: 'cover' }} />
                : <Disc3 size={15} color="var(--pulse-accent)" />,
              pl.name,
              () => onAddToPlaylist(track.id, pl.id)
            )
          )
        )}

        {/* New playlist shortcut */}
        {menuItem(
          <Plus size={15} />,
          'New playlist…',
          () => onAddToPlaylist(track.id, '__new__')
        )}
      </div>

      {divider('d2')}

      {/* Context-sensitive remove/delete */}
      {isInPlaylist
        ? menuItem(
            <ListX size={15} />,
            'Remove from this playlist',
            () => onRemoveFromPlaylist(track.id, playlistId),
            'danger'
          )
        : null}

      {menuItem(
        <Trash2 size={15} />,
        'Delete from library',
        () => onDeleteFromLibrary(track.id),
        'danger'
      )}
    </div>
  );
}
