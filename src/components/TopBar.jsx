import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Download,
  Share2,
  Sliders,
  Cloud,
  User,
  LogIn,
  Activity,
} from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

export default function TopBar({
  currentView,
  selectedPlaylistId,
  user,
  onOpenAuth,
  onOpenShare,
  onOpenEqualizer,
  onOpenSupabase,
  currentTrack,
  onOpenDownloader,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onGoHome,
}) {
  const isCloudConnected = isSupabaseConfigured();

  return (
    <header className="aura-top-bar">
      {/* Left: Navigation history & Home */}
      <div className="aura-topbar-left">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className="aura-circle-btn"
            disabled={!canGoBack}
            onClick={onGoBack}
            title="Go back (⌘[ or Alt+←)"
            style={{
              width: 34,
              height: 34,
              opacity: canGoBack ? 1 : 0.35,
              cursor: canGoBack ? 'pointer' : 'not-allowed',
            }}
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="aura-circle-btn hide-on-mobile"
            disabled={!canGoForward}
            onClick={onGoForward}
            title="Go forward (⌘] or Alt+→)"
            style={{
              width: 34,
              height: 34,
              opacity: canGoForward ? 1 : 0.35,
              cursor: canGoForward ? 'pointer' : 'not-allowed',
            }}
            aria-label="Forward"
          >
            <ChevronRight size={18} />
          </button>
          <button
            className={`aura-circle-btn ${currentView === 'home' && !selectedPlaylistId ? 'active' : ''}`}
            onClick={onGoHome}
            title="Go to Home / Playlists"
            style={{ width: 34, height: 34 }}
            aria-label="Home"
          >
            <Home size={17} />
          </button>

          {/* Pulse Brand Logo on Mobile */}
          <div
            className="pulse-mobile-brand"
            onClick={onGoHome}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              cursor: 'pointer',
              padding: '3px 8px 3px 4px',
              borderRadius: 16,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(0, 242, 254, 0.2)',
            }}
            title="Pulse High-Fidelity Audio"
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 242, 254, 0.35)',
              }}
            >
              <Activity size={14} color="#07090e" strokeWidth={2.8} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: '0.06em', color: '#ffffff' }}>
              PULSE
            </span>
          </div>
        </div>
      </div>

      {/* Draggable Window Region for desktop */}
      <div className="aura-topbar-drag-spacer" title="Drag to move Pulse" />

      {/* Right Actions & Account Status */}
      <div className="aura-topbar-right">
        {/* User Account / Device Sync Button */}
        {user ? (
          <button
            onClick={onOpenAuth}
            className="aura-account-pill"
            title={`Logged in as ${user.email} • Click to manage account`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 20,
              background: 'var(--pulse-bg-raised)',
              border: '1px solid var(--border-subtle)',
              color: '#f8fafc',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'var(--pulse-accent)',
                color: 'var(--pulse-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {(user.email || 'U')[0].toUpperCase()}
            </div>
            <span className="hide-on-mobile" style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email?.split('@')[0]}
            </span>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#10b981',
              }}
              title="Cloud Sync Active"
            />
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="aura-btn-secondary hide-on-mobile"
            title="Sign in to sync between phone and laptop"
            style={{ padding: '6px 14px', fontSize: 12.5 }}
          >
            <LogIn size={14} />
            <span>Sign In to Sync</span>
          </button>
        )}


        {/* Download Audio Button */}
        <button
          className="aura-btn-primary"
          onClick={onOpenDownloader}
          title="Download & Import Music (YouTube / Local Files)"
          style={{ padding: '7px 14px', fontSize: 12.5 }}
        >
          <Download size={14} />
          <span>Download</span>
        </button>

        {/* Equalizer (hidden on mobile, accessible in full player) */}
        <button
          className="aura-circle-btn hide-on-mobile"
          onClick={onOpenEqualizer}
          title="Audio Equalizer & Visualizer"
          style={{ width: 34, height: 34 }}
        >
          <Sliders size={15} />
        </button>

        {/* Supabase Cloud Status */}
        <button
          className="aura-circle-btn"
          onClick={onOpenSupabase}
          title={isCloudConnected ? "Cloud Sync: Connected (Supabase)" : "Cloud Sync: Connect Supabase"}
          style={{ width: 34, height: 34, position: 'relative' }}
          aria-label="Cloud Sync"
        >
          <Cloud size={16} color={isCloudConnected ? "var(--pulse-accent)" : "currentColor"} />
          {isCloudConnected && (
            <span
              style={{
                position: 'absolute',
                top: 5,
                right: 5,
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 6px rgba(16, 185, 129, 0.8)',
              }}
            />
          )}
        </button>

        {/* Install App on Phone & Desktop / Share */}
        <button
          className="aura-circle-btn"
          onClick={onOpenShare}
          title="Install App on Phone (iOS/Android) & Share"
          style={{ width: 34, height: 34 }}
        >
          <Share2 size={15} color="var(--pulse-accent)" />
        </button>
      </div>
    </header>
  );
}
