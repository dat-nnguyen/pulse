import { repairFragmentedMovieHeader } from './mp4TimingService.js';

export const isHlsUrl = (url = '') => /\.m3u8(?:[?#]|$)/i.test(url);

function boxes(bytes, start = 0, end = bytes.length) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const result = [];
  for (let offset = start; offset < end;) {
    if (offset + 8 > end) throw new Error('Incomplete MP4 box');
    let size = view.getUint32(offset), header = 8;
    if (size === 1) {
      if (offset + 16 > end) throw new Error('Incomplete MP4 box');
      size = view.getUint32(offset + 8) * 4294967296 + view.getUint32(offset + 12); header = 16;
    } else if (!size) size = end - offset;
    if (!Number.isSafeInteger(size) || size < header || offset + size > end) throw new Error('Invalid MP4 box');
    result.push({ type: String.fromCharCode(...bytes.subarray(offset + 4, offset + 8)), start: offset, data: offset + header, end: offset + size });
    offset += size;
  }
  return result;
}

function combine(parts) {
  const output = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

export async function createHlsAudioPackage(blob, maxPartBytes = 4 * 1024 * 1024) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const top = boxes(bytes);
  const movie = top.find((box) => box.type === 'moov');
  const type = top.find((box) => box.type === 'ftyp');
  if (!movie || !type) throw new Error('Cloud streaming requires an MP4 audio container');
  const children = boxes(bytes, movie.data, movie.end);
  const tracks = children.filter((box) => box.type === 'trak');
  if (tracks.length !== 1) throw new Error('Cloud streaming requires a single audio track');
  const media = boxes(bytes, tracks[0].data, tracks[0].end).find((box) => box.type === 'mdia');
  const mediaBoxes = boxes(bytes, media.data, media.end);
  const handler = mediaBoxes.find((box) => box.type === 'hdlr');
  const mdhd = mediaBoxes.find((box) => box.type === 'mdhd');
  if (!handler || String.fromCharCode(...bytes.subarray(handler.data + 8, handler.data + 12)) !== 'soun') throw new Error('Only audio can be streamed');
  const scale = view.getUint32(mdhd.data + (view.getUint8(mdhd.data) ? 20 : 12));
  if (!scale) throw new Error('Invalid audio time scale');
  const extendsBox = children.find((box) => box.type === 'mvex');
  const trex = extendsBox && boxes(bytes, extendsBox.data, extendsBox.end).find((box) => box.type === 'trex');
  const fallbackDuration = trex ? view.getUint32(trex.data + 12) : 0;
  const fragments = top.filter((box) => box.type === 'moof');
  if (!fragments.length) throw new Error('Large cloud audio requires fragmented M4A');
  const assets = [{ name: 'init.mp4', bytes: combine([bytes.slice(type.start, type.end), repairFragmentedMovieHeader(bytes.slice(movie.start, movie.end)).bytes]), type: 'audio/mp4' }];
  const segments = [];
  let part = [], partLength = 0, partIndex = 0;
  const partName = () => `part-${String(partIndex).padStart(4, '0')}.m4s`;
  const flush = () => {
    if (!part.length) return;
    assets.push({ name: partName(), bytes: combine(part), type: 'audio/mp4' });
    part = []; partLength = 0; partIndex += 1;
  };
  for (let index = 0; index < fragments.length; index += 1) {
    const fragment = fragments[index];
    const end = fragments[index + 1]?.start || bytes.length;
    const data = bytes.subarray(fragment.start, end);
    if (data.length > maxPartBytes) throw new Error('An audio fragment exceeds the cloud part limit');
    if (partLength + data.length > maxPartBytes) flush();
    let ticks = 0;
    for (const traf of boxes(bytes, fragment.data, fragment.end).filter((box) => box.type === 'traf')) {
      const fields = boxes(bytes, traf.data, traf.end);
      const tfhd = fields.find((box) => box.type === 'tfhd');
      if (!tfhd) throw new Error('Missing audio fragment header');
      const flags = view.getUint32(tfhd.data) & 0xffffff;
      let cursor = tfhd.data + 8 + ((flags & 1) ? 8 : 0) + ((flags & 2) ? 4 : 0);
      const sampleDuration = (flags & 8) ? view.getUint32(cursor) : fallbackDuration;
      for (const run of fields.filter((box) => box.type === 'trun')) {
        const runFlags = view.getUint32(run.data) & 0xffffff;
        const count = view.getUint32(run.data + 4);
        cursor = run.data + 8 + ((runFlags & 1) ? 4 : 0) + ((runFlags & 4) ? 4 : 0);
        const stride = [0x100, 0x200, 0x400, 0x800].filter((flag) => runFlags & flag).length * 4;
        if (cursor + count * stride > run.end) throw new Error('Incomplete audio sample table');
        if (!(runFlags & 0x100)) {
          if (!sampleDuration) throw new Error('Missing audio sample duration');
          ticks += count * sampleDuration;
        } else for (let sample = 0; sample < count; sample += 1) ticks += view.getUint32(cursor + sample * stride);
      }
    }
    segments.push({ name: partName(), offset: partLength, length: data.length, duration: ticks / scale });
    part.push(data); partLength += data.length;
  }
  flush();
  const lines = ['#EXTM3U', '#EXT-X-VERSION:7', '#EXT-X-PLAYLIST-TYPE:VOD', '#EXT-X-MEDIA-SEQUENCE:0',
    `#EXT-X-TARGETDURATION:${Math.ceil(Math.max(...segments.map((segment) => segment.duration)))}`, '#EXT-X-PULSE-AUDIO:1', '#EXT-X-MAP:URI="init.mp4"'];
  for (const segment of segments) lines.push(`#EXTINF:${segment.duration.toFixed(6)},`, `#EXT-X-BYTERANGE:${segment.length}@${segment.offset}`, segment.name);
  lines.push('#EXT-X-ENDLIST');
  return { assets, playlist: lines.join('\n') + '\n', duration: segments.reduce((duration, segment) => duration + segment.duration, 0) };
}

export function parsePulseHlsManifest(text, url) {
  if (!text.includes('#EXT-X-PULSE-AUDIO:1') || !text.includes('#EXT-X-ENDLIST')) throw new Error('This stream cannot be saved as a complete offline file');
  const init = text.match(/#EXT-X-MAP:URI="([^"]+)"/)?.[1];
  if (!init) throw new Error('Audio initialization segment is missing');
  const media = [...new Set(text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')))];
  return [init, ...media].map((path) => new URL(path, url).href);
}

export async function downloadHlsAudio(text, url, onProgress = () => {}) {
  const urls = parsePulseHlsManifest(text, url);
  const parts = [];
  for (let index = 0; index < urls.length; index += 1) {
    const response = await fetch(urls[index], { signal: AbortSignal.timeout(600000) });
    if (!response.ok || response.status === 206) throw new Error(`Audio segment download failed (${response.status})`);
    parts.push(new Uint8Array(await response.arrayBuffer()));
    onProgress({ status: 'downloading', percent: Math.round((index + 1) / urls.length * 95) });
  }
  return new Blob([combine(parts)], { type: 'audio/mp4' });
}
