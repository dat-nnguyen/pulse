import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Smartphone,
  Laptop,
  Download,
  Upload,
  Globe,
  Sparkles,
  Server,
  Wifi,
} from 'lucide-react';
import { saveTrack } from '../services/storageService';
import { getBackendBaseUrl, setBackendBaseUrl } from '../services/musicDownloaderService';

export default function ShareModal({ isOpen, onClose, tracks = [], playlists = [], toast }) {
  const [copied, setCopied] = useState(false);
  const [backendUrl, setBackendUrlState] = useState(() => getBackendBaseUrl() || 'http://192.168.1.102:3030');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const currentUrl = window.location.origin;

  const handleSaveBackend = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const cleanUrl = backendUrl.trim().replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/status`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        setBackendBaseUrl(cleanUrl);
        setConnectionStatus('connected');
        if (toast) toast.success(`Connected to Pulse Companion Server at ${cleanUrl}!`, { title: 'Server Connected' });
      } else {
        setConnectionStatus('error');
        if (toast) toast.error('Server responded with an error. Please verify the URL.', { title: 'Connection Warning' });
      }
    } catch (e) {
      setConnectionStatus('failed');
      if (toast) toast.error(`Could not reach server at ${backendUrl}. Check that Mac and phone are on the same Wi-Fi.`, { title: 'Connection Failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportLibrary = () => {
    const backupData = {
      app: 'Pulse',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      tracks: tracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album,
        duration: t.duration,
        coverUrl: t.coverUrl,
        audioUrl: t.audioUrl,
        bitrate: t.bitrate,
        format: t.format,
        type: t.type,
        lyrics: t.lyrics,
      })),
      playlists,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aura-sound-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportLibrary = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (Array.isArray(data.tracks)) {
          for (const track of data.tracks) {
            await saveTrack(track);
          }
          if (toast) {
            toast.success(`Imported ${data.tracks.length} tracks into Pulse!`, { title: 'Import complete' });
          }
          setTimeout(() => window.location.reload(), 1200);
        }
      } catch (err) {
        if (toast) {
          toast.error('Invalid library backup file: ' + err.message, { title: 'Import failed' });
        }
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-surface" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680, background: '#0e1422', border: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Smartphone size={22} color="var(--pulse-accent)" />
            <div>
              <h2 className="modal-title" style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Install Pulse on Phone & PC</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                Download as native app • Background audio • Lock-screen controls
              </p>
            </div>
          </div>
          <button className="aura-circle-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Share Link Box */}
        <div style={{ background: 'var(--pulse-bg-raised)', padding: 14, borderRadius: 12, border: '1px solid var(--border-subtle)', marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--pulse-accent)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>
            Web App URL (No Ads • Free & Open)
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="pulse-input"
              style={{ flex: 1, padding: '10px 14px' }}
            />
            <button
              className="aura-btn-primary"
              style={{ padding: '10px 18px', borderRadius: 8, whiteSpace: 'nowrap' }}
              onClick={handleCopyLink}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Companion Audio Server Connection Box (For iPhone & Mobile) */}
        <div style={{ background: 'rgba(0, 242, 254, 0.04)', padding: 14, borderRadius: 12, border: '1px solid rgba(0, 242, 254, 0.25)', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Server size={16} color="var(--pulse-accent)" />
              <label style={{ fontSize: 12, fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Mac Companion Audio Server (Wi-Fi Streaming)
              </label>
            </div>
            {connectionStatus === 'connected' && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                Online
              </span>
            )}
          </div>
          <p style={{ margin: '0 0 10px', fontSize: 11.5, color: 'var(--text-secondary)' }}>
            Connects your iPhone to your Mac over Wi-Fi so downloaded tracks stream instantly.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrlState(e.target.value)}
              placeholder="http://192.168.1.102:3030"
              className="pulse-input"
              style={{ flex: 1, padding: '10px 14px', fontSize: 13 }}
            />
            <button
              className="aura-btn-primary"
              style={{ padding: '10px 18px', borderRadius: 8, whiteSpace: 'nowrap', fontSize: 13 }}
              onClick={handleSaveBackend}
              disabled={testingConnection}
            >
              {testingConnection ? <Wifi size={16} className="aura-spin" /> : <Wifi size={16} />}
              <span>{testingConnection ? 'Testing...' : 'Test & Save'}</span>
            </button>
          </div>
        </div>

        {/* Platform Guides: iPhone, Android, Mac */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 20 }}>
          {/* iPhone Guide */}
          <div style={{ background: 'var(--pulse-bg-raised)', border: '1px solid rgba(0, 194, 209, 0.25)', padding: 14, borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--pulse-accent)', marginBottom: 8 }}>
              <Smartphone size={18} />
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Apple iPhone / iPad</h4>
            </div>
            <ol style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 16, lineHeight: 1.7, margin: 0 }}>
              <li>Open this site in <strong>Safari</strong></li>
              <li>Tap the <strong>Share</strong> button (box with ↑ arrow)</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>Add</strong> — runs as full screen app!</li>
            </ol>
          </div>

          {/* Android Guide */}
          <div style={{ background: 'var(--pulse-bg-raised)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: 14, borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', marginBottom: 8 }}>
              <Smartphone size={18} />
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Android Phone</h4>
            </div>
            <ol style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 16, lineHeight: 1.7, margin: 0 }}>
              <li>Open this site in <strong>Chrome</strong></li>
              <li>Tap the <strong>⋮ (three dots)</strong> menu top right</li>
              <li>Tap <strong>"Install app"</strong> or "Add to Home screen"</li>
              <li>Opens instantly with lock-screen player!</li>
            </ol>
          </div>

          {/* Mac / PC Guide */}
          <div style={{ background: 'var(--pulse-bg-raised)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: 14, borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a855f7', marginBottom: 8 }}>
              <Laptop size={18} />
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Mac & PC Desktop</h4>
            </div>
            <ol style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 16, lineHeight: 1.7, margin: 0 }}>
              <li>Safari: Click <strong>File ➔ Add to Dock</strong></li>
              <li>Chrome: Click the <strong>Install</strong> icon in URL bar</li>
              <li>Enjoy lossless playback in background!</li>
            </ol>
          </div>
        </div>

        {/* Sync & Backup */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Library Backup & Transfer</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Export your playlists to JSON or transfer to another phone</div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="aura-circle-btn"
              style={{ width: 'auto', padding: '6px 14px', borderRadius: 20, fontSize: 12, gap: 6 }}
              onClick={handleExportLibrary}
              title="Download library backup"
            >
              <Download size={14} color="#00f2fe" />
              <span>Export</span>
            </button>

            <label
              className="aura-circle-btn"
              style={{ width: 'auto', padding: '6px 14px', borderRadius: 20, fontSize: 12, gap: 6, cursor: 'pointer' }}
              title="Import backup file"
            >
              <Upload size={14} color="#00f2fe" />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportLibrary}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
