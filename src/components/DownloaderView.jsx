import React, { useState } from 'react';
import {
  Download,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Music,
  Play,
  HardDriveDownload
} from 'lucide-react';

function YoutubeIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

import { downloadFromWebUrl } from '../services/musicDownloaderService';
import { parseAudioFile } from '../services/localFileParser';
import { saveTrack } from '../services/storageService';

export default function DownloaderView({
  onTrackAdded,
  onPlayTrack,
  prefilledQuery = '',
  toast,
}) {
  const [activeTab, setActiveTab] = useState('youtube'); // 'youtube' | 'local'

  // YouTube / Web download state
  const [webUrl, setWebUrl] = useState('');
  const [customTitle, setCustomTitle] = useState(prefilledQuery);
  const [customArtist, setCustomArtist] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(null); // { type: 'success' | 'error', message }

  // Local file import state
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  // 1. Handle Web / YouTube Download
  const handleWebDownload = async (e) => {
    e.preventDefault();
    if (!webUrl.trim()) return;

    setIsDownloading(true);
    setDownloadStatus(null);
    setDownloadProgress({ status: 'Connecting to audio stream...', percent: 20 });

    try {
      const track = await downloadFromWebUrl(webUrl.trim(), {
        title: customTitle.trim() || undefined,
        artist: customArtist.trim() || undefined,
      });

      setDownloadStatus({
        type: 'success',
        message: `Downloaded "${track.title}" in original quality`,
      });
      if (toast) toast.success(`"${track.title}" added to library`, { title: 'Download complete' });
      setWebUrl('');
      setCustomTitle('');
      setCustomArtist('');
      onTrackAdded(track);
    } catch (err) {
      setDownloadStatus({
        type: 'error',
        message: err.message || 'Download failed. Check the URL or try a direct audio link.',
      });
      if (toast) toast.error(err.message || 'Download failed. Check the URL or try a direct audio link.', { title: 'Download error' });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  // 2. Local file drag-and-drop
  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).filter((f) =>
      /\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(f.name)
    );
    if (files.length === 0) {
      setImportStatus({ type: 'error', message: 'Select valid audio files (MP3, FLAC, WAV, M4A).' });
      return;
    }

    setImportStatus({ type: 'loading', message: `Importing ${files.length} file(s)...` });
    try {
      for (const file of files) {
        const parsed = await parseAudioFile(file);
        await saveTrack(parsed);
        onTrackAdded(parsed);
      }
      setImportStatus({
        type: 'success',
        message: `Added ${files.length} track(s) in original quality`,
      });
      if (toast) toast.success(`Added ${files.length} track(s) to your library`, { title: 'Import complete' });
    } catch (err) {
      setImportStatus({ type: 'error', message: 'Import failed: ' + err.message });
      if (toast) toast.error('Import failed: ' + err.message, { title: 'Import error' });
    }
  };

  return (
    <div className="pulse-downloader-scroll">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            margin: '0 0 6px',
          }}
        >
          Download & Add Music
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, margin: 0 }}>
          Download from YouTube or import local audio — 320kbps and lossless quality preserved
        </p>
      </div>

      {/* Tabs */}
      <div className="pulse-tab-bar">
        <button
          className={`pulse-tab ${activeTab === 'youtube' ? 'active' : ''}`}
          onClick={() => setActiveTab('youtube')}
        >
          <YoutubeIcon size={14} />
          <span>Web Audio</span>
        </button>

        <button
          className={`pulse-tab ${activeTab === 'local' ? 'active' : ''}`}
          onClick={() => setActiveTab('local')}
        >
          <UploadCloud size={14} />
          <span>Local Files</span>
        </button>
      </div>

      {/* TAB 1: YOUTUBE & WEB AUDIO */}
      {activeTab === 'youtube' && (
        <div style={{ maxWidth: 600 }}>
          <form onSubmit={handleWebDownload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                Audio URL
              </label>
              <input
                type="url"
                required
                placeholder="https://youtube.com/watch?v=... or direct .mp3 link"
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                className="pulse-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>
                  Custom Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Song Title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="pulse-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>
                  Artist (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Artist Name"
                  value={customArtist}
                  onChange={(e) => setCustomArtist(e.target.value)}
                  className="pulse-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <button
                type="submit"
                disabled={isDownloading || !webUrl.trim()}
                className="aura-btn-primary"
                style={{ padding: '10px 20px', fontSize: 13 }}
              >
                {isDownloading ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Extracting audio...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Download</span>
                  </>
                )}
              </button>

              <div className="aura-badge-lossless">
                <Sparkles size={10} />
                <span>Original quality</span>
              </div>
            </div>
          </form>

          {/* Progress */}
          {downloadProgress && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <span>{downloadProgress.status}</span>
                <span>{downloadProgress.percent}%</span>
              </div>
              <div className="pulse-progress-track">
                <div className="pulse-progress-fill" style={{ width: `${downloadProgress.percent}%` }} />
              </div>
            </div>
          )}

          {downloadStatus && (
            <div className={`pulse-status-banner ${downloadStatus.type}`}>
              {downloadStatus.type === 'success' ? (
                <CheckCircle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span>{downloadStatus.message}</span>
            </div>
          )}

          {/* Audio Source Guidance */}
          <div
            style={{
              marginTop: 20,
              padding: '14px 16px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              <Sparkles size={15} color="var(--pulse-accent)" />
              <span>Audio Sources on Web & Mobile</span>
            </div>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              <li>
                <strong style={{ color: '#f8fafc' }}>Direct Audio Links (.mp3, .m4a, .flac):</strong> Downloads and caches directly in your browser or phone with 0 backend needed.
              </li>
              <li>
                <strong style={{ color: '#f8fafc' }}>Local Files:</strong> Tap the &quot;Local Files&quot; tab to import your songs directly from phone storage or laptop.
              </li>
              <li>
                <strong style={{ color: '#f8fafc' }}>YouTube Audio:</strong> YouTube requires a backend extractor. Run <code style={{ color: '#10b981' }}>npm run server</code> on your Mac, or deploy to free cloud hosting (Render / Railway) using the included Dockerfile.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 2: LOCAL FILE IMPORT */}
      {activeTab === 'local' && (
        <div style={{ maxWidth: 600 }}>
          <div
            className={`pulse-drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => document.getElementById('audio-file-input').click()}
          >
            <input
              id="audio-file-input"
              type="file"
              multiple
              accept="audio/*,.mp3,.flac,.wav,.m4a"
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />
            <UploadCloud size={40} color={isDragging ? 'var(--pulse-accent)' : 'var(--text-muted)'} style={{ margin: '0 auto 14px', display: 'block' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
              Drop audio files here
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 14 }}>
              MP3, FLAC, WAV, M4A, AAC — original quality preserved
            </p>
            <button
              type="button"
              className="aura-btn-secondary"
            >
              Browse files
            </button>
          </div>

          {importStatus && (
            <div className={`pulse-status-banner ${importStatus.type}`}>
              {importStatus.type === 'loading' ? (
                <Loader2 size={16} className="spin" />
              ) : importStatus.type === 'success' ? (
                <CheckCircle size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
