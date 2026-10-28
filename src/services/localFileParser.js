// Local file parser for user's MP3, FLAC, WAV, M4A files

import { readAudioDuration, prepareAudioBlob } from './audioMediaService.js';

export async function parseAudioFile(file) {
  const audioBlob = await prepareAudioBlob(file, { format: file.name.split('.').pop() });
  const duration = await readAudioDuration(audioBlob);
  const rawName = file.name.replace(/\.[^/.]+$/, '');
  const parts = rawName.split(' - ');
  const artist = parts.length > 1 ? parts[0].trim() : 'Local Artist';
  const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : rawName;
  const format = file.name.split('.').pop().toUpperCase();
  const bitrate = ({ MP3: '320 kbps Original', FLAC: 'FLAC Lossless 24-bit', WAV: 'WAV Uncompressed' })[format] || 'Lossless Original';
  return {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title, artist, album: 'Local Files', duration, durationVerified: Boolean(duration),
    audioBlob, coverUrl: generateAlbumArt(title, artist), format, bitrate,
    isDownloaded: true, type: 'music', addedAt: Date.now(), fileSizeBytes: file.size,
  };
}

function generateAlbumArt(title, artist) {
  // Generate consistent aesthetic canvas cover art
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');

  // Gradient background
  const colors = [
    ['#1e3c72', '#2a5298'],
    ['#2c3e50', '#3498db'],
    ['#4a00e0', '#8e2de2'],
    ['#000428', '#004e92'],
    ['#0f2027', '#203a43'],
    ['#11998e', '#38ef7d'],
    ['#fc466b', '#3f5efb'],
    ['#134e5e', '#71b280'],
  ];

  const hash = (title + artist).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorPair = colors[hash % colors.length];

  const grad = ctx.createLinearGradient(0, 0, 400, 400);
  grad.addColorStop(0, colorPair[0]);
  grad.addColorStop(1, colorPair[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 400);

  // Subtle circular vinyl ornament
  ctx.beginPath();
  ctx.arc(200, 160, 80, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 14;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(200, 160, 40, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title.slice(0, 24), 200, 290);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(artist.slice(0, 28), 200, 325);

  return canvas.toDataURL('image/png');
}
