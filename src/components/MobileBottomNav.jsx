import React from 'react';
import { Compass, Search, Library, CloudDownload } from 'lucide-react';

export default function MobileBottomNav({ currentView, setCurrentView }) {
  return (
    <nav className="aura-mobile-nav">
      <button
        className={`aura-mobile-tab ${currentView === 'home' ? 'active' : ''}`}
        onClick={() => setCurrentView('home')}
      >
        <Compass size={22} />
        <span>Discover</span>
      </button>

      <button
        className={`aura-mobile-tab ${currentView === 'search' ? 'active' : ''}`}
        onClick={() => setCurrentView('search')}
      >
        <Search size={22} />
        <span>Search</span>
      </button>

      <button
        className={`aura-mobile-tab ${currentView === 'library' ? 'active' : ''}`}
        onClick={() => setCurrentView('library')}
      >
        <Library size={22} />
        <span>Collection</span>
      </button>

      <button
        className={`aura-mobile-tab ${currentView === 'downloader' ? 'active' : ''}`}
        onClick={() => setCurrentView('downloader')}
      >
        <CloudDownload size={22} />
        <span>Add Audio</span>
      </button>
    </nav>
  );
}
