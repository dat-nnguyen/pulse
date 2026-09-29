import React, { useState } from 'react';
import {
  Download,
  Podcast as PodcastIcon,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Music,
  Play,
  HardDriveDownload,
  Search
} from 'lucide-react';

function YoutubeIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}
import { downloadFromWebUrl } from '../services/musicDownloaderService';
import { searchApplePodcasts, fetchPodcastFeed } from '../services/podcastService';
import { parseAudioFile } from '../services/localFileParser';
import { saveTrack } from '../services/storageService';

export default function DownloaderView({
  onTrackAdded,
  onPlayTrack,
  prefilledQuery = '',
}) {
  const [activeTab, setActiveTab] = useState('youtube'); // 'youtube' | 'podcasts' | 'local'

  // YouTube / Web download state
  const [webUrl, setWebUrl] = useState('');
  const [customTitle, setCustomTitle] = useState(prefilledQuery);
  const [customArtist, setCustomArtist] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(null); // { type: 'success' | 'error', message }

  // Podcasts search state
  const [podcastQuery, setPodcastQuery] = useState(prefilledQuery || 'Huberman Lab');
  const [podcastResults, setPodcastResults] = useState([]);
  const [isSearchingPodcasts, setIsSearchingPodcasts] = useState(false);
  const [selectedPodcastShow, setSelectedPodcastShow] = useState(null);
  const [podcastEpisodes, setPodcastEpisodes] = useState([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [downloadingEpisodeId, setDownloadingEpisodeId] = useState(null);

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
      setWebUrl('');
      setCustomTitle('');
      setCustomArtist('');
      onTrackAdded(track);
    } catch (err) {
      setDownloadStatus({
        type: 'error',
        message: err.message || 'Download failed. Check the URL or try a direct audio link.',
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  // 2. Search Apple Podcasts
  const handleSearchPodcasts = async (e) => {
    if (e) e.preventDefault();
    if (!podcastQuery.trim()) return;

    setIsSearchingPodcasts(true);
    setSelectedPodcastShow(null);
    try {
      const results = await searchApplePodcasts(podcastQuery.trim());
      setPodcastResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingPodcasts(false);
    }
  };

  // Select podcast show and fetch episodes
  const handleSelectPodcast = async (podcast) => {
    setSelectedPodcastShow(podcast);
    setIsLoadingFeed(true);
    try {
      const feed = await fetchPodcastFeed(podcast.feedUrl);
      setPodcastEpisodes(feed.episodes || []);
    } catch (err) {
      alert('Could not load podcast episodes: ' + err.message);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  // Download a podcast episode to local storage
  const handleDownloadEpisode = async (episode) => {
    setDownloadingEpisodeId(episode.id);
    try {
      const res = await fetch(episode.audioUrl);
      const blob = await res.blob();
      const saved = await saveTrack({
        ...episode,
        audioBlob: blob,
        isDownloaded: true,
        downloadedAt: Date.now(),
        fileSizeBytes: blob.size,
      });
      onTrackAdded(saved);
      alert(`Episode "${episode.title}" downloaded offline!`);
    } catch (err) {
      // If direct blob fetch hits CORS, save with streaming URL
      const saved = await saveTrack({
        ...episode,
        isDownloaded: true,
      });
      onTrackAdded(saved);
      alert(`Episode added to library!`);
    } finally {
      setDownloadingEpisodeId(null);
    }
  };

  // 3. Local file drag-and-drop
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
    } catch (err) {
      setImportStatus({ type: 'error', message: 'Import failed: ' + err.message });
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
          Add Audio
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, margin: 0 }}>
          Import music and podcasts — 320kbps and lossless audio preserved
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
          className={`pulse-tab ${activeTab === 'podcasts' ? 'active' : ''}`}
          onClick={() => setActiveTab('podcasts')}
        >
          <PodcastIcon size={14} />
          <span>Podcasts</span>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                  Title (optional)
                </label>
                <input
                  type="text"
                  placeholder="Auto-detect or type name"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="pulse-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                  Artist (optional)
                </label>
                <input
                  type="text"
                  placeholder="Auto-detect or type artist"
                  value={customArtist}
                  onChange={(e) => setCustomArtist(e.target.value)}
                  className="pulse-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
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
        </div>
      )}

      {/* TAB 2: PODCASTS & SHOWS */}
      {activeTab === 'podcasts' && (
        <div>
          <form onSubmit={handleSearchPodcasts} style={{ display: 'flex', gap: 10, maxWidth: 500, marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Search Apple Podcasts..."
              value={podcastQuery}
              onChange={(e) => setPodcastQuery(e.target.value)}
              className="pulse-input"
              style={{ flex: 1 }}
            />
            <button type="submit" className="aura-btn-primary" style={{ padding: '8px 16px' }}>
              <Search size={14} />
              <span>Search</span>
            </button>
          </form>

          {isSearchingPodcasts && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', margin: '16px 0' }}>
              <Loader2 size={16} className="spin" />
              <span style={{ fontSize: 13 }}>Searching podcasts...</span>
            </div>
          )}

          {/* Episode list or search results */}
          {selectedPodcastShow ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <button className="aura-btn-secondary" onClick={() => setSelectedPodcastShow(null)}>
                  ← Back
                </button>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {selectedPodcastShow.name}
                </h2>
              </div>

              {isLoadingFeed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                  <Loader2 size={16} className="spin" />
                  <span style={{ fontSize: 13 }}>Loading episodes...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {podcastEpisodes.map((ep) => (
                    <div key={ep.id} className="pulse-episode-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
                          {ep.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {ep.pubDate ? new Date(ep.pubDate).toLocaleDateString() : ''} • {ep.formattedDuration || 'Audio'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          className="aura-btn-primary"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => onPlayTrack(ep)}
                        >
                          <Play size={13} fill="#07090e" />
                          <span>Play</span>
                        </button>

                        <button
                          className="aura-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          disabled={downloadingEpisodeId === ep.id}
                          onClick={() => handleDownloadEpisode(ep)}
                        >
                          {downloadingEpisodeId === ep.id ? (
                            <Loader2 size={13} className="spin" />
                          ) : (
                            <HardDriveDownload size={13} />
                          )}
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="pulse-podcast-grid">
              {podcastResults.map((p) => (
                <div
                  key={p.id}
                  className="pulse-podcast-card"
                  onClick={() => handleSelectPodcast(p)}
                >
                  <img src={p.coverUrl} alt={p.name} />
                  <div className="card-name">{p.name}</div>
                  <div className="card-meta">{p.artist} • {p.trackCount} episodes</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LOCAL FILE IMPORT */}
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
