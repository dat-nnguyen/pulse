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
  Sparkles
} from 'lucide-react';
import { saveTrack } from '../services/storageService';

export default function ShareModal({ isOpen, onClose, tracks = [], playlists = [] }) {
  const [copied, setCopied] = useState(false);
  const currentUrl = window.location.origin;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportLibrary = () => {
    const backupData = {
      app: 'Aura',
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
          alert(`Successfully imported ${data.tracks.length} tracks into Aura!`);
          window.location.reload();
        }
      } catch (err) {
        alert('Invalid library backup file: ' + err.message);
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
            <Share2 size={22} color="#00f2fe" />
            <h2 className="modal-title" style={{ fontFamily: 'Outfit, sans-serif' }}>Share Aura Sound Lounge</h2>
          </div>
          <button className="aura-circle-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Share Link Box */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: '#00f2fe', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>
            Free & Open Link (No Ads • No Subscription)
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="aura-search-input"
              style={{ flex: 1, borderRadius: 8, padding: '10px 14px', background: 'rgba(0,0,0,0.4)', color: '#fff' }}
            />
            <button
              className="aura-btn-primary"
              style={{ padding: '10px 20px', borderRadius: 8 }}
              onClick={handleCopyLink}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied Link' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Platform Guides: Android, iPhone, Mac */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          {/* Android Guide */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0, 242, 254, 0.15)', padding: 14, borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00f2fe', marginBottom: 8 }}>
              <Smartphone size={18} />
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Android Devices</h4>
            </div>
            <ol style={{ fontSize: 12, color: '#94a3b8', paddingLeft: 16, lineHeight: 1.6 }}>
              <li>Open link in <strong>Chrome</strong></li>
              <li>Tap the <strong>⋮ (Menu)</strong></li>
              <li>Select <strong>"Install app"</strong> or "Add to Home screen"</li>
              <li>Runs standalone with lock screen controls!</li>
            </ol>
          </div>

          {/* iPhone Guide */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(79, 172, 254, 0.15)', padding: 14, borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4facfe', marginBottom: 8 }}>
              <Smartphone size={18} />
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Apple iPhone</h4>
            </div>
            <ol style={{ fontSize: 12, color: '#94a3b8', paddingLeft: 16, lineHeight: 1.6 }}>
              <li>Open link in <strong>Safari</strong></li>
              <li>Tap <strong>Share</strong> (box with arrow)</li>
              <li>Tap <strong>"Add to Home Screen"</strong></li>
              <li>Plays when phone is locked or screen off</li>
            </ol>
          </div>

          {/* Mac / PC Guide */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(127, 0, 255, 0.15)', padding: 14, borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a855f7', marginBottom: 8 }}>
              <Laptop size={18} />
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Mac & Desktop</h4>
            </div>
            <ol style={{ fontSize: 12, color: '#94a3b8', paddingLeft: 16, lineHeight: 1.6 }}>
              <li>In Safari: <strong>File → Add to Dock</strong></li>
              <li>In Chrome: Click <strong>"Install"</strong> in URL bar</li>
              <li>Plays in background when minimized</li>
              <li>Zero ads and lossless master sound</li>
            </ol>
          </div>
        </div>

        {/* Sync & Backup */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#f8fafc' }}>Aura Sync & Backup</div>
            <div style={{ fontSize: 11.5, color: '#64748b' }}>Export your curated collection to share with friends</div>
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
