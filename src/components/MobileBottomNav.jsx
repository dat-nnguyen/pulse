import React from 'react';
import { Library, CloudDownload, User, Smartphone } from 'lucide-react';

export default function MobileBottomNav({
  currentView,
  setCurrentView,
  user,
  onOpenAuth,
  onOpenShare,
  activeDownloads = { isDownloading: false, count: 0 },
}) {
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
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <CloudDownload size={22} />
          {activeDownloads && activeDownloads.isDownloading && (
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -4,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#00f2fe',
                boxShadow: '0 0 8px #00f2fe',
                animation: 'pulseDownloadGlow 1.6s infinite',
              }}
              title="Download active in background"
            />
          )}
        </div>
        <span>Download</span>
      </button>

      <button
        className="aura-mobile-tab"
        onClick={onOpenShare}
      >
        <Smartphone size={22} color="var(--pulse-accent)" />
        <span>Sync & Wi-Fi</span>
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
