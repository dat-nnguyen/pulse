import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  Download,
  Share2,
  Sliders
} from 'lucide-react';

export default function TopBar({
  currentView,
  searchQuery,
  setSearchQuery,
  onOpenShare,
  onOpenEqualizer,
  currentTrack,
  onOpenDownloader,
  canGoBack,
  onGoBack,
}) {
  return (
    <header className="aura-top-bar">
      {/* Navigation history arrows */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="aura-circle-btn"
          disabled={!canGoBack}
          onClick={onGoBack}
          title="Go back"
        >
          <ChevronLeft size={18} />
        </button>
        <button className="aura-circle-btn" disabled title="Go forward">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Omnibox Search Bar */}
      <div className="aura-search-bar">
        <Search size={16} className="aura-search-icon" />
        <input
          type="text"
          className="aura-search-input"
          placeholder="Search tracks, artists, or audio streams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Audio Quality indicator */}
        <div className="aura-badge-lossless" title="Playing original uncompressed / 320kbps audio">
          <Sparkles size={12} />
          <span>{currentTrack?.bitrate || '320K LOSSLESS'}</span>
        </div>

        <button
          className="aura-btn-primary"
          onClick={onOpenDownloader}
          title="Download new music & podcasts"
        >
          <Download size={15} />
          <span>Add Audio</span>
        </button>

        <button
          className="aura-circle-btn"
          onClick={onOpenEqualizer}
          title="Audio Equalizer & Visualizer"
        >
          <Sliders size={16} />
        </button>

        <button
          className="aura-circle-btn"
          onClick={onOpenShare}
          title="Share Aura Lounge"
        >
          <Share2 size={16} />
        </button>
      </div>
    </header>
  );
}
