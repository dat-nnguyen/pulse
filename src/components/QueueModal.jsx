import React from 'react';
import { X, ListMusic, Trash2 } from 'lucide-react';

export default function QueueModal({
  isOpen,
  onClose,
  currentTrack,
  queue = [],
  onPlayTrack,
  onRemoveFromQueue,
  onClearQueue,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-surface" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ListMusic size={20} color="var(--pulse-accent)" />
            <h2 className="modal-title">Queue</h2>
          </div>
          <button className="aura-circle-btn" onClick={onClose} style={{ width: 30, height: 30 }}>
            <X size={16} />
          </button>
        </div>

        {/* Now Playing */}
        {currentTrack && (
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Now Playing
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--pulse-bg-raised)',
                border: '1px solid var(--border-subtle)',
                padding: 10,
                borderRadius: 8,
                marginTop: 6,
              }}
            >
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--pulse-accent)' }}>
                  {currentTrack.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{currentTrack.artist}</div>
              </div>
            </div>
          </div>
        )}

        {/* Next In Queue */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Next Up ({queue.length})
          </span>
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {queue.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              Queue is empty. Play a song to start.
            </p>
          ) : (
            queue.map((track, idx) => (
              <div
                key={`${track.id}_${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.03)',
                  transition: 'background 0.15s',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, minWidth: 0 }}
                  onClick={() => onPlayTrack(track)}
                >
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{track.artist}</div>
                  </div>
                </div>

                <button
                  className="aura-circle-btn"
                  style={{ width: 28, height: 28 }}
                  onClick={() => onRemoveFromQueue(idx)}
                  title="Remove from queue"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
