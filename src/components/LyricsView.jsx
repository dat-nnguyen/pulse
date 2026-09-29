import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, Mic2, Music, Edit3, Check, Sparkles } from 'lucide-react';
import { saveTrack } from '../services/storageService';

export default function LyricsView({
  currentTrack,
  currentTime,
  onSeek,
  onClose,
  onTrackUpdated,
}) {
  const activeLineRef = useRef(null);
  const containerRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [lyricsInput, setLyricsInput] = useState('');
  const [isAutoScrollDisabled, setIsAutoScrollDisabled] = useState(false);
  const scrollTimeoutRef = useRef(null);

  // Parse LRC synced lyrics
  const parsedLyrics = useMemo(() => {
    if (!currentTrack?.lyrics) return [];
    const lines = currentTrack.lyrics.split('\n');
    const result = [];

    for (const line of lines) {
      const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
      if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const ms = parseInt(match[3].padEnd(3, '0').slice(0, 3), 10);
        const time = mins * 60 + secs + ms / 1000;
        const text = match[4].trim();
        if (text) {
          result.push({ time, text });
        }
      } else if (line.trim()) {
        result.push({ time: null, text: line.trim() });
      }
    }
    return result;
  }, [currentTrack?.lyrics]);

  // Find active line index based on current playback time
  const activeIndex = useMemo(() => {
    if (!parsedLyrics.length) return -1;
    let index = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (parsedLyrics[i].time !== null && currentTime >= parsedLyrics[i].time) {
        index = i;
      }
    }
    return index;
  }, [parsedLyrics, currentTime]);

  // Smooth auto-scroll active lyric line to center of screen (Spotify style)
  useEffect(() => {
    if (isAutoScrollDisabled) return;

    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isAutoScrollDisabled]);

  // Detect manual user scrolling: pause auto-scroll briefly then resume
  const handleScroll = () => {
    setIsAutoScrollDisabled(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsAutoScrollDisabled(false);
    }, 4000);
  };

  const handleSaveLyrics = async () => {
    if (!currentTrack) return;
    const updated = { ...currentTrack, lyrics: lyricsInput.trim() };
    await saveTrack(updated);
    if (onTrackUpdated) onTrackUpdated(updated);
    setIsEditing(false);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="aura-scroll-area"
      style={{
        background: 'linear-gradient(180deg, #101622 0%, #080a10 100%)',
        padding: '24px 20px 80px 20px',
        position: 'relative',
        minHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Sticky Top Header with Track Preview & Close */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 680,
          margin: '0 auto 24px auto',
          position: 'sticky',
          top: 0,
          background: 'rgba(16, 22, 34, 0.85)',
          backdropFilter: 'blur(16px)',
          padding: '12px 16px',
          borderRadius: 12,
          border: '1px solid var(--border-subtle)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {currentTrack?.coverUrl ? (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 8,
                background: '#151d2c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Music size={18} color="#00d2df" />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#f8fafc',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentTrack?.title || 'No Track Playing'}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#94a3b8',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentTrack?.artist || 'Unknown Artist'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="aura-circle-btn"
            style={{ width: 34, height: 34 }}
            onClick={() => {
              setLyricsInput(currentTrack?.lyrics || '');
              setIsEditing(!isEditing);
            }}
            title={isEditing ? 'Cancel Editing' : 'Add or Edit Lyrics'}
          >
            <Edit3 size={15} />
          </button>

          <button
            className="aura-circle-btn"
            style={{ width: 34, height: 34 }}
            onClick={onClose}
            title="Close Lyrics"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Editor Drawer if user wants to add/edit LRC lyrics */}
      {isEditing && (
        <div
          style={{
            maxWidth: 680,
            margin: '0 auto 28px auto',
            background: 'var(--aura-bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>
            Edit Lyrics / LRC Synced Text
          </div>
          <div style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 12 }}>
            Paste synced LRC lyrics (e.g. <code>[00:15.30] Line lyrics</code>) or plain text. Synced lyrics will automatically highlight in real-time.
          </div>
          <textarea
            rows={8}
            value={lyricsInput}
            onChange={(e) => setLyricsInput(e.target.value)}
            placeholder="[00:12.50] First verse line&#10;[00:16.80] Second verse line..."
            style={{
              width: '100%',
              background: '#090c12',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: 12,
              color: '#f8fafc',
              fontSize: 13,
              fontFamily: 'monospace',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button
              className="aura-btn-secondary"
              onClick={() => setIsEditing(false)}
              style={{ fontSize: 12.5 }}
            >
              Cancel
            </button>
            <button
              className="aura-btn-primary"
              onClick={handleSaveLyrics}
              style={{ fontSize: 12.5 }}
            >
              <Check size={14} />
              <span>Save & Sync Lyrics</span>
            </button>
          </div>
        </div>
      )}

      {/* Spotify-style Lyrics Container */}
      {parsedLyrics.length === 0 ? (
        <div
          style={{
            maxWidth: 520,
            margin: '80px auto',
            textAlign: 'center',
            padding: '36px 20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 16,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Mic2 size={36} color="#00d2df" style={{ margin: '0 auto 16px auto', display: 'block' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: '0 0 8px 0' }}>
            No lyrics available for this track
          </h3>
          <p style={{ fontSize: 13.5, color: '#94a3b8', margin: '0 0 20px 0', lineHeight: 1.5 }}>
            You can paste synchronized LRC lyrics or plain text to enjoy real-time karaoke tracking.
          </p>
          <button
            className="aura-btn-primary"
            onClick={() => {
              setLyricsInput('');
              setIsEditing(true);
            }}
            style={{ fontSize: 13 }}
          >
            <Edit3 size={15} />
            <span>Add Lyrics</span>
          </button>
        </div>
      ) : (
        <div className="spotify-lyrics-stream">
          {parsedLyrics.map((item, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;

            return (
              <div
                key={idx}
                ref={isActive ? activeLineRef : null}
                className={`spotify-lyric-line ${isActive ? 'active' : isPast ? 'past' : 'future'}`}
                onClick={() => {
                  if (item.time !== null) {
                    onSeek(item.time);
                  }
                }}
                title={item.time !== null ? 'Click to jump to this line' : undefined}
              >
                {item.text}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
