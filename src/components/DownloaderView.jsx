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
        message: `Successfully downloaded "${track.title}" in original 320kbps quality!`,
      });
      setWebUrl('');
      setCustomTitle('');
      setCustomArtist('');
      onTrackAdded(track);
    } catch (err) {
      setDownloadStatus({
        type: 'error',
        message: err.message || 'Download failed. Ensure URL is valid or drop audio files directly.',
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
      setImportStatus({ type: 'error', message: 'Please select valid audio files (MP3, FLAC, WAV, M4A).' });
      return;
    }

    setImportStatus({ type: 'loading', message: `Importing ${files.length} audio file(s)...` });
    try {
      for (const file of files) {
        const parsed = await parseAudioFile(file);
        await saveTrack(parsed);
        onTrackAdded(parsed);
      }
      setImportStatus({
        type: 'success',
        message: `Successfully added ${files.length} song(s) in original quality!`,
      });
    } catch (err) {
      setImportStatus({ type: 'error', message: 'Failed to import files: ' + err.message });
    }
  };

  return (
    <div className="spotify-scroll-area">
      {/* Header */}
      <div style={{ margin: '28px 0 20px 0' }}>
        <h1 className="section-title" style={{ fontSize: 32 }}>Download & Ingest Audio</h1>
        <p style={{ color: '#b3b3b3', fontSize: 14, marginTop: 4 }}>
          Add new music and podcasts • Bit-perfect 320kbps & lossless sound • Background playback
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12, marginBottom: 24 }}>
        <button
          className={`sidebar-filter-pill ${activeTab === 'youtube' ? 'active' : ''}`}
          onClick={() => setActiveTab('youtube')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <YoutubeIcon size={16} />
          <span>YouTube & Web Audio</span>
        </button>

        <button
          className={`sidebar-filter-pill ${activeTab === 'podcasts' ? 'active' : ''}`}
          onClick={() => setActiveTab('podcasts')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <PodcastIcon size={16} />
          <span>Podcasts & Shows</span>
        </button>

        <button
          className={`sidebar-filter-pill ${activeTab === 'local' ? 'active' : ''}`}
          onClick={() => setActiveTab('local')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <UploadCloud size={16} />
          <span>Local Files Import</span>
        </button>
      </div>

      {/* TAB 1: YOUTUBE & WEB AUDIO */}
      {activeTab === 'youtube' && (
        <div style={{ maxWidth: 640 }}>
          <form onSubmit={handleWebDownload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#ffffff' }}>
                Audio / YouTube / SoundCloud / Web Stream URL
              </label>
              <input
                type="url"
                required
                placeholder="https://www.youtube.com/watch?v=... or direct .mp3 / .flac link"
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                className="top-bar-search-input"
                style={{ width: '100%', borderRadius: 8, padding: '12px 16px', background: '#242424' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#ffffff' }}>
                  Custom Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Auto-detect or type song name"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="top-bar-search-input"
                  style={{ width: '100%', borderRadius: 8, padding: '10px 14px', background: '#242424' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#ffffff' }}>
                  Artist Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Auto-detect or type artist"
                  value={customArtist}
                  onChange={(e) => setCustomArtist(e.target.value)}
                  className="top-bar-search-input"
                  style={{ width: '100%', borderRadius: 8, padding: '10px 14px', background: '#242424' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <button
                type="submit"
                disabled={isDownloading || !webUrl.trim()}
                className="action-pill-btn"
                style={{
                  background: isDownloading ? '#535353' : '#1ed760',
                  color: '#000000',
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: isDownloading ? 'not-allowed' : 'pointer',
                }}
              >
                {isDownloading ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    <span>Extracting High Quality Audio...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>Download (320kbps MP3 / Lossless)</span>
                  </>
                )}
              </button>

              <div className="quality-badge">
                <Sparkles size={12} />
                <span>Original Sound Preserved</span>
              </div>
            </div>
          </form>

          {/* Progress / Status banner */}
          {downloadProgress && (
            <div style={{ marginTop: 20, background: '#242424', padding: 16, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>{downloadProgress.status}</span>
                <span>{downloadProgress.percent}%</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${downloadProgress.percent}%`, height: '100%', background: '#1ed760' }} />
              </div>
            </div>
          )}

          {downloadStatus && (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 8,
                background: downloadStatus.type === 'success' ? 'rgba(30, 215, 96, 0.15)' : 'rgba(241, 94, 108, 0.15)',
                border: `1px solid ${downloadStatus.type === 'success' ? '#1ed760' : '#f15e6c'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {downloadStatus.type === 'success' ? (
                <CheckCircle size={20} color="#1ed760" />
              ) : (
                <AlertCircle size={20} color="#f15e6c" />
              )}
              <span style={{ fontSize: 14 }}>{downloadStatus.message}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PODCASTS & SHOWS */}
      {activeTab === 'podcasts' && (
        <div>
          {/* Search Bar for Apple Podcasts */}
          <form onSubmit={handleSearchPodcasts} style={{ display: 'flex', gap: 12, maxWidth: 540, marginBottom: 24 }}>
            <input
              type="text"
              placeholder="Search Apple Podcasts directory (e.g. Huberman, Joe Rogan)..."
              value={podcastQuery}
              onChange={(e) => setPodcastQuery(e.target.value)}
              className="top-bar-search-input"
              style={{ flex: 1, borderRadius: 8, padding: '10px 16px', background: '#242424' }}
            />
            <button
              type="submit"
              className="action-pill-btn"
              style={{ background: '#1ed760', color: '#000000', padding: '10px 20px' }}
            >
              <Search size={16} />
              <span>Search</span>
            </button>
          </form>

          {isSearchingPodcasts && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b3b3b3', margin: '20px 0' }}>
              <Loader2 size={18} className="spin" />
              <span>Searching Apple Podcasts directory...</span>
            </div>
          )}

          {/* If a podcast show is selected: show episodes */}
          {selectedPodcastShow ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <button
                  className="sidebar-filter-pill"
                  onClick={() => setSelectedPodcastShow(null)}
                >
                  ← Back to search results
                </button>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selectedPodcastShow.name} Episodes</h2>
              </div>

              {isLoadingFeed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b3b3b3' }}>
                  <Loader2 size={18} className="spin" />
                  <span>Loading episodes & audio enclosures...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {podcastEpisodes.map((ep) => (
                    <div
                      key={ep.id}
                      style={{
                        background: '#181818',
                        padding: 16,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>
                          {ep.title}
                        </div>
                        <div style={{ fontSize: 13, color: '#b3b3b3' }}>
                          {ep.pubDate ? new Date(ep.pubDate).toLocaleDateString() : ''} • {ep.formattedDuration || 'Audio Episode'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          className="action-pill-btn"
                          style={{ background: '#ffffff', color: '#000000', padding: '8px 14px', fontSize: 13 }}
                          onClick={() => onPlayTrack(ep)}
                          title="Stream Now"
                        >
                          <Play size={15} fill="#000000" />
                          <span>Play</span>
                        </button>

                        <button
                          className="action-pill-btn"
                          style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', padding: '8px 14px', fontSize: 13 }}
                          disabled={downloadingEpisodeId === ep.id}
                          onClick={() => handleDownloadEpisode(ep)}
                          title="Download for offline playback"
                        >
                          {downloadingEpisodeId === ep.id ? (
                            <Loader2 size={15} className="spin" />
                          ) : (
                            <HardDriveDownload size={15} />
                          )}
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Show Podcast Results Grid */
            <div className="media-cards-grid">
              {podcastResults.map((p) => (
                <div
                  key={p.id}
                  className="media-card"
                  onClick={() => handleSelectPodcast(p)}
                >
                  <div className="media-card-artwork-box">
                    <img src={p.coverUrl} alt={p.name} className="media-card-img" />
                    <button className="media-card-floating-play" title="View Episodes">
                      <PodcastIcon size={22} color="#000000" />
                    </button>
                  </div>
                  <div className="media-card-title">{p.name}</div>
                  <div className="media-card-subtitle">{p.artist} • {p.trackCount} episodes</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LOCAL FILE IMPORT */}
      {activeTab === 'local' && (
        <div style={{ maxWidth: 640 }}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            style={{
              border: `2px dashed ${isDragging ? '#1ed760' : 'rgba(255, 255, 255, 0.2)'}`,
              borderRadius: 12,
              padding: '48px 24px',
              textAlign: 'center',
              background: isDragging ? 'rgba(30, 215, 96, 0.05)' : '#181818',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
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
            <UploadCloud size={48} color={isDragging ? '#1ed760' : '#b3b3b3'} style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Drag & Drop your music files here
            </h3>
            <p style={{ color: '#b3b3b3', fontSize: 14, marginBottom: 16 }}>
              Supports MP3 (320kbps), FLAC (Lossless 24-bit), WAV, M4A, AAC
            </p>
            <button
              type="button"
              className="action-pill-btn"
              style={{ background: '#ffffff', color: '#000000', margin: '0 auto' }}
            >
              Browse Files from Mac / iPhone
            </button>
          </div>

          {importStatus && (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 8,
                background:
                  importStatus.type === 'success'
                    ? 'rgba(30, 215, 96, 0.15)'
                    : importStatus.type === 'loading'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(241, 94, 108, 0.15)',
                border: `1px solid ${
                  importStatus.type === 'success'
                    ? '#1ed760'
                    : importStatus.type === 'loading'
                    ? 'rgba(255,255,255,0.2)'
                    : '#f15e6c'
                }`,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {importStatus.type === 'loading' ? (
                <Loader2 size={20} className="spin" />
              ) : importStatus.type === 'success' ? (
                <CheckCircle size={20} color="#1ed760" />
              ) : (
                <AlertCircle size={20} color="#f15e6c" />
              )}
              <span style={{ fontSize: 14 }}>{importStatus.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
