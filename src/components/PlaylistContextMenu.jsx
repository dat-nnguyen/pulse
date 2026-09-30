import React, { useEffect, useRef } from 'react';
import {
  Play,
  Trash2,
  FolderOpen,
  Disc3,
} from 'lucide-react';

/**
 * Right-click context menu for playlists.
 *
 * Props:
 *   x, y       – screen pixel coordinates
 *   playlist   – playlist object { id, name, description, coverUrl, trackIds }
 *   onClose    – close callback
 *   onOpen     – open playlist callback
 *   onPlay     – play all tracks callback
 *   onDelete   – delete playlist callback
 */
export default function PlaylistContextMenu({
  x,
  y,
  playlist,
  onClose,
  onOpen,
  onPlay,
  onDelete,
}) {
  const menuRef = useRef(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Keep menu inside viewport boundaries
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) menuRef.current.style.left = `${vw - rect.width - 8}px`;
    if (rect.bottom > vh) menuRef.current.style.top = `${vh - rect.height - 8}px`;
  }, [x, y]);

  if (!playlist) return null;

  const menuItem = (icon, label, onClick, variant = 'normal') => (
    <button
      key={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
        onClose();
      }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color:
          variant === 'danger'
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
      <span>{label}</span>
    </button>
  );

  const divider = (key) => (
    <div key={key} style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 10px' }} />
  );

  const trackCount = playlist.trackIds?.length || 0;

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
        minWidth: 200,
        maxWidth: 260,
        animation: 'contextMenuIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Playlist header info */}
      <div
        style={{
          padding: '6px 12px 10px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Disc3 size={16} color="var(--pulse-accent)" />
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
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
            {playlist.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
          </div>
        </div>
      </div>

      {/* Open */}
      {onOpen && menuItem(<FolderOpen size={15} />, 'Open playlist', onOpen)}

      {/* Play all tracks */}
      {onPlay && trackCount > 0 && menuItem(<Play size={15} />, 'Play all', onPlay, 'success')}

      {divider('d1')}

      {/* Delete / Remove Playlist */}
      {menuItem(<Trash2 size={15} />, 'Delete playlist', onDelete, 'danger')}
    </div>
  );
}
