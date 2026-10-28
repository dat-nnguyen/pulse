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
