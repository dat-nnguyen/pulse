import { describe, it, expect } from 'vitest';
import {
  normalizeTrackMeta,
  areTracksDuplicate,
  findDuplicateTrackInLibrary,
  isTrackInPlaylist,
  detectPlaylistDuplicates,
  deduplicatePlaylist,
  filterNewTracksForPlaylist,
} from '../src/services/duplicateDetectionService.js';

describe('Duplicate Detection Service', () => {
  const libraryTracks = [
    {
      id: 'track_1',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      audioUrl: '/audio/track_1.m4a',
    },
    {
      id: 'track_2',
      title: 'Never Gonna Give You Up',
      artist: 'Rick Astley',
      audioUrl: '/audio/track_2.m4a',
    },
    {
      id: 'track_3',
      title: 'Shape of You',
      artist: 'Ed Sheeran',
      audioUrl: '/audio/track_3.m4a',
    },
  ];

  describe('normalizeTrackMeta', () => {
    it('cleans YouTube video decorations and tags', () => {
      expect(normalizeTrackMeta('Blinding Lights (Official Music Video)')).toBe('blindinglights');
      expect(normalizeTrackMeta('Never Gonna Give You Up (4K Remaster)')).toBe('nevergonnagiveyouup');
      expect(normalizeTrackMeta('Shape of You [Official Audio]')).toBe('shapeofyou');
      expect(normalizeTrackMeta('Starboy (Lyric Video) [Explicit]')).toBe('starboy');
      expect(normalizeTrackMeta('Midnight City (Extended Mix)')).toBe('midnightcity');
    });

    it('strips punctuation, quotes, and whitespace', () => {
      expect(normalizeTrackMeta('Can\'t Stop the Feeling! - 2026')).toBe('cantstopthefeeling2026');
      expect(normalizeTrackMeta('  "Hello, World!"  ')).toBe('helloworld');
    });

    it('handles empty or non-string inputs safely', () => {
      expect(normalizeTrackMeta('')).toBe('');
      expect(normalizeTrackMeta(null)).toBe('');
      expect(normalizeTrackMeta(undefined)).toBe('');
    });
  });

  describe('areTracksDuplicate', () => {
    it('detects match by exact track ID', () => {
      const a = { id: 'track_123', title: 'Foo', artist: 'Bar' };
      const b = { id: 'track_123', title: 'Baz', artist: 'Qux' };
      expect(areTracksDuplicate(a, b)).toBe(true);
    });

    it('detects match by audioUrl', () => {
      const a = { id: 'track_1', audioUrl: '/audio/rick.m4a', title: 'Song A', artist: 'Artist A' };
      const b = { id: 'track_2', audioUrl: '/audio/rick.m4a', title: 'Song B', artist: 'Artist B' };
      expect(areTracksDuplicate(a, b)).toBe(true);
    });

    it('detects duplicate across different download tags and decorations', () => {
      const downloaded = {
        id: 'new_download_1',
        title: 'Never Gonna Give You Up (Official Video) (4K Remaster)',
        artist: 'Rick Astley',
      };
      const existing = libraryTracks[1];
      expect(areTracksDuplicate(downloaded, existing)).toBe(true);
    });

    it('does not falsely match different tracks', () => {
      expect(areTracksDuplicate(libraryTracks[0], libraryTracks[1])).toBe(false);
      expect(areTracksDuplicate(libraryTracks[1], libraryTracks[2])).toBe(false);
    });
  });

  describe('findDuplicateTrackInLibrary', () => {
    it('finds existing duplicate in library', () => {
      const incoming = {
        title: 'Blinding Lights (Official Audio)',
        artist: 'The Weeknd - Topic',
      };
      const found = findDuplicateTrackInLibrary(incoming, libraryTracks);
      expect(found).not.toBeNull();
      expect(found.id).toBe('track_1');
    });

    it('returns null if track does not exist in library', () => {
      const incoming = { title: 'Fresh New Song', artist: 'New Indie Artist' };
      expect(findDuplicateTrackInLibrary(incoming, libraryTracks)).toBeNull();
    });
  });

  describe('isTrackInPlaylist', () => {
    const playlist = {
      id: 'pl_workout',
      name: 'Work Out',
      trackIds: ['track_1', 'track_2'],
    };

    it('returns true if track ID is in playlist', () => {
      expect(isTrackInPlaylist('track_1', playlist, libraryTracks)).toBe(true);
      expect(isTrackInPlaylist({ id: 'track_2' }, playlist, libraryTracks)).toBe(true);
    });

    it('returns true if semantically identical downloaded track is in playlist', () => {
      const newlyDownloaded = {
        id: 'temp_random_id',
        title: 'Blinding Lights [Official Video]',
        artist: 'The Weeknd',
      };
      expect(isTrackInPlaylist(newlyDownloaded, playlist, libraryTracks)).toBe(true);
    });

    it('returns false if track is not in playlist', () => {
      expect(isTrackInPlaylist('track_3', playlist, libraryTracks)).toBe(false);
      expect(isTrackInPlaylist({ id: 'track_99', title: 'Unique Song', artist: 'Unknown' }, playlist, libraryTracks)).toBe(false);
    });
  });

  describe('detectPlaylistDuplicates and deduplicatePlaylist', () => {
    it('accurately identifies duplicate track IDs and duplicate tracks in playlist', () => {
      const duplicateTrack = {
        id: 'track_dup',
        title: 'Blinding Lights (Remaster)',
        artist: 'The Weeknd',
      };
      const extendedTracks = [...libraryTracks, duplicateTrack];

      const dirtyPlaylist = {
        id: 'pl_test',
        name: 'Test Playlist',
        // Contains track_1 twice, and track_dup (which is identical to track_1)
        trackIds: ['track_1', 'track_2', 'track_1', 'track_dup', 'track_3'],
      };

      const report = detectPlaylistDuplicates(dirtyPlaylist, extendedTracks);
      expect(report.hasDuplicates).toBe(true);
      expect(report.duplicateCount).toBe(2);
      expect(report.uniqueTrackIds).toEqual(['track_1', 'track_2', 'track_3']);

      const cleanPlaylist = deduplicatePlaylist(dirtyPlaylist, extendedTracks);
      expect(cleanPlaylist.trackIds).toEqual(['track_1', 'track_2', 'track_3']);
    });
  });

  describe('filterNewTracksForPlaylist', () => {
    it('filters out duplicates when adding a batch of tracks to playlist', () => {
      const playlist = {
        id: 'pl_ambient',
        name: 'Ambient',
        trackIds: ['track_1'],
      };

      const batchToImport = [
        { id: 'track_1', title: 'Blinding Lights', artist: 'The Weeknd' }, // duplicate ID
        { id: 'track_new_1', title: 'Blinding Lights (Official)', artist: 'The Weeknd' }, // semantic duplicate
        { id: 'track_2', title: 'Never Gonna Give You Up', artist: 'Rick Astley' }, // new
        { id: 'track_3', title: 'Shape of You', artist: 'Ed Sheeran' }, // new
      ];

      const result = filterNewTracksForPlaylist(batchToImport, playlist, libraryTracks);
      expect(result.newTrackIds).toEqual(['track_2', 'track_3']);
      expect(result.skippedDuplicates).toHaveLength(2);
      expect(result.tracksToAdd).toHaveLength(2);
    });
  });
});
