import React, { useState, useEffect, useCallback, useRef } from 'react';
import { audioEngine } from './services/audioEngine';
import {
  getAllTracks,
  saveTrack,
  deleteTrack as removeTrackFromDB,
  getLikedIds,
  toggleLike as toggleLikeInDB,
  getAllPlaylists,
  savePlaylist,
  deletePlaylist as removePlaylistFromDB,
} from './services/storageService';
import { SAMPLE_TRACKS } from './services/musicDownloaderService';

// Components
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import PlayerBar from './components/PlayerBar';
import MobileBottomNav from './components/MobileBottomNav';
import MobileMiniPlayer from './components/MobileMiniPlayer';
import MobileFullPlayer from './components/MobileFullPlayer';
import HomeView from './components/HomeView';
import LibraryView from './components/LibraryView';
import DownloaderView from './components/DownloaderView';
import LyricsView from './components/LyricsView';
import EqualizerModal from './components/EqualizerModal';
import QueueModal from './components/QueueModal';
import ShareModal from './components/ShareModal';
import SupabaseModal from './components/SupabaseModal';
import AuthModal from './components/AuthModal';
import CreatePlaylistModal from './components/CreatePlaylistModal';
import { ToastContainer, useToast } from './components/ToastNotification';
import { getCurrentUser, subscribeAuthChange } from './services/authService';

export default function App() {
  // User Authentication State
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Toast notification system
  const { toasts, toast, removeToast } = useToast();

  // Navigation & View State
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'playlist' | 'downloader' | 'lyrics'
  const [viewHistory, setViewHistory] = useState(['home']);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [sidebarFilter, setSidebarFilter] = useState('all');
  const [prefilledDownloaderQuery, setPrefilledDownloaderQuery] = useState('');

  // Modals & Overlays
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [showFullMobilePlayer, setShowFullMobilePlayer] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [pendingAddTrackId, setPendingAddTrackId] = useState(null);

  // Library & Audio Data
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('all'); // 'off' | 'all' | 'one'

  // Refs for current values inside event callbacks
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const isShuffleRef = useRef(isShuffle);
  isShuffleRef.current = isShuffle;
  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;

  // Initialize Library & Seed Sample Tracks if fresh install
  useEffect(() => {
    async function initDB() {
      try {
        let dbTracks = await getAllTracks();
        if (!dbTracks || dbTracks.length === 0) {
          // Seed with high quality sample tracks
          for (const st of SAMPLE_TRACKS) {
            await saveTrack(st);
          }
          dbTracks = await getAllTracks();
        }
        setTracks(dbTracks);

        const dbPlaylists = await getAllPlaylists();
        setPlaylists(dbPlaylists);

        const dbLiked = await getLikedIds();
        setLikedIds(dbLiked);

        // Preload first track if available
        if (dbTracks.length > 0 && !currentTrackRef.current) {
          setCurrentTrack(dbTracks[0]);
          audioEngine.loadTrack(dbTracks[0]);
        }
      } catch (err) {
        console.error('Database initialization error:', err);
      }
    }
    initDB();

    // Check user authentication
    getCurrentUser().then((u) => setUser(u));
    const unsubscribe = subscribeAuthChange((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Play a specific track
  const handlePlayTrack = useCallback(async (track, newQueue = null) => {
    setCurrentTrack(track);
    currentTrackRef.current = track;

    if (newQueue) {
      setQueue(newQueue.filter((t) => t.id !== track.id));
    } else {
      // Build natural next queue from current tracks list
      const idx = tracksRef.current.findIndex((t) => t.id === track.id);
      if (idx !== -1) {
        setQueue(tracksRef.current.slice(idx + 1));
      }
    }

    try {
      await audioEngine.loadTrack(track);
      await audioEngine.play();
    } catch (e) {
      console.warn('Playback gesture required:', e);
    }
  }, []);

  // Next Track Logic
  const handleNextTrack = useCallback(() => {
    if (repeatModeRef.current === 'one' && currentTrackRef.current) {
      audioEngine.seek(0);
      audioEngine.play();
      return;
    }

    // Check if next song is in custom queue
    if (queueRef.current.length > 0) {
      const nextSong = queueRef.current[0];
      setQueue((prev) => prev.slice(1));
      handlePlayTrack(nextSong);
      return;
    }

    // Fallback: pick next in current tracks array
    const all = tracksRef.current;
    if (all.length === 0) return;

    if (isShuffleRef.current) {
      const randomIndex = Math.floor(Math.random() * all.length);
      handlePlayTrack(all[randomIndex]);
      return;
    }

    const currentIndex = all.findIndex((t) => t.id === currentTrackRef.current?.id);
    if (currentIndex !== -1 && currentIndex + 1 < all.length) {
      handlePlayTrack(all[currentIndex + 1]);
    } else if (repeatModeRef.current === 'all') {
      handlePlayTrack(all[0]);
    }
  }, [handlePlayTrack]);

  // Previous Track Logic
  const handlePrevTrack = useCallback(() => {
    if (currentTime > 3) {
      audioEngine.seek(0);
      return;
    }
    const all = tracksRef.current;
    if (all.length === 0) return;

    const currentIndex = all.findIndex((t) => t.id === currentTrackRef.current?.id);
    if (currentIndex > 0) {
      handlePlayTrack(all[currentIndex - 1]);
    } else {
      handlePlayTrack(all[all.length - 1]);
    }
  }, [currentTime, handlePlayTrack]);

  // Audio Engine Event Listeners
  useEffect(() => {
    const unsubTime = audioEngine.on('timeUpdate', ({ currentTime, duration }) => {
      setCurrentTime(currentTime);
      if (duration && isFinite(duration)) setDuration(duration);
    });

    const unsubDuration = audioEngine.on('durationChange', (dur) => {
      if (dur && isFinite(dur)) setDuration(dur);
    });

    const unsubPlayState = audioEngine.on('playState', (playing) => {
      setIsPlaying(playing);
    });

    const unsubEnded = audioEngine.on('ended', () => {
      handleNextTrack();
    });

    const unsubNextReq = audioEngine.on('nextTrackRequest', () => {
      handleNextTrack();
    });

    const unsubPrevReq = audioEngine.on('prevTrackRequest', () => {
      handlePrevTrack();
    });

    return () => {
      unsubTime();
      unsubDuration();
      unsubPlayState();
      unsubEnded();
      unsubNextReq();
      unsubPrevReq();
    };
  }, [handleNextTrack, handlePrevTrack]);

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    audioEngine.togglePlay();
  };

  // Seek
  const handleSeek = (seconds) => {
    audioEngine.seek(seconds);
    setCurrentTime(seconds);
  };

  // Volume
  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    audioEngine.setVolume(newVol);
  };

  // Shuffle toggle
  const handleToggleShuffle = () => {
    setIsShuffle((prev) => !prev);
  };

  // Repeat toggle ('off' -> 'all' -> 'one' -> 'off')
  const handleToggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  // Toggle Like
  const handleToggleLike = async (trackId = null) => {
    const id = trackId || currentTrack?.id;
    if (!id) return;
    const isNowLiked = await toggleLikeInDB(id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (isNowLiked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // Delete Track from Library
  const handleDeleteTrack = async (id) => {
    await removeTrackFromDB(id);
    setTracks((prev) => prev.filter((t) => t.id !== id));
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (currentTrack?.id === id) {
      audioEngine.pause();
      const remaining = tracks.filter((t) => t.id !== id);
      if (remaining.length > 0) {
        handlePlayTrack(remaining[0]);
      } else {
        setCurrentTrack(null);
      }
    }
  };

  // Create New Playlist via Floating Modal
  const handleCreatePlaylist = () => {
    setShowCreatePlaylistModal(true);
  };

  const handlePlaylistCreated = (newPlaylist) => {
    // If a track was pending to be added (via context menu "New playlist…"), add it now
    if (pendingAddTrackId) {
      const updated = { ...newPlaylist, trackIds: [pendingAddTrackId] };
      savePlaylist(updated).catch(console.error);
      setPlaylists((prev) => [...prev, updated]);
      setPendingAddTrackId(null);
    } else {
      setPlaylists((prev) => [...prev, newPlaylist]);
    }
    setSelectedPlaylistId(newPlaylist.id);
    setCurrentView('playlist');
  };

  // Add track to a playlist (without navigating away)
  const handleAddTrackToPlaylist = useCallback(async (trackId, targetPlaylistId) => {
    if (targetPlaylistId === '__new__') {
      // Open the create-playlist modal; track will be added after creation via a pending ref
      setPendingAddTrackId(trackId);
      setShowCreatePlaylistModal(true);
      return;
    }
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== targetPlaylistId) return pl;
        if (pl.trackIds?.includes(trackId)) return pl;
        const updated = { ...pl, trackIds: [...(pl.trackIds || []), trackId] };
        savePlaylist(updated).catch(console.error);
        return updated;
      })
    );
    toast.success('Added to playlist', { title: 'Done' });
  }, [toast]);

  // Remove track from a specific playlist only (does NOT delete from library)
  const handleRemoveTrackFromPlaylist = useCallback(async (trackId, targetPlaylistId) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== targetPlaylistId) return pl;
        const updated = { ...pl, trackIds: (pl.trackIds || []).filter((id) => id !== trackId) };
        savePlaylist(updated).catch(console.error);
        return updated;
      })
    );
    toast.info('Removed from playlist', { title: 'Done' });
  }, [toast]);

  // Open Downloader with optional query
  const handleOpenDownloader = (query = '') => {
    setPrefilledDownloaderQuery(query);
    setCurrentView('downloader');
  };

  // Navigation History
  const navigateTo = (view) => {
    setViewHistory((prev) => [...prev, view]);
    setCurrentView(view);
  };

  const handleGoBack = () => {
    if (viewHistory.length > 1) {
      const newHist = [...viewHistory];
      newHist.pop();
      const prevView = newHist[newHist.length - 1];
      setViewHistory(newHist);
      setCurrentView(prevView);
    }
  };

  return (
    <div className="aura-app-layout">
      {/* Main Body (Sidebar + Central Content View) */}
      <div className="aura-main-wrapper">
        {/* Desktop Sidebar */}
        <Sidebar
          currentView={currentView}
          setCurrentView={navigateTo}
          playlists={playlists}
          likedCount={likedIds.size}
          user={user}
          onOpenAuth={() => setShowAuthModal(true)}
          onCreatePlaylist={handleCreatePlaylist}
          onOpenEqualizer={() => setShowEqualizer(true)}
          onOpenShare={() => setShowShare(true)}
          onOpenSupabase={() => setShowSupabaseModal(true)}
          activeFilter={sidebarFilter}
          setActiveFilter={setSidebarFilter}
          selectedPlaylistId={selectedPlaylistId}
          setSelectedPlaylistId={setSelectedPlaylistId}
        />

        {/* Central Viewport */}
        <main className="aura-main-content">
          <TopBar
            currentView={currentView}
            user={user}
            onOpenAuth={() => setShowAuthModal(true)}
            onOpenShare={() => setShowShare(true)}
            onOpenEqualizer={() => setShowEqualizer(true)}
            onOpenSupabase={() => setShowSupabaseModal(true)}
            currentTrack={currentTrack}
            onOpenDownloader={() => setCurrentView('downloader')}
            canGoBack={viewHistory.length > 1}
            onGoBack={handleGoBack}
          />

          {/* Pure Playlists & Collection Main View */}
          {currentView === 'home' && (
            <HomeView
              playlists={playlists}
              tracks={tracks}
              likedCount={likedIds.size}
              onPlayTrack={handlePlayTrack}
              onOpenPlaylist={(type) => {
                setSelectedPlaylistId(type);
                setCurrentView('playlist');
              }}
              onCreatePlaylist={handleCreatePlaylist}
              onOpenDownloader={() => setCurrentView('downloader')}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
            />
          )}

          {(currentView === 'library' || currentView === 'playlist') && (
            <LibraryView
              playlistId={selectedPlaylistId}
              playlists={playlists}
              tracks={tracks}
              likedIds={likedIds}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onTogglePlay={handleTogglePlay}
              onToggleLike={handleToggleLike}
              onDeleteTrack={handleDeleteTrack}
              onAddTrackToPlaylist={handleAddTrackToPlaylist}
              onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
              onBack={() => {
                setSelectedPlaylistId(null);
                setCurrentView('home');
              }}
              onOpenDownloader={() => setCurrentView('downloader')}
              onOpenCreatePlaylist={() => setShowCreatePlaylistModal(true)}
              toast={toast}
            />
          )}

          {currentView === 'downloader' && (
            <DownloaderView
              prefilledQuery={prefilledDownloaderQuery}
              onTrackAdded={(newTrack) => {
                setTracks((prev) => [newTrack, ...prev]);
                handlePlayTrack(newTrack);
              }}
              onPlayTrack={handlePlayTrack}
              toast={toast}
            />
          )}

          {currentView === 'lyrics' && (
            <LyricsView
              currentTrack={currentTrack}
              currentTime={currentTime}
              onSeek={handleSeek}
              onClose={() => setCurrentView('home')}
              onTrackUpdated={(updated) => {
                setTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                setCurrentTrack(updated);
              }}
            />
          )}
        </main>
      </div>

      {/* Desktop Player Bar */}
      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isLiked={currentTrack ? likedIds.has(currentTrack.id) : false}
        showLyrics={currentView === 'lyrics'}
        showQueue={showQueue}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrevTrack}
        onNext={handleNextTrack}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLike={() => handleToggleLike()}
        onToggleLyrics={() => setCurrentView(currentView === 'lyrics' ? 'home' : 'lyrics')}
        onToggleQueue={() => setShowQueue(!showQueue)}
        onOpenEqualizer={() => setShowEqualizer(true)}
        onOpenFullscreen={() => setShowFullMobilePlayer(true)}
      />

      {/* Mobile Floating MiniPlayer (Above Navigation Bar) */}
      <MobileMiniPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        isLiked={currentTrack ? likedIds.has(currentTrack.id) : false}
        onTogglePlay={handleTogglePlay}
        onNext={handleNextTrack}
        onToggleLike={() => handleToggleLike()}
        onOpenFullscreen={() => setShowFullMobilePlayer(true)}
      />

      {/* Mobile Bottom Navigation Bar (iPhone & Android) */}
      <MobileBottomNav
        currentView={currentView}
        setCurrentView={navigateTo}
        user={user}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenShare={() => setShowShare(true)}
      />

      {/* Fullscreen Mobile Player Overlay */}
      <MobileFullPlayer
        isOpen={showFullMobilePlayer}
        onClose={() => setShowFullMobilePlayer(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        isLiked={currentTrack ? likedIds.has(currentTrack.id) : false}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrevTrack}
        onNext={handleNextTrack}
        onSeek={handleSeek}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLike={() => handleToggleLike()}
        onOpenLyrics={() => {
          setShowFullMobilePlayer(false);
          setCurrentView('lyrics');
        }}
        onOpenEqualizer={() => setShowEqualizer(true)}
        onOpenShare={() => setShowShare(true)}
        onOpenSupabase={() => setShowSupabaseModal(true)}
      />

      {/* Modals */}
      <EqualizerModal isOpen={showEqualizer} onClose={() => setShowEqualizer(false)} />

      <QueueModal
        isOpen={showQueue}
        onClose={() => setShowQueue(false)}
        currentTrack={currentTrack}
        queue={queue}
        onPlayTrack={handlePlayTrack}
        onRemoveFromQueue={(idx) => setQueue((prev) => prev.filter((_, i) => i !== idx))}
        onClearQueue={() => setQueue([])}
      />

      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        tracks={tracks}
        playlists={playlists}
        toast={toast}
      />

      <SupabaseModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        user={user}
        onAuthSuccess={(u) => setUser(u)}
      />

      <CreatePlaylistModal
        isOpen={showCreatePlaylistModal}
        onClose={() => setShowCreatePlaylistModal(false)}
        onPlaylistCreated={handlePlaylistCreated}
        currentTrackId={currentTrack?.id}
        toast={toast}
      />

      {/* In-App Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
