const join = (...parts) => new Uint8Array(parts.flatMap((part) => [...part]));
function box(type, payload) {
  const bytes = new Uint8Array(payload.length + 8);
  new DataView(bytes.buffer).setUint32(0, bytes.length);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(payload, 8);
  return bytes;
}
function header(type, duration, version = 0) {
  const bytes = new Uint8Array(100);
  const view = new DataView(bytes.buffer);
  bytes[0] = version;
  const offset = type === 'tkhd' ? (version ? 28 : 20) : (version ? 24 : 16);
  if (type !== 'tkhd') view.setUint32(offset - 4, 44100);
  if (version) view.setBigUint64(offset, BigInt(duration));
  else view.setUint32(offset, duration);
  return box(type, bytes);
}
export function fragmentedM4aFixture({ fragmented = true, samples = 0, version = 0 } = {}) {
  const stts = new Uint8Array(8);
  new DataView(stts.buffer).setUint32(4, samples);
  const movie = box('moov', join(header('mvhd', 7895040, version),
    ...(fragmented ? [box('mvex', box('trex', new Uint8Array(24)))] : []),
    box('trak', join(header('tkhd', 7895040, version), box('mdia', join(header('mdhd', 7895040, version),
      box('minf', box('stbl', box('stts', stts)))))))));
  const media = box('mdat', new Uint8Array([10, 20, 30, 40]));
  return { movie, media, bytes: join(box('ftyp', new TextEncoder().encode('dash0000')), movie, box('moof', new Uint8Array(8)), media) };
}
