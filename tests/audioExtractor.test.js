import { describe, it, expect } from 'vitest';
import { parseTitleAndArtist } from '../server/services/audioExtractor.js';
import { resolveYtDlpBinary } from '../server/config/index.js';

describe('Audio Extractor & Metadata Parsing', () => {
  describe('parseTitleAndArtist', () => {
    it('parses "Artist - Title" format from video titles', () => {
      const info = {
        title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
        uploader: 'RickAstleyVEVO',
      };
      const result = parseTitleAndArtist(info);
      expect(result.artist).toBe('Rick Astley');
      expect(result.title).toBe('Never Gonna Give You Up');
    });

    it('prefers official yt-dlp metadata when available', () => {
      const info = {
        title: 'Random Upload Title 2026',
        track: 'Blinding Lights',
        artist: 'The Weeknd',
      };
      const result = parseTitleAndArtist(info);
      expect(result.title).toBe('Blinding Lights');
      expect(result.artist).toBe('The Weeknd');
    });

    it('cleans channel suffixes like "- Topic" and "VEVO"', () => {
      const info = {
        title: 'Pure Ambient Soundscape',
        channel: 'M83 - Topic',
      };
      const result = parseTitleAndArtist(info);
      expect(result.artist).toBe('M83');
      expect(result.title).toBe('Pure Ambient Soundscape');
    });

    it('respects user custom metadata override', () => {
      const info = {
        title: 'Random Title',
        uploader: 'Uploader Channel',
      };
      const customMeta = {
        title: 'Deep Focus Flow',
        artist: 'Chillout Lounge',
      };
      const result = parseTitleAndArtist(info, customMeta);
      expect(result.title).toBe('Deep Focus Flow');
      expect(result.artist).toBe('Chillout Lounge');
    });
  });

  describe('resolveYtDlpBinary', () => {
    it('returns a valid string or executable path without throwing', () => {
      const binaryPath = resolveYtDlpBinary();
      expect(typeof binaryPath).toBe('string');
      expect(binaryPath.length).toBeGreaterThan(0);
    });
  });
});
