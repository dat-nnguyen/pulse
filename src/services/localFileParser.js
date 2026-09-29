// Local file parser for user's MP3, FLAC, WAV, M4A files

export async function parseAudioFile(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';

    audio.onloadedmetadata = () => {
      const duration = Math.round(audio.duration) || 0;
      
      // Clean filename
      const rawName = file.name.replace(/\.[^/.]+$/, '');
      let title = rawName;
      let artist = 'Local Artist';
      let album = 'Local Files';

      // Parse common "Artist - Title" pattern
      if (rawName.includes(' - ')) {
        const parts = rawName.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }

      const extension = file.name.split('.').pop().toUpperCase();
      let format = extension;
      let bitrate = 'Lossless Original';
      if (format === 'MP3') bitrate = '320 kbps Original';
      if (format === 'FLAC') bitrate = 'FLAC Lossless 24-bit';
      if (format === 'WAV') bitrate = 'WAV Uncompressed';

      // Default high-quality visual placeholder
      const coverUrl = generateAlbumArt(title, artist);

      resolve({
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title,
        artist,
        album,
        duration,
        audioBlob: file,
        audioUrl: objectUrl,
        coverUrl,
        format,
        bitrate,
        isDownloaded: true,
        type: 'music',
        addedAt: Date.now(),
        fileSizeBytes: file.size,
      });
    };

    audio.onerror = () => {
      resolve({
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: file.name,
        artist: 'Local Artist',
        album: 'Local Files',
        duration: 180,
        audioBlob: file,
        audioUrl: objectUrl,
        coverUrl: generateAlbumArt(file.name, 'Local'),
        format: file.name.split('.').pop().toUpperCase(),
        bitrate: 'Original Quality',
        isDownloaded: true,
        type: 'music',
        addedAt: Date.now(),
      });
    };

    audio.src = objectUrl;
  });
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
