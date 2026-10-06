import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Headphones,
  HardDriveDownload,
  ListOrdered,
  Layers,
  FileAudio,
  Check,
  FolderPlus,
  ListMusic,
  Search,
  ExternalLink,
  Plus,
  Flame,
  ArrowRight,
  X,
  Link2,
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
import {
  saveTrack,
  isTrackInPlaylist,
  findDuplicateTrackInLibrary,
} from '../services/storageService';
import { searchYouTube } from '../services/youtubeSearchService';
import { resolvePreviewSource } from '../services/previewAudioService';
import { audioEngine } from '../services/audioEngine';
import {
  getSearchSession,
  saveSearchSession,
  clearSearchSession,
} from '../services/searchSessionService';

const DISCOVERY_CHIPS = [
  { label: 'Top Hits', query: 'popular hits music 2026' },
  { label: 'Daft Punk', query: 'Daft Punk' },
  { label: 'The Weeknd', query: 'The Weeknd' },
  { label: 'Lo-Fi Chill', query: 'lofi hip hop radio beats to relax study to' },
  { label: 'Synthwave', query: 'synthwave chillwave retro' },
  { label: 'Workout EDM', query: 'workout motivation edm gym music' },
  { label: 'Deep Ambient', query: 'ambient sleep meditation chill' },
  { label: 'Indie Vibes', query: 'indie alternative rock essentials' },
];

export default function DownloaderView({
  onTrackAdded,
  onPlayTrack,
  prefilledQuery = '',
  playlists = [],
  tracks = [],
  onOpenCreatePlaylist,
  onAddTrackToPlaylist,
  onAddMultipleTracksToPlaylist,
  toast,
  onDownloadStatusChange,
}) {
  const savedSession = getSearchSession();
  const isInputUrl = (prefilledQuery || '').trim().startsWith('http');
  const [activeTab, setActiveTab] = useState(
    isInputUrl ? 'youtube' : (savedSession?.activeTab || 'search')
  );
  const [downloadMode, setDownloadMode] = useState('single'); // 'single' | 'batch'

  // YouTube Search state (persisted across tab changes and reloads)
  const [searchQuery, setSearchQuery] = useState(
    isInputUrl ? '' : (prefilledQuery || savedSession?.query || '')
  );
  const [searchResults, setSearchResults] = useState(savedSession?.results || []);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(
    Boolean(savedSession?.hasSearched || (savedSession?.results && savedSession.results.length > 0))
  );
  const [downloadingSearchIds, setDownloadingSearchIds] = useState(new Set());
  const [downloadedSearchIds, setDownloadedSearchIds] = useState(
    new Set(savedSession?.downloadedIds || [])
  );

  // Sound Testing / Audio Preview state
  const [previewState, setPreviewState] = useState({
    activeId: null,
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 30,
    volume: 0.85,
    isMuted: false,
    error: null,
    sourceType: 'audio', // 'audio' | 'youtube_embed'
    embedUrl: null,
  });

  const previewAudioRef = useRef(null);

  // Audio Preview Event Listeners & Lifecycle
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const audio = new Audio();
    audio.preload = 'auto';
    previewAudioRef.current = audio;

    const onTimeUpdate = () => {
      setPreviewState((prev) => ({
        ...prev,
        currentTime: audio.currentTime || 0,
        duration: audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) ? audio.duration : prev.duration,
      }));
    };

    const onEnded = () => {
      setPreviewState((prev) => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
      }));
    };

    const onError = () => {
      setPreviewState((prev) => {
        if (!prev.activeId) return prev;
        const currentItem = searchResults.find((r) => r.id === prev.activeId);
        if (currentItem && currentItem.id && !currentItem.id.startsWith('apple_') && prev.sourceType === 'audio') {
          return {
            ...prev,
            sourceType: 'youtube_embed',
            embedUrl: `https://www.youtube-nocookie.com/embed/${currentItem.id}?autoplay=1&enablejsapi=1`,
            isLoading: false,
            isPlaying: true,
            error: null,
          };
        }
        return {
          ...prev,
          isLoading: false,
          isPlaying: false,
          error: 'Preview audio could not be played.',
        };
      });
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch (e) {}
    };
  }, [searchResults]);

  // Sound Testing toggle: Audition track before downloading
  const handleToggleSoundTest = async (item) => {
    if (previewState.activeId === item.id) {
      if (previewState.isPlaying) {
        if (previewAudioRef.current && previewState.sourceType === 'audio') {
          previewAudioRef.current.pause();
        }
        setPreviewState((prev) => ({ ...prev, isPlaying: false }));
      } else {
        if (previewAudioRef.current && previewState.sourceType === 'audio') {
          previewAudioRef.current.play().catch(console.warn);
          setPreviewState((prev) => ({ ...prev, isPlaying: true }));
        }
      }
      return;
    }

    // Stop previous preview
    if (previewAudioRef.current) {
      try {
        previewAudioRef.current.pause();
        previewAudioRef.current.removeAttribute('src');
        previewAudioRef.current.load();
      } catch (e) {}
    }

    // Pause main player if active so the user can test the sound clearly
    if (audioEngine && audioEngine.isPlaying) {
      audioEngine.pause();
    }

    setPreviewState({
      activeId: item.id,
      isPlaying: false,
      isLoading: true,
      currentTime: 0,
      duration: item.durationSec || 30,
      volume: previewState.volume,
      isMuted: previewState.isMuted,
      error: null,
      sourceType: 'audio',
      embedUrl: null,
    });

    try {
      const source = await resolvePreviewSource(item);
      if (!source || !source.url) {
        throw new Error('No audio preview stream available');
      }

      if (source.type === 'youtube_embed') {
        setPreviewState((prev) => ({
          ...prev,
          isLoading: false,
          isPlaying: true,
          sourceType: 'youtube_embed',
          embedUrl: source.url,
        }));
        return;
      }

      const audio = previewAudioRef.current || new Audio();
      previewAudioRef.current = audio;
      audio.src = source.url;
      audio.volume = previewState.isMuted ? 0 : previewState.volume;
      audio.preload = 'auto';

      await audio.play();
      setPreviewState((prev) => ({
        ...prev,
        isLoading: false,
        isPlaying: true,
        sourceType: 'audio',
        duration: audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) ? audio.duration : (item.durationSec || 30),
      }));
    } catch (err) {
      console.warn('Sound test preview notice:', err.message);
      if (item.id && !item.id.startsWith('apple_')) {
        setPreviewState((prev) => ({
          ...prev,
          isLoading: false,
          isPlaying: true,
          sourceType: 'youtube_embed',
          embedUrl: `https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&enablejsapi=1`,
          error: null,
        }));
      } else {
        setPreviewState((prev) => ({
          ...prev,
          isLoading: false,
          isPlaying: false,
          error: 'Could not stream preview for this track.',
        }));
        if (toast) {
          toast.warning('Audio preview stream not available. You can still download the full track!', {
            title: 'Sound Test Notice',
          });
        }
      }
    }
  };

  const handleSeekPreview = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * (previewState.duration || 30);
    if (previewAudioRef.current && previewState.sourceType === 'audio') {
      previewAudioRef.current.currentTime = newTime;
    }
    setPreviewState((prev) => ({ ...prev, currentTime: newTime }));
  };

  const handleTogglePreviewMute = () => {
    const nextMuted = !previewState.isMuted;
    if (previewAudioRef.current && previewState.sourceType === 'audio') {
      previewAudioRef.current.volume = nextMuted ? 0 : previewState.volume;
    }
    setPreviewState((prev) => ({ ...prev, isMuted: nextMuted }));
  };

  const handleChangePreviewVolume = (val) => {
    const v = parseFloat(val);
    if (previewAudioRef.current && previewState.sourceType === 'audio') {
      previewAudioRef.current.volume = v;
    }
    setPreviewState((prev) => ({ ...prev, volume: v, isMuted: v === 0 }));
  };

  const handleStopPreview = () => {
    if (previewAudioRef.current) {
      try {
        previewAudioRef.current.pause();
        previewAudioRef.current.removeAttribute('src');
        previewAudioRef.current.load();
      } catch (e) {}
    }
    setPreviewState((prev) => ({
      ...prev,
      activeId: null,
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      embedUrl: null,
    }));
  };

  const formatPreviewTime = (secs) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Playlist Destination state
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const selectedPlaylist = (playlists || []).find((p) => p.id === selectedPlaylistId);

  // Single Web download state
  const [webUrl, setWebUrl] = useState(isInputUrl ? prefilledQuery : '');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(null);

  // Batch Web download state (max 10)
  const [batchUrlsText, setBatchUrlsText] = useState(savedSession?.batchUrlsText || '');
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

  // 1. Sync prefilledQuery when component is persistently mounted
  useEffect(() => {
    if (!prefilledQuery) return;
    const isUrl = prefilledQuery.trim().startsWith('http');
    if (isUrl) {
      setWebUrl(prefilledQuery);
      setActiveTab('youtube');
    } else {
      setSearchQuery(prefilledQuery);
      setActiveTab('search');
      executeSearch(prefilledQuery);
    }
  }, [prefilledQuery]);

  // 2. Persist Search & Queue State so it remains across tab switches and refreshes (up to 2h)
  useEffect(() => {
    if (searchResults.length > 0 || hasSearched || searchQuery || batchUrlsText) {
      saveSearchSession({
        query: searchQuery,
        results: searchResults,
        hasSearched,
        activeTab,
        downloadedIds: Array.from(downloadedSearchIds),
        batchUrlsText,
      });
    }
  }, [searchQuery, searchResults, hasSearched, activeTab, downloadedSearchIds, batchUrlsText]);

  // 3. Warn before closing or reloading if background downloads are actively in progress
  useEffect(() => {
    const isAnyDownloading =
      isDownloading || isBatchDownloading || downloadingSearchIds.size > 0;

    const handleBeforeUnload = (e) => {
      if (isAnyDownloading) {
        e.preventDefault();
        e.returnValue = 'Downloads are in progress. If you leave or reload now, background downloads will be stopped.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDownloading, isBatchDownloading, downloadingSearchIds.size]);

  // 4. Report active background downloads status to parent (App.jsx)
  useEffect(() => {
    const activeCount =
      downloadingSearchIds.size +
      (isDownloading ? 1 : 0) +
      (isBatchDownloading ? (batchProgress ? Math.max(1, batchProgress.total - batchProgress.current) : 1) : 0);

    if (onDownloadStatusChange) {
      onDownloadStatusChange({
        isDownloading: activeCount > 0,
        count: activeCount,
        singleProgress: downloadProgress,
        batchProgress,
      });
    }
  }, [
    downloadingSearchIds.size,
    isDownloading,
    isBatchDownloading,
    downloadProgress,
    batchProgress,
    onDownloadStatusChange,
  ]);

  // 3. YouTube Search Handler
  const executeSearch = async (queryText) => {
    const q = (queryText ?? searchQuery).trim();
    if (!q) return;

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const items = await searchYouTube(q, 16);
      setSearchResults(items);
      if (items.length === 0) {
        setSearchError(`No tracks found for "${q}". Try another artist or song title.`);
      }
    } catch (err) {
      setSearchError(err.message || 'Unable to load search results. Please check your network or companion server.');
      if (toast) {
        toast.error(err.message || 'YouTube search failed', { title: 'Search Error' });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    executeSearch();
  };

  const handleChipClick = (query) => {
    setSearchQuery(query);
    executeSearch(query);
  };

  // Helper to check if search result item is already in library or playlist
  const checkItemInLibrary = (item) => {
    const candidate = {
      id: `yt_${item.id}`,
      title: item.cleanTitle || item.title,
      artist: item.cleanArtist || item.channel,
      sourceUrl: item.url,
    };
    return findDuplicateTrackInLibrary(candidate, tracks);
  };

  const checkItemInPlaylist = (item) => {
    if (!selectedPlaylist) return false;
    const candidate = {
      id: `yt_${item.id}`,
      title: item.cleanTitle || item.title,
      artist: item.cleanArtist || item.channel,
      sourceUrl: item.url,
    };
    return isTrackInPlaylist(candidate, selectedPlaylist, tracks);
  };

  // 2. Action: Paste link and metadata into Single Downloader Tab
  const handleUseInDownloader = (item) => {
    setWebUrl(item.url);
    setCustomTitle(item.cleanTitle || item.title);
    setCustomArtist(item.cleanArtist || item.channel);
    setActiveTab('youtube');
    setDownloadMode('single');
    if (toast) {
      toast.success(`Pasted "${item.cleanTitle || item.title}" into Link Downloader!`, {
        title: 'Link & Info Ready',
      });
    }
  };

  // 3. Action: 1-Click Fast Download directly from Search Card
  const handleDirectDownloadFromSearch = async (item) => {
    if (downloadingSearchIds.has(item.id)) return;

    setDownloadingSearchIds((prev) => new Set([...prev, item.id]));
    try {
      const track = await downloadFromWebUrl(item.url, {
        title: item.cleanTitle || item.title,
        artist: item.cleanArtist || item.channel,
        coverUrl: item.thumbnail,
        audioUrl: item.audioUrl || item.previewUrl,
        previewUrl: item.previewUrl,
        duration: item.durationSec || 180,
      });

      track.isDownloaded = true;
      onTrackAdded(track, selectedPlaylistId);

      let isDuplicate = false;
      if (selectedPlaylist && selectedPlaylistId) {
        if (isTrackInPlaylist(track, selectedPlaylist, tracks)) {
          isDuplicate = true;
        } else if (onAddTrackToPlaylist) {
          onAddTrackToPlaylist(track.id, selectedPlaylistId);
        }
      }

      setDownloadedSearchIds((prev) => new Set([...prev, item.id]));

      if (toast) {
        if (isDuplicate) {
          toast.info(
            `"${track.title}" saved to Offline Storage (already in "${selectedPlaylist.name}", skipped duplicate)`,
            { title: 'Duplicate skipped in playlist' }
          );
        } else {
          toast.success(
            `"${track.title}" downloaded to ${selectedPlaylist ? `"${selectedPlaylist.name}" & Offline Storage` : 'Offline Storage'}!`,
            { title: 'Download Complete' }
          );
        }
      }
    } catch (err) {
      if (toast) {
        toast.error(err.message || 'Download failed. Please try again.', { title: 'Download Error' });
      }
    } finally {
      setDownloadingSearchIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // 4. Action: Add to Batch Downloader List
  const handleAddToBatch = (item) => {
    const currentUrls = batchUrlsText
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (currentUrls.includes(item.url)) {
      if (toast) toast.info('This video link is already in your batch queue.', { title: 'Already In Batch' });
      return;
    }

    if (currentUrls.length >= 10) {
      if (toast) toast.warning('Batch downloader accepts a maximum of 10 tracks.', { title: 'Batch Full (10/10)' });
      return;
    }

    const updated = batchUrlsText ? `${batchUrlsText.trim()}\n${item.url}` : item.url;
    setBatchUrlsText(updated);
    if (toast) {
      toast.success(`Queued to Batch Downloader (${currentUrls.length + 1}/10)`, {
        title: 'Added to Batch',
      });
    }
  };

  // 5. Handle Single Web / YouTube Download form submit
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
      onTrackAdded(track, selectedPlaylistId);

      let isDuplicate = false;
      if (selectedPlaylist && selectedPlaylistId) {
        if (isTrackInPlaylist(track, selectedPlaylist, tracks)) {
          isDuplicate = true;
        } else if (onAddTrackToPlaylist) {
          onAddTrackToPlaylist(track.id, selectedPlaylistId);
        }
      }

      const destMessage = selectedPlaylist
        ? (isDuplicate
            ? `Saved to Offline Storage (already in "${selectedPlaylist.name}", skipped duplicate)`
            : `Saved to Offline Storage & "${selectedPlaylist.name}"`)
        : 'Saved to Offline Storage';

      setDownloadStatus({
        type: 'success',
        message: `Downloaded "${track.title}" • ${destMessage}`,
      });
      if (toast) {
        if (isDuplicate) {
          toast.info(
            `"${track.title}" saved to Offline Storage (already in "${selectedPlaylist.name}", skipped duplicate)`,
            { title: 'Duplicate skipped in playlist' }
          );
        } else {
          toast.success(
            `"${track.title}" saved to ${selectedPlaylist ? `"${selectedPlaylist.name}" & Offline Storage` : 'Offline Storage'}`,
            { title: 'Download complete' }
          );
        }
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

  // 6. Handle Batch Web Download (Max 10)
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

  // 7. Local file upload (Max 10)
  const handleFiles = async (fileList) => {
    const rawFiles = Array.from(fileList).filter((f) =>
      /\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(f.name)
    );
    if (rawFiles.length === 0) {
      setImportStatus({ type: 'error', message: 'Select valid audio files (MP3, FLAC, WAV, M4A, AAC).' });
      return;
    }

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
          Download & Search Audio
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, margin: 0 }}>
          Find YouTube tracks with built-in search, paste links into the downloader, or upload local audio files.
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

      {/* Active Background Downloads Indicator Banner */}
      {(downloadingSearchIds.size > 0 || isDownloading || isBatchDownloading) && (
        <div
          className="pulse-active-downloads-banner"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.12) 0%, rgba(79, 172, 254, 0.05) 100%)',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            borderRadius: 12,
            padding: '12px 18px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            boxShadow: '0 4px 20px rgba(0, 242, 254, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(0, 242, 254, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Loader2 size={18} className="spin" color="#00f2fe" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>
                  Downloading {downloadingSearchIds.size + (isDownloading ? 1 : 0) + (isBatchDownloading ? (batchProgress ? Math.max(1, batchProgress.total - batchProgress.current) : 1) : 0)} track(s) in background...
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '2px 7px',
                    borderRadius: 12,
                    background: 'rgba(0, 242, 254, 0.2)',
                    color: '#00f2fe',
                    border: '1px solid rgba(0, 242, 254, 0.4)',
                  }}
                >
                  Running
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                Downloads run in the background until finished. You can freely browse other playlists and library views!
              </div>
            </div>
          </div>
          {isBatchDownloading && batchProgress && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 120 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pulse-accent)' }}>
                {batchProgress.current} / {batchProgress.total} finished
              </span>
              <div style={{ width: 120, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                <div style={{ width: `${batchProgress.percent}%`, height: '100%', background: 'linear-gradient(90deg, #00f2fe, #4facfe)', transition: 'width 0.3s' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Tabs */}
      <div className="pulse-tab-bar" style={{ marginBottom: 18 }}>
        <button
          className={`pulse-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <Search size={14} />
          <span>YouTube Search</span>
        </button>

        <button
          className={`pulse-tab ${activeTab === 'youtube' ? 'active' : ''}`}
          onClick={() => setActiveTab('youtube')}
        >
          <YoutubeIcon size={14} />
          <span>Link Downloader</span>
        </button>

        <button
          className={`pulse-tab ${activeTab === 'local' ? 'active' : ''}`}
          onClick={() => setActiveTab('local')}
        >
          <UploadCloud size={14} />
          <span>Local Files (Upload up to 10)</span>
        </button>
      </div>

      {/* TAB 1: BUILT-IN YOUTUBE SEARCH */}
      {activeTab === 'search' && (
        <div className="youtube-search-container" style={{ maxWidth: 780 }}>
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="youtube-search-bar">
            <Search size={18} color="var(--pulse-accent)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search songs, artists, albums, or paste YouTube link..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="youtube-search-input"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Clear input"
              >
                <X size={15} />
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="aura-btn-primary"
              style={{
                padding: '7px 18px',
                fontSize: 12.5,
                borderRadius: 'var(--radius-pill)',
                flexShrink: 0,
              }}
            >
              {isSearching ? (
                <>
                  <Loader2 size={14} className="spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <span>Search</span>
              )}
            </button>
          </form>

          {/* Quick Discovery Chips */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              margin: '2px 0 6px',
            }}
          >
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Flame size={12} color="var(--pulse-accent)" />
              <span>Trending:</span>
            </span>
            {DISCOVERY_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                className="youtube-chip"
                onClick={() => handleChipClick(chip.query)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Loading Indicator */}
          {isSearching && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                gap: 12,
                color: 'var(--text-secondary)',
              }}
            >
              <Loader2 size={32} className="spin" color="var(--pulse-accent)" />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Searching YouTube tracks in real-time...</span>
            </div>
          )}

          {/* Error Message */}
          {searchError && !isSearching && (
            <div className="pulse-status-banner error" style={{ margin: '8px 0' }}>
              <AlertCircle size={18} />
              <span>{searchError}</span>
            </div>
          )}

          {/* Search Results List */}
          {!isSearching && searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0 4px',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Found {searchResults.length} YouTube Tracks
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchResults([]);
                      setSearchQuery('');
                      setHasSearched(false);
                      clearSearchSession();
                      handleStopPreview();
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 4,
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      cursor: 'pointer',
                      padding: '2px 7px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title="Clear search results"
                  >
                    <X size={11} />
                    <span>Clear Search</span>
                  </button>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Click "Test Sound" to audition beat, or "Download" directly
                </span>
              </div>

              {searchResults.map((item) => {
                const inLibrary = checkItemInLibrary(item);
                const inPlaylist = checkItemInPlaylist(item);
                const isItemDownloading = downloadingSearchIds.has(item.id);
                const isItemDownloaded = downloadedSearchIds.has(item.id) || Boolean(inLibrary);
                const isActivePreview = previewState.activeId === item.id;

                return (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className={`youtube-result-card ${isActivePreview ? 'is-previewing' : ''}`}>
                      {/* Thumbnail with Quick Play Overlay */}
                      <div className="youtube-thumb-wrapper">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="youtube-thumb-img"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              background: 'var(--pulse-surface)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Music size={22} color="var(--text-muted)" />
                          </div>
                        )}
                        {item.duration && (
                          <span className="youtube-duration-badge">{item.duration}</span>
                        )}

                        {/* Thumbnail Sound Test Play Overlay */}
                        <div
                          className={`youtube-thumb-play-overlay ${isActivePreview && previewState.isPlaying ? 'is-active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSoundTest(item);
                          }}
                          title={isActivePreview && previewState.isPlaying ? 'Pause sound test' : 'Test sound of this track'}
                        >
                          {isActivePreview && previewState.isLoading ? (
                            <Loader2 size={20} className="spin" color="#00f2fe" />
                          ) : isActivePreview && previewState.isPlaying ? (
                            <Pause size={20} color="#00f2fe" />
                          ) : (
                            <Play size={20} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
                          )}
                        </div>
                      </div>

                      {/* Meta info */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: 13.5,
                              lineHeight: 1.35,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%',
                            }}
                            title={item.title}
                          >
                            {item.cleanTitle || item.title}
                          </span>

                          {/* Duplicate Badges */}
                          {isItemDownloaded && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: '#10b981',
                                background: 'rgba(16, 185, 129, 0.14)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                padding: '1px 6px',
                                borderRadius: 4,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <Check size={10} />
                              <span>In Library</span>
                            </span>
                          )}

                          {selectedPlaylist && inPlaylist && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: 'var(--pulse-accent)',
                                background: 'rgba(0, 242, 254, 0.12)',
                                border: '1px solid rgba(0, 242, 254, 0.3)',
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}
                            >
                              ✓ In {selectedPlaylist.name}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--pulse-accent-subtle, #a0aec0)' }}>
                            {item.cleanArtist || item.channel}
                          </span>
                          {item.views && (
                            <>
                              <span style={{ color: 'var(--text-muted)' }}>•</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{item.views}</span>
                            </>
                          )}
                          {item.publishedTime && (
                            <>
                              <span style={{ color: 'var(--text-muted)' }}>•</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{item.publishedTime}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions Column */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {/* Button 0: Test Sound / Preview */}
                        <button
                          type="button"
                          onClick={() => handleToggleSoundTest(item)}
                          className={`pulse-test-sound-btn ${isActivePreview && previewState.isPlaying ? 'active' : ''}`}
                          title={isActivePreview && previewState.isPlaying ? 'Pause sound test' : 'Test sound of track before downloading'}
                        >
                          {isActivePreview && previewState.isLoading ? (
                            <>
                              <Loader2 size={13} className="spin" />
                              <span>Loading...</span>
                            </>
                          ) : isActivePreview && previewState.isPlaying ? (
                            <>
                              <Pause size={13} />
                              <span>Testing...</span>
                            </>
                          ) : (
                            <>
                              <Play size={13} fill="currentColor" />
                              <span>Test Sound</span>
                            </>
                          )}
                        </button>

                        {/* Button 1: Paste Link into Downloader */}
                        <button
                          type="button"
                          onClick={() => handleUseInDownloader(item)}
                          className="aura-btn-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: 11.5,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                          title="Paste link and metadata directly into the Downloader tab"
                        >
                          <Link2 size={13} color="var(--pulse-accent)" />
                          <span>Paste Link</span>
                        </button>

                        {/* Button 2: 1-Click Fast Download */}
                        <button
                          type="button"
                          onClick={() => handleDirectDownloadFromSearch(item)}
                          disabled={isItemDownloading}
                          className="aura-btn-primary"
                          style={{
                            padding: '6px 14px',
                            fontSize: 11.5,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                          title={selectedPlaylist ? `Download to "${selectedPlaylist.name}" & Offline Storage` : 'Download to Offline Storage'}
                        >
                          {isItemDownloading ? (
                            <>
                              <Loader2 size={13} className="spin" />
                              <span>Extracting...</span>
                            </>
                          ) : isItemDownloaded ? (
                            <>
                              <CheckCircle size={13} color="#10b981" />
                              <span>Saved</span>
                            </>
                          ) : (
                            <>
                              <Download size={13} />
                              <span>Download</span>
                            </>
                          )}
                        </button>

                        {/* Button 3: Add to batch */}
                        <button
                          type="button"
                          onClick={() => handleAddToBatch(item)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                          title="Add link to batch downloader list"
                        >
                          <Plus size={13} />
                          <span>Batch</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Sound Testing Audition Bar */}
                    {isActivePreview && (
                      <div className="youtube-preview-audition-bar">
                        <div className="preview-audition-header">
                          <div className="preview-audition-tag">
                            <Headphones size={13} color="var(--pulse-accent)" />
                            <span style={{ fontWeight: 700, fontSize: 11.5, color: '#00f2fe' }}>
                              {previewState.isLoading
                                ? 'Buffering Audio Stream...'
                                : previewState.isPlaying
                                ? 'Testing Sound (Lossless Stream)'
                                : 'Audio Paused'}
                            </span>
                            {/* Animated equalizer bars */}
                            {previewState.isPlaying && (
                              <div className="pulse-soundbars">
                                <span className="pulse-bar bar-1"></span>
                                <span className="pulse-bar bar-2"></span>
                                <span className="pulse-bar bar-3"></span>
                                <span className="pulse-bar bar-4"></span>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => handleDirectDownloadFromSearch(item)}
                              disabled={isItemDownloading}
                              className="aura-btn-primary"
                              style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 700,
                                background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                                color: '#000000',
                              }}
                              title="Download this track to your library"
                            >
                              <Download size={12} />
                              <span>Sounds Good • Download Now</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleStopPreview}
                              className="preview-close-btn"
                              title="Close sound preview"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Scrub & Volume Row */}
                        {previewState.sourceType === 'audio' && (
                          <div className="preview-player-controls">
                            <button
                              type="button"
                              onClick={() => handleToggleSoundTest(item)}
                              className="preview-play-btn"
                              title={previewState.isPlaying ? 'Pause' : 'Play'}
                            >
                              {previewState.isPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
                            </button>

                            <span className="preview-time-badge">
                              {formatPreviewTime(previewState.currentTime)}
                            </span>

                            {/* Clickable Seek / Scrubber Bar */}
                            <div
                              className="preview-seek-track"
                              onClick={handleSeekPreview}
                              title="Click to seek beat/drop"
                            >
                              <div
                                className="preview-seek-fill"
                                style={{
                                  width: `${Math.min(100, Math.max(0, (previewState.currentTime / (previewState.duration || 30)) * 100))}%`,
                                }}
                              />
                            </div>

                            <span className="preview-time-badge muted">
                              {formatPreviewTime(previewState.duration)}
                            </span>

                            {/* Volume & Mute */}
                            <div className="preview-volume-group">
                              <button
                                type="button"
                                onClick={handleTogglePreviewMute}
                                className="preview-vol-btn"
                                title={previewState.isMuted ? 'Unmute' : 'Mute'}
                              >
                                {previewState.isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                              </button>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={previewState.isMuted ? 0 : previewState.volume}
                                onChange={(e) => handleChangePreviewVolume(e.target.value)}
                                className="preview-vol-slider"
                                title="Preview volume"
                              />
                            </div>
                          </div>
                        )}

                        {/* YouTube Embed Player Fallback if stream requires it */}
                        {previewState.sourceType === 'youtube_embed' && previewState.embedUrl && (
                          <div className="preview-embed-container">
                            <iframe
                              src={previewState.embedUrl}
                              title={`Preview ${item.title}`}
                              allow="autoplay; encrypted-media"
                              className="preview-embed-iframe"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Initial Search Helper State */}
          {!hasSearched && !isSearching && (
            <div
              style={{
                background: 'var(--pulse-surface)',
                border: '1px dashed var(--border-medium)',
                borderRadius: 12,
                padding: '36px 24px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                marginTop: 8,
              }}
            >
              <Search size={36} color="var(--pulse-accent)" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.8 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                Search YouTube Without Leaving Pulse
              </h3>
              <p style={{ fontSize: 13, maxWidth: 460, margin: '0 auto 18px', color: 'var(--text-muted)' }}>
                Type any track name or artist above, or click one of the trending tags.
                You can 1-click download tracks or paste links directly into the downloader.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: YOUTUBE & WEB LINK DOWNLOADER */}
      {activeTab === 'youtube' && (
        <div style={{ maxWidth: 640 }}>
          {/* Shortcut Banner to YouTube Search */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.08) 0%, rgba(79, 172, 254, 0.02) 100%)',
              border: '1px solid rgba(0, 242, 254, 0.25)',
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Search size={16} color="var(--pulse-accent)" />
              <span style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 600 }}>
                Looking for a track? Find it in our built-in YouTube search without opening a browser.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              style={{
                background: 'var(--pulse-accent)',
                color: '#000000',
                border: 'none',
                borderRadius: 6,
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
              }}
            >
              <span>Search YouTube</span>
              <ArrowRight size={12} />
            </button>
          </div>

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

      {/* TAB 3: LOCAL FILE IMPORT (UP TO 10 FILES) */}
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
