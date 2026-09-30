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
  HardDriveDownload,
  ListOrdered,
  Layers,
  FileAudio,
  Check,
  FolderPlus,
  ListMusic
} from 'lucide-react';

function YoutubeIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

import { downloadFromWebUrl, downloadMultipleFromWebUrls } from '../services/musicDownloaderService';
import { parseAudioFile } from '../services/localFileParser';
import { saveTrack } from '../services/storageService';

export default function DownloaderView({
  onTrackAdded,
  onPlayTrack,
  prefilledQuery = '',
  playlists = [],
  onOpenCreatePlaylist,
  onAddTrackToPlaylist,
  onAddMultipleTracksToPlaylist,
  toast,
}) {
  const [activeTab, setActiveTab] = useState('youtube'); // 'youtube' | 'local'
  const [downloadMode, setDownloadMode] = useState('single'); // 'single' | 'batch'

  // Playlist Destination state
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const selectedPlaylist = (playlists || []).find((p) => p.id === selectedPlaylistId);

  // Single Web download state
  const [webUrl, setWebUrl] = useState('');
  const [customTitle, setCustomTitle] = useState(prefilledQuery);
  const [customArtist, setCustomArtist] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(null);

  // Batch Web download state (max 10)
  const [batchUrlsText, setBatchUrlsText] = useState('');
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [batchItems, setBatchItems] = useState([]);
  const [batchProgress, setBatchProgress] = useState(null);

  // Local file import state (max 10)
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [uploadItems, setUploadItems] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Parse URLs from batch textarea (max 10)
  const parsedBatchUrls = batchUrlsText
    .split(/[\n,]/)
    .map((u) => u.trim())
    .filter((u) => u.length > 0)
    .slice(0, 10);

  // 1. Handle Single Web / YouTube Download
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

      track.isDownloaded = true;
      if (selectedPlaylistId && onAddTrackToPlaylist) {
        onAddTrackToPlaylist(track.id, selectedPlaylistId);
      }
      onTrackAdded(track, selectedPlaylistId);

      const destMessage = selectedPlaylist
        ? `Saved to Offline Storage & "${selectedPlaylist.name}"`
        : 'Saved to Offline Storage';

      setDownloadStatus({
        type: 'success',
        message: `Downloaded "${track.title}" • ${destMessage}`,
      });
      if (toast) {
        toast.success(
          `"${track.title}" saved to ${selectedPlaylist ? `"${selectedPlaylist.name}" & Offline Storage` : 'Offline Storage'}`,
          { title: 'Download complete' }
        );
      }
      setWebUrl('');
      setCustomTitle('');
      setCustomArtist('');
    } catch (err) {
      setDownloadStatus({
        type: 'error',
        message: err.message || 'Download failed. Check the URL or try a direct audio link.',
      });
      if (toast) toast.error(err.message || 'Download failed.', { title: 'Download error' });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  // 2. Handle Batch Web Download (Max 10)
  const handleBatchDownload = async (e) => {
    e.preventDefault();
    if (parsedBatchUrls.length === 0) return;

    setIsBatchDownloading(true);
    const initialItems = parsedBatchUrls.map((url, i) => ({
      id: i,
      url,
      status: 'pending', // 'pending' | 'downloading' | 'success' | 'error'
      title: url.length > 45 ? url.slice(0, 42) + '...' : url,
      error: null,
    }));
    setBatchItems(initialItems);
    setBatchProgress({ current: 0, total: parsedBatchUrls.length, percent: 0 });

    const downloadedTrackIds = [];

    try {
      await downloadMultipleFromWebUrls(parsedBatchUrls, (progress) => {
        setBatchItems((prev) =>
          prev.map((item, idx) => {
            if (idx === progress.index) {
              return {
                ...item,
                status: progress.status === 'success' ? 'success' : progress.status === 'error' ? 'error' : 'downloading',
                title: progress.track?.title || item.title,
                artist: progress.track?.artist || item.artist,
                error: progress.error || null,
              };
            }
            return item;
          })
        );
        if (progress.track) {
          progress.track.isDownloaded = true;
          downloadedTrackIds.push(progress.track.id);
          onTrackAdded(progress.track, selectedPlaylistId);
        }
        setBatchProgress({
          current: progress.status === 'success' || progress.status === 'error' ? progress.index + 1 : progress.index,
          total: progress.total,
          percent: progress.percent,
        });
      });

      if (selectedPlaylistId && downloadedTrackIds.length > 0) {
        if (onAddMultipleTracksToPlaylist) {
          onAddMultipleTracksToPlaylist(downloadedTrackIds, selectedPlaylistId);
        } else if (onAddTrackToPlaylist) {
          downloadedTrackIds.forEach((id) => onAddTrackToPlaylist(id, selectedPlaylistId));
        }
      }

      const destText = selectedPlaylist ? `saved to "${selectedPlaylist.name}" & Offline Storage` : 'saved to Offline Storage';
      if (toast) toast.success(`Batch download completed for ${parsedBatchUrls.length} tracks • ${destText}`, { title: 'Batch complete' });
    } catch (err) {
      if (toast) toast.error('Batch download interrupted: ' + err.message, { title: 'Batch error' });
    } finally {
      setIsBatchDownloading(false);
    }
  };

  // 3. Local file upload (Max 10)
  const handleFiles = async (fileList) => {
    const rawFiles = Array.from(fileList).filter((f) =>
      /\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(f.name)
    );
    if (rawFiles.length === 0) {
      setImportStatus({ type: 'error', message: 'Select valid audio files (MP3, FLAC, WAV, M4A, AAC).' });
      return;
    }

    // Enforce 10 files max
    const files = rawFiles.slice(0, 10);
    if (rawFiles.length > 10 && toast) {
      toast.info('Maximum 10 audio files per batch. Processing first 10 files.', { title: 'Batch Limit (10 files)' });
    }

    const items = files.map((file, idx) => ({
      id: idx,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
      format: file.name.split('.').pop().toUpperCase(),
      status: 'pending',
    }));
    setUploadItems(items);
    setUploadProgress({ current: 0, total: files.length, percent: 0 });
    setImportStatus({ type: 'loading', message: `Importing and cloud-syncing ${files.length} file(s)...` });

    const uploadedTrackIds = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadItems((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: 'processing' } : item))
        );

        const parsed = await parseAudioFile(file);
        parsed.isDownloaded = true;
        const saved = await saveTrack(parsed);
        saved.isDownloaded = true;
        uploadedTrackIds.push(saved.id);
        onTrackAdded(saved, selectedPlaylistId);

        setUploadItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'success', title: parsed.title, artist: parsed.artist } : item
          )
        );

        setUploadProgress({
          current: i + 1,
          total: files.length,
          percent: Math.round(((i + 1) / files.length) * 100),
        });
      }

      if (selectedPlaylistId && uploadedTrackIds.length > 0) {
        if (onAddMultipleTracksToPlaylist) {
          onAddMultipleTracksToPlaylist(uploadedTrackIds, selectedPlaylistId);
        } else if (onAddTrackToPlaylist) {
          uploadedTrackIds.forEach((id) => onAddTrackToPlaylist(id, selectedPlaylistId));
        }
      }

      const destText = selectedPlaylist ? `saved to "${selectedPlaylist.name}" & Offline Storage` : 'saved to Offline Storage';
      setImportStatus({
        type: 'success',
        message: `Successfully added ${files.length} track(s) • ${destText}.`,
      });
      if (toast) toast.success(`Added ${files.length} track(s) to library & ${selectedPlaylist ? `"${selectedPlaylist.name}"` : 'Offline Storage'}!`, { title: 'Import complete' });
    } catch (err) {
      setImportStatus({ type: 'error', message: 'Import error: ' + err.message });
      if (toast) toast.error('Import error: ' + err.message, { title: 'Import failed' });
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
          Download & Upload Audio
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, margin: 0 }}>
          Download from YouTube/Web or upload local audio — multi-file batch (up to 10 files) with automatic cloud sync.
        </p>
      </div>

      {/* Target Playlist Selector Box */}
      <div
        className="pulse-playlist-banner"
        style={{
          background: selectedPlaylist
            ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.08) 0%, rgba(79, 172, 254, 0.03) 100%)'
            : 'var(--pulse-surface)',
          border: selectedPlaylist
            ? '1.5px solid rgba(0, 242, 254, 0.4)'
            : '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '12px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          boxShadow: selectedPlaylist
            ? '0 6px 24px rgba(0, 242, 254, 0.08)'
            : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: selectedPlaylist
                ? 'linear-gradient(135deg, var(--pulse-accent), #00c6ff)'
                : 'rgba(255, 255, 255, 0.06)',
              color: selectedPlaylist ? '#000' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: selectedPlaylist ? '0 2px 12px rgba(0, 242, 254, 0.3)' : 'none',
            }}
          >
            <FolderPlus size={20} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)' }}>
                Save to Playlist:
              </span>
              {selectedPlaylist ? (
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: 'var(--pulse-accent)',
                    background: 'rgba(0, 242, 254, 0.12)',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    padding: '2px 10px',
                    borderRadius: 6,
                  }}
                >
                  🎵 {selectedPlaylist.name}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  Offline Storage & Library (Default)
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              {selectedPlaylist
                ? `Downloaded audio will lie in Offline Storage and be immediately saved to "${selectedPlaylist.name}".`
                : 'Downloaded songs will lie in your Offline Storage immediately. Choose a playlist to also save there.'}
            </p>
          </div>
        </div>

        {/* Button to Choose Playlist */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedPlaylistId}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  if (onOpenCreatePlaylist) onOpenCreatePlaylist();
                } else {
                  setSelectedPlaylistId(e.target.value);
                }
              }}
              className="pulse-input"
              style={{
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: 700,
                padding: '8px 14px',
                background: 'var(--pulse-bg-raised)',
                color: selectedPlaylistId ? 'var(--pulse-accent)' : 'var(--text-primary)',
                border: selectedPlaylistId ? '1px solid var(--pulse-accent)' : '1px solid var(--border-subtle)',
                borderRadius: 8,
                minWidth: 200,
              }}
            >
              <option value="">📂 Choose Playlist to save to...</option>
              {(playlists || []).map((pl) => (
                <option key={pl.id} value={pl.id}>
                  🎵 {pl.name} ({pl.trackIds ? pl.trackIds.length : 0} tracks)
                </option>
              ))}
              <option value="__new__">➕ Create New Playlist...</option>
            </select>
          </div>

          {selectedPlaylistId && (
            <button
              type="button"
              onClick={() => setSelectedPlaylistId('')}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="pulse-tab-bar" style={{ marginBottom: 18 }}>
        <button
          className={`pulse-tab ${activeTab === 'youtube' ? 'active' : ''}`}
          onClick={() => setActiveTab('youtube')}
        >
          <YoutubeIcon size={14} />
          <span>Web & YouTube</span>
        </button>

        <button
          className={`pulse-tab ${activeTab === 'local' ? 'active' : ''}`}
          onClick={() => setActiveTab('local')}
        >
          <UploadCloud size={14} />
          <span>Local Files (Upload up to 10)</span>
        </button>
      </div>

      {/* TAB 1: YOUTUBE & WEB AUDIO */}
      {activeTab === 'youtube' && (
        <div style={{ maxWidth: 640 }}>
          {/* Sub-mode selector: Single vs Batch (Max 10) */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              background: 'var(--pulse-bg-raised)',
              padding: 4,
              borderRadius: 8,
              width: 'fit-content',
              marginBottom: 16,
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              className={`aura-tab-pill ${downloadMode === 'single' ? 'active' : ''}`}
              onClick={() => setDownloadMode('single')}
              style={{
                background: downloadMode === 'single' ? 'var(--pulse-surface-hover)' : 'transparent',
                color: downloadMode === 'single' ? 'var(--pulse-accent)' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Single Track
            </button>
            <button
              type="button"
              className={`aura-tab-pill ${downloadMode === 'batch' ? 'active' : ''}`}
              onClick={() => setDownloadMode('batch')}
              style={{
                background: downloadMode === 'batch' ? 'var(--pulse-surface-hover)' : 'transparent',
                color: downloadMode === 'batch' ? 'var(--pulse-accent)' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ListOrdered size={14} />
              <span>Batch Download (Max 10)</span>
            </button>
          </div>

          {/* Mode A: Single Link */}
          {downloadMode === 'single' && (
            <form onSubmit={handleWebDownload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                  Audio or YouTube URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://youtube.com/watch?v=... or direct .mp3 / .m4a link"
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
                      <span>Extracting & Saving...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>Download {selectedPlaylist ? `to "${selectedPlaylist.name}"` : 'to Offline Storage'}</span>
                    </>
                  )}
                </button>

                <div className="aura-badge-lossless">
                  <Sparkles size={10} />
                  <span>Immediate Offline Storage & Original Quality</span>
                </div>
              </div>
            </form>
          )}

          {/* Mode B: Batch Links (Max 10) */}
          {downloadMode === 'batch' && (
            <form onSubmit={handleBatchDownload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Paste Audio / YouTube Links (One per line, up to 10)
                  </label>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: parsedBatchUrls.length > 0 ? 'var(--pulse-accent)' : 'var(--text-muted)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 8px',
                      borderRadius: 12,
                    }}
                  >
                    {parsedBatchUrls.length} / 10 links
                  </span>
                </div>

                <textarea
                  rows={5}
                  value={batchUrlsText}
                  onChange={(e) => setBatchUrlsText(e.target.value)}
                  placeholder="https://youtube.com/watch?v=...&#10;https://youtube.com/watch?v=...&#10;https://example.com/audio.mp3"
                  className="pulse-input"
                  style={{ fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.6 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="submit"
                  disabled={isBatchDownloading || parsedBatchUrls.length === 0}
                  className="aura-btn-primary"
                  style={{ padding: '10px 22px', fontSize: 13 }}
                >
                  {isBatchDownloading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Downloading batch ({batchProgress?.current || 0}/{batchProgress?.total || parsedBatchUrls.length})...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>Download All ({parsedBatchUrls.length} Tracks) {selectedPlaylist ? `to "${selectedPlaylist.name}"` : 'to Offline Storage'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Batch items progress list */}
              {batchItems.length > 0 && (
                <div style={{ marginTop: 12, background: 'var(--pulse-bg-raised)', borderRadius: 10, padding: 12, border: '1px solid var(--border-subtle)' }}>
                  {batchProgress && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <span>Progress: {batchProgress.current} of {batchProgress.total} completed</span>
                        <span>{batchProgress.percent}%</span>
                      </div>
                      <div className="pulse-progress-track">
                        <div className="pulse-progress-fill" style={{ width: `${batchProgress.percent}%` }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                    {batchItems.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '80%', minWidth: 0 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#ffffff', fontWeight: 700, fontSize: 12.5 }}>
                            {idx + 1}. {item.title}
                          </span>
                          {item.artist && (
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                              {item.artist}
                            </span>
                          )}
                        </div>
                        <span>
                          {item.status === 'downloading' && <Loader2 size={14} className="spin" color="var(--pulse-accent)" />}
                          {item.status === 'success' && <CheckCircle size={14} color="#10b981" />}
                          {item.status === 'error' && <AlertCircle size={14} color="#f43f5e" title={item.error} />}
                          {item.status === 'pending' && <span style={{ color: 'var(--text-muted)' }}>Queued</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}

          {/* Single Download Progress Banner */}
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
            <div className={`pulse-status-banner ${downloadStatus.type}`} style={{ marginTop: 14 }}>
              {downloadStatus.type === 'success' ? (
                <CheckCircle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span>{downloadStatus.message}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOCAL FILE IMPORT (UP TO 10 FILES) */}
      {activeTab === 'local' && (
        <div style={{ maxWidth: 640 }}>
          <div
            className={`pulse-drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => document.getElementById('audio-file-input').click()}
            style={{ cursor: 'pointer' }}
          >
            <input
              id="audio-file-input"
              type="file"
              multiple
              accept="audio/*,.mp3,.flac,.wav,.m4a,.aac"
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />
            <UploadCloud size={40} color={isDragging ? 'var(--pulse-accent)' : 'var(--text-muted)'} style={{ margin: '0 auto 14px', display: 'block' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
              Drop audio files here (up to 10 files)
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 14 }}>
              MP3, FLAC, WAV, M4A, AAC — 320kbps & lossless master audio
            </p>
            <button
              type="button"
              className="aura-btn-secondary"
            >
              Browse files (select up to 10)
            </button>
          </div>

          {/* Upload Progress and Status */}
          {uploadProgress && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <span>Processing & Syncing: {uploadProgress.current} of {uploadProgress.total}</span>
                <span>{uploadProgress.percent}%</span>
              </div>
              <div className="pulse-progress-track">
                <div className="pulse-progress-fill" style={{ width: `${uploadProgress.percent}%` }} />
              </div>
            </div>
          )}

          {uploadItems.length > 0 && (
            <div style={{ marginTop: 14, background: 'var(--pulse-bg-raised)', borderRadius: 10, padding: 12, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Batch Upload Queue ({uploadItems.length} files):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {uploadItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '75%' }}>
                      <FileAudio size={15} color="var(--pulse-accent)" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                        {item.title || item.name}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({item.format}, {item.size})</span>
                    </div>

                    <span>
                      {item.status === 'processing' && <Loader2 size={14} className="spin" color="var(--pulse-accent)" />}
                      {item.status === 'success' && <CheckCircle size={14} color="#10b981" />}
                      {item.status === 'pending' && <span style={{ color: 'var(--text-muted)' }}>Queued</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {importStatus && (
            <div className={`pulse-status-banner ${importStatus.type}`} style={{ marginTop: 14 }}>
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
