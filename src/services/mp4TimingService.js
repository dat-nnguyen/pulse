// DASH M4A files can declare the complete duration in their empty initialization
// track as well as in their fragments. Apple's demuxer counts both timelines.
// Clear only those initialization durations; keep every media byte and offset.
const MAX_MOVIE_BOX = 16 * 1024 * 1024;
const cachedTiming = new WeakMap();
export const AUDIO_TIMING_VERSION = 3;

function boxAt(view, offset, end) {
  if (offset + 8 > end) return null;
  let size = view.getUint32(offset);
  const type = String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset + 4, 4));
  let header = 8;
  if (size === 1) {
    if (offset + 16 > end) return null;
    size = view.getUint32(offset + 8) * 4294967296 + view.getUint32(offset + 12);
    header = 16;
  } else if (size === 0) size = end - offset;
  if (!Number.isSafeInteger(size) || size < header || offset + size > end) return null;
  return { type, start: offset, data: offset + header, end: offset + size };
}

export function repairFragmentedMovieHeader(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const root = boxAt(view, 0, bytes.length);
  if (root?.type !== 'moov') return { bytes, changed: false, duration: 0 };
  const durations = [];
  let fragmented = false;
  let hasStaticSamples = false;
  let duration = 0;
  let invalid = false;
  const walk = (start, end, depth = 0) => {
    if (depth > 8) { invalid = true; return; }
    for (let offset = start; offset < end;) {
      const box = boxAt(view, offset, end);
      if (!box) { invalid = true; return; }
      if (box.type === 'mvex') fragmented = true;
      if (['stts', 'stsc', 'stco', 'co64'].includes(box.type)) {
        if (box.data + 8 > box.end) { invalid = true; return; }
        if (view.getUint32(box.data + 4) !== 0) hasStaticSamples = true;
      }
      if (['mvhd', 'tkhd', 'mdhd'].includes(box.type)) {
        if (box.data >= box.end) { invalid = true; return; }
        const version = view.getUint8(box.data);
        if (version > 1) { invalid = true; return; }
        const at = box.data + (box.type === 'tkhd' ? (version ? 28 : 20) : (version ? 24 : 16));
        const length = version ? 8 : 4;
        if (at + length > box.end) { invalid = true; return; }
        const ticks = version ? view.getUint32(at) * 4294967296 + view.getUint32(at + 4) : view.getUint32(at);
        if (ticks > 0) durations.push({ at, length });
        if (box.type === 'mdhd') {
          const scale = view.getUint32(at - 4);
          if (scale && Number.isSafeInteger(ticks)) duration = Math.max(duration, ticks / scale);
        }
      }
      if (['trak', 'mdia', 'minf', 'stbl'].includes(box.type)) walk(box.data, box.end, depth + 1);
      offset = box.end;
    }
  };
  walk(root.data, root.end);
  if (invalid || !fragmented || hasStaticSamples) return { bytes, changed: false, duration: 0, fragmented: false };
  if (!durations.length) return { bytes, changed: false, duration: 0, fragmented: true };
  const fixed = bytes.slice();
  for (const { at, length } of durations) fixed.fill(0, at, at + length);
  return { bytes: fixed, changed: true, duration, fragmented: true };
}

// Recover cache entries written by the earlier composite-Blob implementation:
// complete original file + replacement moov + complete original file. Only
// accept this exact invalid layout; never truncate a normal media file.
function compositeCacheLength(bytes, movieSize) {
  const length = (bytes.length - movieSize) / 2;
  if (!Number.isSafeInteger(length) || length < movieSize + 16) return bytes.length;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const duplicateMovie = boxAt(view, length, bytes.length);
  const repeatedFile = boxAt(view, length + movieSize, bytes.length);
  if (duplicateMovie?.type !== 'moov' || duplicateMovie.end !== length + movieSize || repeatedFile?.type !== 'ftyp') return bytes.length;
  let offset = 0;
  let fragments = 0;
  while (offset < length) {
    const box = boxAt(view, offset, length);
    if (!box) return bytes.length;
    if (box.type === 'moof') fragments += 1;
    offset = box.end;
  }
  return fragments ? length : bytes.length;
}

export function repairM4aTiming(blob) {
  if (!cachedTiming.has(blob)) cachedTiming.set(blob, inspectAndRepair(blob));
  return cachedTiming.get(blob);
}

async function inspectAndRepair(blob) {
  const unchanged = { blob, changed: false, duration: 0 };
  if (!(blob instanceof Blob) || blob.size < 16) return unchanged;
  for (let offset = 0, count = 0; offset + 8 <= blob.size && count < 4096; count += 1) {
    const header = new Uint8Array(await blob.slice(offset, offset + 16).arrayBuffer());
    const view = new DataView(header.buffer);
    let size = view.getUint32(0);
    const type = String.fromCharCode(...header.slice(4, 8));
    if (offset === 0 && type !== 'ftyp') return unchanged;
    let headerSize = 8;
    if (size === 1) {
      if (header.length < 16) return unchanged;
      size = view.getUint32(8) * 4294967296 + view.getUint32(12);
      headerSize = 16;
    } else if (size === 0) size = blob.size - offset;
    if (!Number.isSafeInteger(size) || size < headerSize || offset + size > blob.size) return unchanged;
    if (type === 'moov') {
      if (size > MAX_MOVIE_BOX) return unchanged;
      const result = repairFragmentedMovieHeader(new Uint8Array(await blob.slice(offset, offset + size).arrayBuffer()));
      if (!result.fragmented) return unchanged;
      // Materialize one contiguous buffer. Persisting a composite of File-backed
      // Blob slices in WebKit can write the complete backing file for each slice,
      // bringing back the original timeline when IndexedDB is reopened.
      const data = new Uint8Array(await blob.arrayBuffer());
      const recoveredLength = compositeCacheLength(data, size);
      if (!result.changed && recoveredLength === data.length) return unchanged;
      const fixedBytes = data.slice(0, recoveredLength);
      fixedBytes.set(result.bytes, offset);
      const fixed = new Blob([fixedBytes], { type: 'audio/mp4' });
      const repaired = { blob: fixed, changed: true, duration: result.duration };
      cachedTiming.set(fixed, Promise.resolve({ blob: fixed, changed: false, duration: result.duration }));
      return repaired;
    }
    offset += size;
  }
  return unchanged;
}
