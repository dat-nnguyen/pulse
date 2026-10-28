import { describe, expect, it, vi, afterEach } from 'vitest';
import { createHlsAudioPackage, downloadHlsAudio, parsePulseHlsManifest } from '../src/services/hlsAudioService.js';

const join = (...parts) => new Uint8Array(parts.flatMap((part) => [...part]));
function box(type, bytes) {
  const data = new Uint8Array(bytes.length + 8);
  new DataView(data.buffer).setUint32(0, data.length);
  data.set(new TextEncoder().encode(type), 4); data.set(bytes, 8); return data;
}
function fixture() {
  const mdhd = new Uint8Array(24); new DataView(mdhd.buffer).setUint32(12, 1000);
  const hdlr = new Uint8Array(24); hdlr.set(new TextEncoder().encode('soun'), 8);
  const movie = box('moov', join(box('mvex', new Uint8Array()), box('trak', box('mdia', join(box('mdhd', mdhd), box('hdlr', hdlr))))));
  const fragments = [1, 2].map((value) => {
    const tfhd = new Uint8Array(12); const tfhdView = new DataView(tfhd.buffer);
    tfhdView.setUint32(0, 0x20008); tfhdView.setUint32(4, 1); tfhdView.setUint32(8, 1000);
    const trun = new Uint8Array(8); new DataView(trun.buffer).setUint32(4, 2);
    return join(box('moof', box('traf', join(box('tfhd', tfhd), box('trun', trun)))), box('mdat', new Uint8Array([value, value, value, value])));
  });
  return { blob: new Blob([join(box('ftyp', new TextEncoder().encode('iso60000')), movie, ...fragments)], { type: 'audio/mp4' }), fragments };
}
afterEach(() => vi.unstubAllGlobals());

describe('Large podcast cloud streaming', () => {
  it('packages audio losslessly into bounded parts with an exact byte-range VOD playlist', async () => {
    const { blob, fragments } = fixture();
    const result = await createHlsAudioPackage(blob, fragments[0].length);
    expect(result.duration).toBe(4);
    expect(result.assets).toHaveLength(3);
    expect(result.assets[1].bytes).toEqual(fragments[0]);
    expect(result.assets[2].bytes).toEqual(fragments[1]);
    expect(result.playlist).toContain('#EXT-X-ENDLIST');
    expect(result.playlist).toContain(`#EXT-X-BYTERANGE:${fragments[0].length}@0`);
  });

  it('downloads each part once for offline playback even when many byte ranges share it', async () => {
    const manifest = '#EXTM3U\n#EXT-X-PULSE-AUDIO:1\n#EXT-X-MAP:URI="init.mp4"\n#EXT-X-BYTERANGE:2@0\npart.m4s\n#EXT-X-BYTERANGE:2@2\npart.m4s\n#EXT-X-ENDLIST';
    const url = 'https://cdn.example/audio/episode/index.m3u8';
    expect(parsePulseHlsManifest(manifest, url)).toEqual(['https://cdn.example/audio/episode/init.mp4', 'https://cdn.example/audio/episode/part.m4s']);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(new Uint8Array([1, 2]))).mockResolvedValueOnce(new Response(new Uint8Array([3, 4, 5, 6]))));
    const blob = await downloadHlsAudio(manifest, url);
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not label an incomplete live stream as an offline download', () => {
    expect(() => parsePulseHlsManifest('#EXTM3U', 'https://cdn.example/live.m3u8')).toThrow(/complete offline/);
  });
});
