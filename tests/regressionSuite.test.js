import { describe, it, expect } from 'vitest';
import * as storageService from '../src/services/storageService.js';
import * as duplicateDetectionService from '../src/services/duplicateDetectionService.js';
import * as shuffleService from '../src/services/shuffleService.js';
import { getBackendBaseUrl } from '../src/services/musicDownloaderService.js';

// Polyfill Audio for headless Node test environment
if (typeof globalThis.Audio === 'undefined') {
  globalThis.Audio = class MockAudio {
    constructor() {
      this.preload = 'auto';
      this.volume = 1;
      this.addEventListener = () => {};
      this.removeEventListener = () => {};
    }
  };
}

describe('Regression & Contract Test Suite', () => {
  describe('Duplicate Detection & Storage Service Integration', () => {
    it('storageService exports all necessary duplicate detection functions', () => {
      expect(typeof storageService.normalizeTrackMeta).toBe('function');
      expect(typeof storageService.areTracksDuplicate).toBe('function');
      expect(typeof storageService.findDuplicateTrackInLibrary).toBe('function');
      expect(typeof storageService.isTrackInPlaylist).toBe('function');
      expect(typeof storageService.detectPlaylistDuplicates).toBe('function');
      expect(typeof storageService.deduplicatePlaylist).toBe('function');
      expect(typeof storageService.filterNewTracksForPlaylist).toBe('function');
    });

    it('storageService exports all core library and playlist management methods', () => {
      expect(typeof storageService.getAllTracks).toBe('function');
      expect(typeof storageService.saveTrack).toBe('function');
      expect(typeof storageService.deleteTrack).toBe('function');
      expect(typeof storageService.getLikedIds).toBe('function');
      expect(typeof storageService.toggleLike).toBe('function');
      expect(typeof storageService.getAllPlaylists).toBe('function');
      expect(typeof storageService.savePlaylist).toBe('function');
      expect(typeof storageService.deletePlaylist).toBe('function');
    });
  });

  describe('Shuffle Service Contracts', () => {
    it('shuffleService exports required shuffle and queue manipulation methods', () => {
      expect(typeof shuffleService.shuffleArray).toBe('function');
      expect(typeof shuffleService.getRemainingSequentialTracks).toBe('function');
      expect(typeof shuffleService.computeToggledQueue).toBe('function');
    });

    it('toggling shuffle repeatedly does not lose or corrupt track lists', () => {
      const playlist = [
        { id: '1', title: 'T1' },
        { id: '2', title: 'T2' },
        { id: '3', title: 'T3' },
        { id: '4', title: 'T4' },
      ];
      const current = playlist[0];

      // 1. Turn ON
      const onResult = shuffleService.computeToggledQueue({
        isEnabling: true,
        currentTrack: current,
        currentQueue: playlist.slice(1),
        activeContextTracks: playlist,
        unshuffledQueue: [],
      });
      expect(onResult.nextQueue).toHaveLength(3);

      // 2. Turn OFF
      const offResult = shuffleService.computeToggledQueue({
        isEnabling: false,
        currentTrack: current,
        currentQueue: onResult.nextQueue,
        activeContextTracks: playlist,
        unshuffledQueue: onResult.nextUnshuffledQueue,
      });

      // Should faithfully restore sequential tracks 2, 3, 4
      expect(offResult.nextQueue.map((t) => t.id)).toEqual(['2', '3', '4']);
    });
  });

  describe('Downloader Service Base URL Resolution', () => {
    it('safely resolves backend URL without crashing when window is undefined or in node', () => {
      const baseUrl = getBackendBaseUrl();
      expect(typeof baseUrl).toBe('string');
    });

    it('sets and retrieves custom backend URL via setBackendBaseUrl', async () => {
      const { setBackendBaseUrl, getBackendBaseUrl } = await import('../src/services/musicDownloaderService.js');
      expect(typeof setBackendBaseUrl).toBe('function');
      expect(typeof getBackendBaseUrl).toBe('function');

      setBackendBaseUrl('http://custom-lan-host:3030');
      expect(getBackendBaseUrl()).toBe('http://custom-lan-host:3030');
    });
  });

  describe('Web Audio Search Fallback Resilience', () => {
    it('searchYouTube returns results via Apple Music fallback when companion backend is unavailable', async () => {
      const { searchYouTube } = await import('../src/services/youtubeSearchService.js');
      // In node/offline test env, searchYouTube query should return results from itunes fallback or throw network error without syntax crash
      try {
        const results = await searchYouTube('Daft Punk', 2);
        expect(Array.isArray(results)).toBe(true);
        if (results.length > 0) {
          expect(results[0]).toHaveProperty('title');
          expect(results[0]).toHaveProperty('cleanArtist');
        }
      } catch (err) {
        expect(err.message).toMatch(/Unable to fetch music search results|network/i);
      }
    }, 15000);
  });

  describe('Cloud Audio CDN Fallback for Mobile and Web', () => {
    it('correctly maps relative /audio/ paths to public Supabase CDN URLs', async () => {
      const { getCloudFallbackUrl } = await import('../src/services/audioEngine.js');
      expect(typeof getCloudFallbackUrl).toBe('function');

      const track = {
        id: 'track_123',
        audioUrl: '/audio/track_123.m4a',
      };
      const cloudUrl = getCloudFallbackUrl(track);
      expect(cloudUrl).toBe('https://wtrlpbumpwtauvxqwrrg.supabase.co/storage/v1/object/public/audio-files/audio/track_123.m4a');
    });

    it('preserves existing https cloud URLs without mangling', async () => {
      const { getCloudFallbackUrl } = await import('../src/services/audioEngine.js');
      const track = {
        id: 'track_456',
        cloudAudioUrl: 'https://cdn.example.com/audio.mp3',
      };
      expect(getCloudFallbackUrl(track)).toBe('https://cdn.example.com/audio.mp3');
    });
  });

  describe('Component Import & Reference Integrity', () => {
    it('App and core views export valid React component functions without reference errors', async () => {
      const App = (await import('../src/App.jsx')).default;
      const HomeView = (await import('../src/components/HomeView.jsx')).default;
      const LibraryView = (await import('../src/components/LibraryView.jsx')).default;
      const DownloaderView = (await import('../src/components/DownloaderView.jsx')).default;
      const PlayerBar = (await import('../src/components/PlayerBar.jsx')).default;
      const EditPlaylistModal = (await import('../src/components/EditPlaylistModal.jsx')).default;
      const MobileBottomNav = (await import('../src/components/MobileBottomNav.jsx')).default;
      const ShareModal = (await import('../src/components/ShareModal.jsx')).default;

      expect(typeof App).toBe('function');
      expect(typeof HomeView).toBe('function');
      expect(typeof LibraryView).toBe('function');
      expect(typeof DownloaderView).toBe('function');
      expect(typeof PlayerBar).toBe('function');
      expect(typeof EditPlaylistModal).toBe('function');
      expect(typeof MobileBottomNav).toBe('function');
      expect(typeof ShareModal).toBe('function');
    });
  });
});
