import React from 'react';
import {
  Library,
  Plus,
  Heart,
  CloudDownload,
  Sliders,
  Share2,
  HardDriveDownload,
  Disc3,
  Activity,
  Database,
  User,
  LogIn
} from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

export default function Sidebar({
  currentView,
  setCurrentView,
  playlists = [],
  likedCount = 0,
  user,
  onOpenAuth,
  onCreatePlaylist,
  onOpenEqualizer,
  onOpenShare,
  onOpenSupabase,
  activeFilter,
  setActiveFilter,
  selectedPlaylistId,
  setSelectedPlaylistId,
}) {
  const isCloudConnected = isSupabaseConfigured();

  return (
    <aside className="aura-sidebar">
      {/* Brand & Main Navigation Card */}
      <div className="aura-glass-card">
        <div className="aura-brand-header">
          <div className="aura-logo-icon">
            <Activity size={20} color="var(--pulse-accent)" />
          </div>
          <div>
            <div className="aura-brand-name">PULSE</div>
            <div className="aura-brand-tag">Personal Audio</div>
          </div>
        </div>

        <nav className="aura-nav-list">
          <button
            className={`aura-nav-btn ${currentView === 'home' && !selectedPlaylistId ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('home');
              setSelectedPlaylistId(null);
            }}
          >
            <Library size={19} />
            <span>Playlists</span>
          </button>

          <button
            className={`aura-nav-btn ${currentView === 'downloader' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('downloader');
              setSelectedPlaylistId(null);
            }}
          >
            <CloudDownload size={19} />
            <span>Add Audio</span>
          </button>
        </nav>
      </div>

      {/* Library Shelf Card */}
      <div className="aura-glass-card aura-library-shelf">
        <div className="aura-shelf-header">
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 0,
            }}
            onClick={() => {
              setCurrentView('home');
              setSelectedPlaylistId(null);
            }}
          >
            <Disc3 size={17} color="var(--pulse-accent)" />
            <span className="aura-shelf-title">Your Playlists</span>
          </button>

          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="aura-circle-btn"
              style={{ width: 28, height: 28 }}
              title="Create Playlist"
              onClick={onCreatePlaylist}
            >
              <Plus size={15} />
            </button>
            <button
              className="aura-circle-btn"
              style={{ width: 28, height: 28 }}
              title="Equalizer & Visualizer"
              onClick={onOpenEqualizer}
            >
              <Sliders size={13} />
            </button>
            <button
              className="aura-circle-btn"
              style={{ width: 28, height: 28, position: 'relative' }}
              title={isCloudConnected ? "Supabase Cloud: Connected" : "Supabase Cloud Sync"}
              onClick={onOpenSupabase}
            >
              <Database size={13} color={isCloudConnected ? "var(--pulse-accent)" : "inherit"} />
              {isCloudConnected && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: 'var(--pulse-accent)',
                  }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="aura-shelf-chips">
          <button
            className={`aura-chip ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          <button
            className={`aura-chip ${activeFilter === 'playlists' ? 'active' : ''}`}
            onClick={() => setActiveFilter('playlists')}
          >
            Playlists
          </button>
          <button
            className={`aura-chip ${activeFilter === 'downloaded' ? 'active' : ''}`}
            onClick={() => setActiveFilter('downloaded')}
          >
            Offline
          </button>
        </div>

        {/* Scrollable list */}
        <div className="aura-library-scroll">
          {/* Liked Songs Special Row */}
          {(activeFilter === 'all' || activeFilter === 'playlists') && (
            <button
              className={`aura-item-row ${selectedPlaylistId === 'liked' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('playlist');
                setSelectedPlaylistId('liked');
              }}
            >
              <div
                className="aura-item-cover"
                style={{
                  background: 'linear-gradient(135deg, #7f00ff, #e11d48)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Heart size={16} fill="#ffffff" color="#ffffff" />
              </div>
              <div className="aura-item-info">
                <span className="aura-item-title">Favorites</span>
                <span className="aura-item-meta">{likedCount} saved tracks</span>
              </div>
            </button>
          )}

          {/* Offline Downloads Special Row */}
          {(activeFilter === 'all' || activeFilter === 'downloaded') && (
            <button
              className={`aura-item-row ${selectedPlaylistId === 'downloaded' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('playlist');
                setSelectedPlaylistId('downloaded');
              }}
            >
              <div
                className="aura-item-cover"
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0d9488)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <HardDriveDownload size={16} color="#ffffff" />
              </div>
              <div className="aura-item-info">
                <span className="aura-item-title">Offline Storage</span>
                <span className="aura-item-meta">Lossless & 320kbps</span>
              </div>
            </button>
          )}

          {/* User Playlists */}
          {playlists.map((pl) => (
            <button
              key={pl.id}
              className={`aura-item-row ${selectedPlaylistId === pl.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('playlist');
                setSelectedPlaylistId(pl.id);
              }}
            >
              {pl.coverUrl ? (
                <img src={pl.coverUrl} alt={pl.name} className="aura-item-cover" />
              ) : (
                <div
                  className="aura-item-cover"
                  style={{
                    background: '#151d2c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Disc3 size={16} color="#94a3b8" />
                </div>
              )}
              <div className="aura-item-info">
                <span className="aura-item-title">{pl.name}</span>
                <span className="aura-item-meta">{pl.trackIds?.length || 0} tracks</span>
              </div>
            </button>
          ))}
        </div>

        {/* Bottom User Sync Status Card */}
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {user ? (
            <button
              onClick={onOpenAuth}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--pulse-accent)',
                  color: 'var(--pulse-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {(user.email || 'U')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email?.split('@')[0]}
                </div>
                <div style={{ fontSize: 10.5, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981' }} />
                  Synced with Phone
                </div>
              </div>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer',
                color: '#94a3b8',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <LogIn size={13} />
              <span>Sign In to Sync</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
