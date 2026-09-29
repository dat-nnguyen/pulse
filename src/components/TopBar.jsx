import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  Share2,
  Sliders,
  Database,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="aura-circle-btn"
            disabled={!canGoBack}
            onClick={onGoBack}
            title="Go back"
            style={{ width: 34, height: 34 }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="aura-circle-btn"
            disabled
            title="Go forward"
            style={{ width: 34, height: 34 }}
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
            }}
          >
            <Activity size={16} color="var(--pulse-accent)" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>
            PULSE
          </span>
        </div>
      </div>

      {/* Right Actions & Account Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              background: 'var(--aura-bg-elevated)',
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
            <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            className="aura-btn-secondary"
            title="Sign in to sync between phone and laptop"
            style={{ padding: '6px 14px', fontSize: 12.5 }}
          >
            <LogIn size={14} />
            <span>Sign In to Sync</span>
          </button>
        )}

        {/* Audio Quality indicator */}
        <div className="aura-badge-lossless" title="Playing original uncompressed / 320kbps audio">
          <Sparkles size={11} />
          <span>{currentTrack?.bitrate || '320K'}</span>
        </div>

        {/* Add Audio Button */}
        <button
          className="aura-btn-primary"
          onClick={onOpenDownloader}
          title="Import music & podcasts"
          style={{ padding: '7px 14px', fontSize: 12.5 }}
        >
          <Download size={14} />
          <span>Add Audio</span>
        </button>

        {/* Equalizer */}
        <button
          className="aura-circle-btn"
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
          title={isCloudConnected ? "Supabase Cloud: Connected" : "Connect Supabase Cloud"}
          style={{ width: 34, height: 34, position: 'relative' }}
        >
          <Database size={15} color={isCloudConnected ? "var(--pulse-accent)" : "inherit"} />
          {isCloudConnected && (
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--pulse-accent)',
              }}
            />
          )}
        </button>

        {/* Share */}
        <button
          className="aura-circle-btn"
          onClick={onOpenShare}
          title="Share Pulse"
          style={{ width: 34, height: 34 }}
        >
          <Share2 size={15} />
        </button>
      </div>
    </header>
  );
}
