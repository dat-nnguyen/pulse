import React from 'react';
import { Library, CloudDownload, User, Smartphone } from 'lucide-react';

export default function MobileBottomNav({ currentView, setCurrentView, user, onOpenAuth, onOpenShare }) {
  return (
    <nav className="aura-mobile-nav">
      <button
        className={`aura-mobile-tab ${currentView === 'home' || currentView === 'playlist' ? 'active' : ''}`}
        onClick={() => setCurrentView('home')}
      >
        <Library size={22} />
        <span>Playlists</span>
      </button>

      <button
        className={`aura-mobile-tab ${currentView === 'downloader' ? 'active' : ''}`}
        onClick={() => setCurrentView('downloader')}
      >
        <CloudDownload size={22} />
        <span>Add Audio</span>
      </button>

      <button
        className="aura-mobile-tab"
        onClick={onOpenShare}
      >
        <Smartphone size={22} color="var(--pulse-accent)" />
        <span>Install App</span>
      </button>

      <button
        className="aura-mobile-tab"
        onClick={onOpenAuth}
      >
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <User size={22} />
          {user && (
            <span
              style={{
                position: 'absolute',
                top: 0,
                right: -2,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#10b981',
              }}
            />
          )}
        </div>
        <span>{user ? 'Account' : 'Sign In'}</span>
      </button>
    </nav>
  );
}
