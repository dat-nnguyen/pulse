import { describe, it, expect } from 'vitest';
import { searchYouTubeWeb } from '../server/services/youtubeSearchService.js';
import { searchYouTube } from '../src/services/youtubeSearchService.js';
import {
  findDuplicateTrackInLibrary,
  isTrackInPlaylist,
} from '../src/services/storageService.js';

describe('YouTube Search Service & Integration', () => {
  describe('Backend Search Parser (searchYouTubeWeb)', () => {
    it('returns empty array when query is empty or whitespace', async () => {
      const emptyResults = await searchYouTubeWeb('');
      expect(emptyResults).toEqual([]);

      const whitespaceResults = await searchYouTubeWeb('   ');
      expect(whitespaceResults).toEqual([]);
    });

    it('searches tracks and cleans titles and artists correctly without API keys', async () => {
      const results = await searchYouTubeWeb('Daft Punk Get Lucky', 3);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const track = results[0];
      expect(track).toHaveProperty('id');
      expect(typeof track.id).toBe('string');
      expect(track.id.length).toBeGreaterThan(0);

      expect(track).toHaveProperty('title');
      expect(track).toHaveProperty('cleanTitle');
      expect(track).toHaveProperty('cleanArtist');
      expect(track).toHaveProperty('url');
      expect(track.url).toContain('youtube.com/watch?v=');
      expect(track).toHaveProperty('thumbnail');
      expect(track).toHaveProperty('duration');
    });
  });

  describe('Frontend YouTube Search Module', () => {
    it('returns empty array when given an empty query', async () => {
      const res = await searchYouTube('');
      expect(res).toEqual([]);
    });
  });

  describe('Search Duplicate Detection Compatibility', () => {
    it('accurately identifies when a YouTube search result is already in the user library', () => {
      const libraryTracks = [
        {
          id: 'local_track_1',
          title: 'Get Lucky',
          artist: 'Daft Punk',
          sourceUrl: 'https://www.youtube.com/watch?v=5NV6Rdv1a3I',
        },
        {
          id: 'local_track_2',
          title: 'Starboy',
          artist: 'The Weeknd',
        },
      ];

      // Simulated search result matching by exact URL
      const searchItem1 = {
        id: '5NV6Rdv1a3I',
        title: 'Daft Punk - Get Lucky (Official Audio)',
        cleanTitle: 'Get Lucky',
        cleanArtist: 'Daft Punk',
        channel: 'Daft Punk',
        url: 'https://www.youtube.com/watch?v=5NV6Rdv1a3I',
      };

      const candidate1 = {
        id: `yt_${searchItem1.id}`,
        title: searchItem1.cleanTitle,
        artist: searchItem1.cleanArtist,
        sourceUrl: searchItem1.url,
      };

      const match1 = findDuplicateTrackInLibrary(candidate1, libraryTracks);
      expect(match1).not.toBeNull();
      expect(match1.id).toBe('local_track_1');

      // Simulated search result matching by normalized title & artist
      const searchItem2 = {
        id: 'abc123xyz',
        title: 'The Weeknd - Starboy (Music Video)',
        cleanTitle: 'Starboy',
        cleanArtist: 'The Weeknd',
        channel: 'TheWeekndVEVO',
        url: 'https://www.youtube.com/watch?v=abc123xyz',
      };

      const candidate2 = {
        id: `yt_${searchItem2.id}`,
        title: searchItem2.cleanTitle,
        artist: searchItem2.cleanArtist,
        sourceUrl: searchItem2.url,
      };

      const match2 = findDuplicateTrackInLibrary(candidate2, libraryTracks);
      expect(match2).not.toBeNull();
      expect(match2.id).toBe('local_track_2');

      // Unmatched track
      const candidate3 = {
        id: 'yt_new_item',
        title: 'Fresh Unknown Track',
        artist: 'Unknown Artist',
        sourceUrl: 'https://www.youtube.com/watch?v=fresh123',
      };
      const match3 = findDuplicateTrackInLibrary(candidate3, libraryTracks);
      expect(match3).toBeNull();
    });

    it('accurately identifies when a YouTube search result is already in a playlist', () => {
      const playlist = {
        id: 'pl_workout',
        name: 'Work Out',
        trackIds: ['local_track_1'],
      };

      const libraryTracks = [
        {
          id: 'local_track_1',
          title: 'Get Lucky',
          artist: 'Daft Punk',
          sourceUrl: 'https://www.youtube.com/watch?v=5NV6Rdv1a3I',
        },
      ];

      const searchItem = {
        id: '5NV6Rdv1a3I',
        title: 'Get Lucky',
        cleanTitle: 'Get Lucky',
        cleanArtist: 'Daft Punk',
        url: 'https://www.youtube.com/watch?v=5NV6Rdv1a3I',
      };

      const candidate = {
        id: `yt_${searchItem.id}`,
        title: searchItem.cleanTitle,
        artist: searchItem.cleanArtist,
        sourceUrl: searchItem.url,
      };

      const inPlaylist = isTrackInPlaylist(candidate, playlist, libraryTracks);
      expect(inPlaylist).toBe(true);

      const candidateNotPresent = {
        id: 'yt_other',
        title: 'Around The World',
        artist: 'Daft Punk',
        sourceUrl: 'https://www.youtube.com/watch?v=other',
      };
      const notInPlaylist = isTrackInPlaylist(candidateNotPresent, playlist, libraryTracks);
      expect(notInPlaylist).toBe(false);
    });
  });
});
