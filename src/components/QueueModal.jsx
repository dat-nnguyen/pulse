import React from 'react';
import { X, ListMusic, Trash2, Play } from 'lucide-react';

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
            <ListMusic size={22} color="#1ed760" />
            <h2 className="modal-title">Playback Queue</h2>
          </div>
          <button className="top-bar-circle-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Now Playing */}
        {currentTrack && (
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Now Playing
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#181818',
                padding: 12,
                borderRadius: 8,
                marginTop: 8,
              }}
            >
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                style={{ width: 48, height: 48, borderRadius: 4, objectFit: 'cover' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1ed760' }}>
                  {currentTrack.title}
                </div>
                <div style={{ fontSize: 12, color: '#b3b3b3' }}>{currentTrack.artist}</div>
              </div>
            </div>
          </div>
        )}

        {/* Next In Queue */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Next Up ({queue.length})
          </span>
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#b3b3b3',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Clear queue
            </button>
          )}
        </div>

        <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {queue.length === 0 ? (
            <p style={{ color: '#727272', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
              Queue is empty. Select any song or playlist to enqueue next tracks.
            </p>
          ) : (
            queue.map((track, idx) => (
              <div
                key={`${track.id}_${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}
                  onClick={() => onPlayTrack(track)}
                >
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>{track.title}</div>
                    <div style={{ fontSize: 11, color: '#b3b3b3' }}>{track.artist}</div>
                  </div>
                </div>

                <button
                  className="sidebar-icon-btn"
                  onClick={() => onRemoveFromQueue(idx)}
                  title="Remove from queue"
                >
                  <Trash2 size={15} color="#727272" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
