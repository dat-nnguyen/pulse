import React, { useEffect, useRef } from 'react';
import { X, Mic2 } from 'lucide-react';

export default function LyricsView({
  currentTrack,
  currentTime,
  onSeek,
  onClose,
}) {
  const activeLineRef = useRef(null);
  const containerRef = useRef(null);

  // Parse LRC synced lyrics
  const parsedLyrics = React.useMemo(() => {
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
  }, [currentTrack]);

  // Find active line
  let activeIndex = -1;
  for (let i = 0; i < parsedLyrics.length; i++) {
    if (parsedLyrics[i].time !== null && currentTime >= parsedLyrics[i].time) {
      activeIndex = i;
    }
  }

  // Smooth auto-scroll to active line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className="spotify-scroll-area"
      style={{
        background: 'linear-gradient(180deg, #1e3264 0%, #121212 100%)',
        padding: '32px 24px',
        position: 'relative',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Mic2 size={24} color="#ffffff" />
          <span style={{ fontSize: 20, fontWeight: 800 }}>Lyrics</span>
        </div>
        <button
          className="top-bar-circle-btn"
          onClick={onClose}
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          <X size={20} />
        </button>
      </div>

      {parsedLyrics.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#b3b3b3' }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>No synchronized lyrics available for this track.</p>
          <p style={{ fontSize: 14 }}>Enjoy the instrumental master in original quality.</p>
        </div>
      ) : (
        <div className="lyrics-container">
          {parsedLyrics.map((item, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;

            return (
              <div
                key={idx}
                ref={isActive ? activeLineRef : null}
                className={`lyric-line ${isActive ? 'active' : isPast ? 'past' : ''}`}
                onClick={() => {
                  if (item.time !== null) onSeek(item.time);
                }}
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
