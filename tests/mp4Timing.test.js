import { describe, expect, it } from 'vitest';
import { repairM4aTiming, repairFragmentedMovieHeader } from '../src/services/mp4TimingService.js';

import { fragmentedM4aFixture as fixture } from './fixtures/fragmentedM4a.js';

describe('Fragmented M4A timing repair', () => {
  it.each([0, 1])('clears duplicated initialization durations for version %i without changing audio data or offsets', async (version) => {
    const { bytes, movie, media } = fixture({ version });
    const original = new Blob([bytes], { type: 'audio/mp4' });
    const result = await repairM4aTiming(original);
    expect(result.changed).toBe(true);
    expect(result.duration).toBeCloseTo(179.02585, 4);
    expect(result.blob.size).toBe(original.size);
    const fixed = new Uint8Array(await result.blob.arrayBuffer());
    expect(fixed.slice(-media.length)).toEqual(media);
    const repairedMovie = repairFragmentedMovieHeader(movie);
    expect(fixed.slice(16, 16 + movie.length)).toEqual(repairedMovie.bytes);
    expect(repairFragmentedMovieHeader(repairedMovie.bytes).changed).toBe(false);
  });

  it('keeps ordinary M4A and mixed static/fragmented tracks unchanged', async () => {
    for (const options of [{ fragmented: false }, { samples: 3 }]) {
      const { bytes } = fixture(options);
      const blob = new Blob([bytes], { type: 'audio/mp4' });
      expect((await repairM4aTiming(blob)).blob).toBe(blob);
    }
  });

  it('caches repairs and does not apply the timing adjustment twice', async () => {
    const blob = new Blob([fixture().bytes], { type: 'audio/mp4' });
    const first = await repairM4aTiming(blob);
    expect((await repairM4aTiming(blob)).blob).toBe(first.blob);
    expect((await repairM4aTiming(first.blob)).blob).toBe(first.blob);
    expect((await repairM4aTiming(first.blob)).changed).toBe(false);
  });

  it('recovers a previously persisted composite cache without duplicating audio samples', async () => {
    const { bytes, movie } = fixture();
    const repairedMovie = repairFragmentedMovieHeader(movie).bytes;
    const firstCopy = bytes.slice();
    firstCopy.set(repairedMovie, 16);
    const corrupt = new Blob([firstCopy, repairedMovie, bytes], { type: 'audio/mp4' });
    const recovered = await repairM4aTiming(corrupt);
    expect(recovered.changed).toBe(true);
    expect(recovered.blob.size).toBe(bytes.length);
    expect(new Uint8Array(await recovered.blob.arrayBuffer())).toEqual(firstCopy);
  });

  it('leaves truncated and unrelated files unchanged', async () => {
    for (const bytes of [new Uint8Array(4), fixture().bytes.slice(0, 30), new TextEncoder().encode('ID3not an mp4 file')]) {
      const blob = new Blob([bytes]);
      expect((await repairM4aTiming(blob)).blob).toBe(blob);
    }
  });
});

const mp4Box = (type, ...parts) => {
  const data = Buffer.concat(parts.map((part) => Buffer.from(part)));
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length + 8);
  header.write(type, 4);
  return Buffer.concat([header, data]);
};
const mediaTrack = (handler) => mp4Box('trak', mp4Box('mdia',
  mp4Box('hdlr', Buffer.alloc(8), Buffer.from(handler), Buffer.alloc(12))));

describe('Legacy video downloads used as audio', () => {
  it('hides video while preserving audio, file length and sample offsets', async () => {
    const video = mediaTrack('vide');
    const audio = mediaTrack('soun');
    const prefix = mp4Box('ftyp', Buffer.from('isom0000'));
    const movie = mp4Box('moov', video, audio);
    const media = mp4Box('mdat', Buffer.from('unchanged video and audio samples'));
    const original = new Blob([prefix, movie, media], { type: 'audio/mp4' });
    const repaired = await repairM4aTiming(original);
    const bytes = Buffer.from(await repaired.blob.arrayBuffer());
    expect(repaired.changed).toBe(true);
    expect(bytes.length).toBe(original.size);
    expect(bytes.toString('ascii', prefix.length + 12, prefix.length + 16)).toBe('free');
    expect(bytes.subarray(prefix.length + 8 + video.length, prefix.length + movie.length)).toEqual(audio);
    expect(bytes.subarray(-media.length)).toEqual(media);
    const reopened = new Blob([bytes], { type: 'audio/mp4' });
    expect((await repairM4aTiming(reopened)).blob).toBe(reopened);
  });

  it('preserves audio-only, video-only, malformed and fragmented movies', async () => {
    for (const movie of [
      mp4Box('moov', mediaTrack('soun')),
      mp4Box('moov', mediaTrack('vide')),
      mp4Box('moov', mediaTrack('vide'), mediaTrack('soun'), Buffer.from([0, 1])),
      mp4Box('moov', mediaTrack('vide'), mediaTrack('soun'), mp4Box('mvex')),
    ]) {
      const original = new Blob([mp4Box('ftyp', Buffer.from('isom0000')), movie]);
      expect((await repairM4aTiming(original)).blob).toBe(original);
    }
  });
});
