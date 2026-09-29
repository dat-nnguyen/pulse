import React from 'react';
import { Play, Podcast, Music, Sparkles } from 'lucide-react';

const GENRE_CARDS = [
  { title: 'Podcasts', color: '#e13300', img: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300&auto=format&fit=crop&q=80' },
  { title: 'Made For You', color: '#1e3264', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80' },
  { title: 'Hip-Hop', color: '#ba5d07', img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80' },
  { title: 'Chill & Lo-Fi', color: '#503750', img: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&auto=format&fit=crop&q=80' },
  { title: 'Electronic', color: '#d84000', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80' },
  { title: 'Rock', color: '#e91429', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80' },
  { title: 'Acoustic & Folk', color: '#777777', img: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=300&auto=format&fit=crop&q=80' },
  { title: 'Focus & Study', color: '#477d95', img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80' },
  { title: 'Sleep & Ambient', color: '#1e3c72', img: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&auto=format&fit=crop&q=80' },
  { title: 'Workout', color: '#148a08', img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300&auto=format&fit=crop&q=80' },
];

export default function SearchView({
  searchQuery,
  tracks = [],
  onPlayTrack,
  onOpenDownloader,
  onSelectPodcast,
}) {
  const query = searchQuery.trim().toLowerCase();

  const filteredTracks = query
    ? tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          (t.album && t.album.toLowerCase().includes(query))
      )
    : [];

  const topResult = filteredTracks[0];

  return (
    <div className="spotify-scroll-area">
      {query ? (
        <div style={{ marginTop: 20 }}>
          {filteredTracks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                No results found for "{searchQuery}"
              </h2>
              <p style={{ color: '#b3b3b3', fontSize: 14, maxWidth: 440, margin: '0 auto 20px auto' }}>
                You can download this track or podcast directly from YouTube, SoundCloud, or RSS feeds.
              </p>
              <button
                className="action-pill-btn"
                style={{ background: '#1ed760', color: '#000', margin: '0 auto' }}
                onClick={() => onOpenDownloader(searchQuery)}
              >
                <Sparkles size={16} />
                <span>Search & Download "{searchQuery}"</span>
              </button>
            </div>
          ) : (
            <div>
              {/* Top Result + Songs side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 32 }}>
                {topResult && (
                  <div>
                    <h3 className="section-title" style={{ fontSize: 20, marginBottom: 16 }}>Top result</h3>
                    <div
                      className="media-card"
                      style={{ padding: 20, background: '#181818', position: 'relative' }}
                      onClick={() => onPlayTrack(topResult)}
                    >
                      <img
                        src={topResult.coverUrl}
                        alt={topResult.title}
                        style={{ width: 92, height: 92, borderRadius: 6, marginBottom: 16, objectFit: 'cover' }}
                      />
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', marginBottom: 6 }}>
                        {topResult.title}
                      </div>
                      <div style={{ fontSize: 14, color: '#b3b3b3', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{topResult.artist}</span>
                        <span style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '2px 8px', borderRadius: 10, fontSize: 11, color: '#fff' }}>
                          Song
                        </span>
                      </div>
                      <button
                        className="quick-card-play-btn"
                        style={{ position: 'absolute', right: 20, bottom: 20, opacity: 1, transform: 'none' }}
                        title="Play"
                      >
                        <Play size={22} fill="#000000" style={{ marginLeft: 2 }} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Matching Songs list */}
                <div>
                  <h3 className="section-title" style={{ fontSize: 20, marginBottom: 16 }}>Songs</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filteredTracks.slice(0, 5).map((track) => (
                      <div
                        key={track.id}
                        className="track-table-row"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}
                        onClick={() => onPlayTrack(track)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img src={track.coverUrl} alt={track.title} style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{track.title}</div>
                            <div style={{ fontSize: 12, color: '#b3b3b3' }}>{track.artist}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 12, color: '#b3b3b3' }}>{track.bitrate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty Query: Browse All Category Cards */
        <div style={{ marginTop: 24 }}>
          <h2 className="section-title" style={{ marginBottom: 20 }}>Browse all</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            {GENRE_CARDS.map((card) => (
              <div
                key={card.title}
                style={{
                  backgroundColor: card.color,
                  borderRadius: 8,
                  padding: 16,
                  height: 140,
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                }}
                onClick={() => onOpenDownloader(card.title)}
              >
                <span style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', letterSpacing: -0.5 }}>
                  {card.title}
                </span>
                <img
                  src={card.img}
                  alt={card.title}
                  style={{
                    position: 'absolute',
                    right: -10,
                    bottom: -10,
                    width: 80,
                    height: 80,
                    objectFit: 'cover',
                    transform: 'rotate(25deg)',
                    borderRadius: 4,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
