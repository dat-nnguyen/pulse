import { describe, it, expect } from 'vitest';
import {
  shuffleArray,
  getRemainingSequentialTracks,
  computeToggledQueue,
} from '../src/services/shuffleService.js';

describe('Shuffle Service', () => {
  const sampleTracks = [
    { id: 'track_1', title: 'Song 1', artist: 'Artist A' },
    { id: 'track_2', title: 'Song 2', artist: 'Artist B' },
    { id: 'track_3', title: 'Song 3', artist: 'Artist C' },
    { id: 'track_4', title: 'Song 4', artist: 'Artist D' },
    { id: 'track_5', title: 'Song 5', artist: 'Artist E' },
  ];

  describe('shuffleArray', () => {
    it('handles empty and single-element arrays without crashing', () => {
      expect(shuffleArray([])).toEqual([]);
      expect(shuffleArray([sampleTracks[0]])).toEqual([sampleTracks[0]]);
      expect(shuffleArray(null)).toEqual([]);
    });

    it('preserves all elements and array length', () => {
      const shuffled = shuffleArray(sampleTracks);
      expect(shuffled).toHaveLength(sampleTracks.length);
      const originalIds = sampleTracks.map((t) => t.id).sort();
      const shuffledIds = shuffled.map((t) => t.id).sort();
      expect(shuffledIds).toEqual(originalIds);
    });

    it('returns a new array without mutating the original input', () => {
      const originalCopy = [...sampleTracks];
      const shuffled = shuffleArray(sampleTracks);
      expect(shuffled).not.toBe(sampleTracks);
      expect(sampleTracks).toEqual(originalCopy);
    });
  });

  describe('getRemainingSequentialTracks', () => {
    it('returns remaining sequential tracks after the current track', () => {
      const current = sampleTracks[1]; // Song 2
      const remaining = getRemainingSequentialTracks(current, sampleTracks);
      expect(remaining.map((t) => t.id)).toEqual(['track_3', 'track_4', 'track_5']);
    });

    it('returns empty array if current track is the last track', () => {
      const last = sampleTracks[4];
      const remaining = getRemainingSequentialTracks(last, sampleTracks);
      expect(remaining).toEqual([]);
    });

    it('returns all other tracks if current track is not found in playlist', () => {
      const external = { id: 'track_99', title: 'External', artist: 'Artist X' };
      const remaining = getRemainingSequentialTracks(external, sampleTracks);
      expect(remaining).toHaveLength(sampleTracks.length);
    });
  });

  describe('computeToggledQueue (Toggle ON and OFF)', () => {
    it('randomizes the queue when enabling shuffle', () => {
      const current = sampleTracks[0];
      const initialQueue = sampleTracks.slice(1);

      const result = computeToggledQueue({
        isEnabling: true,
        currentTrack: current,
        currentQueue: initialQueue,
        activeContextTracks: sampleTracks,
        unshuffledQueue: [],
      });

      expect(result.nextQueue).toHaveLength(initialQueue.length);
      const originalIds = initialQueue.map((t) => t.id).sort();
      const nextIds = result.nextQueue.map((t) => t.id).sort();
      expect(nextIds).toEqual(originalIds);
      expect(result.nextUnshuffledQueue.map((t) => t.id)).toEqual(['track_2', 'track_3', 'track_4', 'track_5']);
    });

    it('populates and shuffles queue from context tracks if current queue is empty', () => {
      const current = sampleTracks[2]; // Song 3

      const result = computeToggledQueue({
        isEnabling: true,
        currentTrack: current,
        currentQueue: [],
        activeContextTracks: sampleTracks,
        unshuffledQueue: [],
      });

      // Expected others: Song 1, 2, 4, 5
      expect(result.nextQueue).toHaveLength(4);
      expect(result.nextQueue.find((t) => t.id === current.id)).toBeUndefined();
    });

    it('restores sequential order when disabling shuffle', () => {
      const current = sampleTracks[1]; // Song 2
      const scrambledQueue = [sampleTracks[4], sampleTracks[2], sampleTracks[3]]; // 5, 3, 4

      const result = computeToggledQueue({
        isEnabling: false,
        currentTrack: current,
        currentQueue: scrambledQueue,
        activeContextTracks: sampleTracks,
        unshuffledQueue: [],
      });

      // Should restore sequential order after Song 2: Song 3, 4, 5
      expect(result.nextQueue.map((t) => t.id)).toEqual(['track_3', 'track_4', 'track_5']);
    });

    it('preserves user manual queue additions when disabling shuffle', () => {
      const current = sampleTracks[0]; // Song 1
      const manualTrack = { id: 'manual_99', title: 'Ad-hoc Track', artist: 'Guest' };
      const currentQueue = [sampleTracks[3], manualTrack, sampleTracks[1]];

      const result = computeToggledQueue({
        isEnabling: false,
        currentTrack: current,
        currentQueue,
        activeContextTracks: sampleTracks,
        unshuffledQueue: [],
      });

      // Sequential context: 2, 3, 4, 5 + manual track at end
      expect(result.nextQueue.map((t) => t.id)).toEqual([
        'track_2',
        'track_3',
        'track_4',
        'track_5',
        'manual_99',
      ]);
    });
  });
});
