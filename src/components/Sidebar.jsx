import React from 'react';
import {
  Compass,
  Search,
  Library,
  Plus,
  Heart,
  CloudDownload,
  Sliders,
  Share2,
  HardDriveDownload,
  Disc3,
  Waves,
  Database
} from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

export default function Sidebar({
  currentView,
  setCurrentView,
  playlists = [],
  likedCount = 0,
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
            <Waves size={20} color="#ffffff" />
          </div>
          <div>
            <div className="aura-brand-name">AURA</div>
            <div className="aura-brand-tag">Lossless Audio</div>
          </div>
        </div>

        <nav className="aura-nav-list">
          <button
            className={`aura-nav-btn ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('home');
              setSelectedPlaylistId(null);
            }}
          >
            <Compass size={20} />
            <span>Discover</span>
          </button>

          <button
            className={`aura-nav-btn ${currentView === 'search' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('search');
              setSelectedPlaylistId(null);
            }}
          >
            <Search size={20} />
            <span>Search</span>
          </button>

          <button
            className={`aura-nav-btn ${currentView === 'downloader' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('downloader');
              setSelectedPlaylistId(null);
            }}
          >
            <CloudDownload size={20} />
            <span>Add Audio & Shows</span>
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
            }}
            onClick={() => {
              setCurrentView('library');
              setSelectedPlaylistId(null);
            }}
          >
            <Library size={18} color="#00f2fe" />
            <span className="aura-shelf-title">Your Collection</span>
          </button>

          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="aura-circle-btn"
              style={{ width: 28, height: 28 }}
              title="Create Playlist"
              onClick={onCreatePlaylist}
            >
              <Plus size={16} />
            </button>
            <button
              className="aura-circle-btn"
              style={{ width: 28, height: 28 }}
              title="Equalizer & Visualizer"
              onClick={onOpenEqualizer}
            >
              <Sliders size={14} />
            </button>
            <button
              className="aura-circle-btn"
              style={{ width: 28, height: 28, position: 'relative' }}
              title={isCloudConnected ? "Supabase Cloud: Connected" : "Supabase Cloud Sync"}
              onClick={onOpenSupabase}
            >
              <Database size={13} color={isCloudConnected ? "#00d2df" : "inherit"} />
              {isCloudConnected && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: '#00d2df',
                  }}
                />
              )}
            </button>
            <button
              className="aura-circle-btn"
              style={{ width: 28, height: 28 }}
              title="Share Player"
              onClick={onOpenShare}
            >
              <Share2 size={14} />
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
            className={`aura-chip ${activeFilter === 'podcasts' ? 'active' : ''}`}
            onClick={() => setActiveFilter('podcasts')}
          >
            Podcasts
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
                  background: 'linear-gradient(135deg, #7f00ff, #f43f5e)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Heart size={18} fill="#ffffff" color="#ffffff" />
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
                  background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <HardDriveDownload size={18} color="#ffffff" />
              </div>
              <div className="aura-item-info">
                <span className="aura-item-title">Offline Cache</span>
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
                    background: '#1a2438',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Disc3 size={18} color="#94a3b8" />
                </div>
              )}
              <div className="aura-item-info">
                <span className="aura-item-title">{pl.name}</span>
                <span className="aura-item-meta">{pl.trackIds?.length || 0} tracks</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
