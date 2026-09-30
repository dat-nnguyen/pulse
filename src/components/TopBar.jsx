import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Sliders,
  Database,
  Cloud,
  User,
  LogIn,
  Activity
} from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

export default function TopBar({
  currentView,
  user,
  onOpenAuth,
  onOpenShare,
  onOpenEqualizer,
  onOpenSupabase,
  currentTrack,
  onOpenDownloader,
  canGoBack,
  onGoBack,
}) {
  const isCloudConnected = isSupabaseConfigured();

  return (
    <header className="aura-top-bar">
      {/* Left: Brand Identity & Navigation history */}
      <div className="aura-topbar-left">
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="aura-circle-btn"
            disabled={!canGoBack}
            onClick={onGoBack}
            title="Go back"
            style={{ width: 34, height: 34, opacity: canGoBack ? 1 : 0.4 }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="aura-circle-btn hide-on-mobile"
            disabled
            title="Go forward"
            style={{ width: 34, height: 34, opacity: 0.3 }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Pulse Brand in Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: '#0e1420',
              border: '1px solid var(--pulse-accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Activity size={16} color="var(--pulse-accent)" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>
            PULSE
          </span>
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
