// Service for downloading and caching music from YouTube, SoundCloud, or direct audio URLs

import { saveTrack } from './storageService';

// Default high-fidelity tracks to give the user a rich, immediate Spotify experience
export const SAMPLE_TRACKS = [
  {
    id: 'sample_1',
    title: 'Midnight City Lights',
    artist: 'Aether & Lumina',
    album: 'Neon Horizon',
    duration: 198,
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://actions.google.com/sounds/v1/weather/light_rain.ogg', // Fallback stream
    audioUrlHighQuality: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    bitrate: '320 kbps Original',
    format: 'MP3',
    type: 'music',
    lyrics: `[00:00.00]Cruising down the empty avenue\n[00:15.00]Neon reflections in the rearview\n[00:30.00]Bass resonates inside the chest\n[00:45.00]No worries left, we take the rest\n[01:00.00]Lost in the rhythm of the city lights\n[01:15.00]These velvet hours, these timeless nights\n[01:30.00]Fade into the dawn\n[01:45.00]Until the night is gone`,
  },
  {
    id: 'sample_2',
    title: 'Solar Echoes',
    artist: 'Celestial Drift',
    album: 'Orbit of Eternity',
    duration: 224,
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=electronic-future-beats-117997.mp3',
    bitrate: 'FLAC / 320 kbps',
    format: 'FLAC',
    type: 'music',
    lyrics: `[00:00.00]Transmission received from outer space\n[00:20.00]Floating across the stellar waves\n[00:40.00]Synthesizers pulse through the void\n[01:00.00]Every earthly thought destroyed\n[01:20.00]Gravity lets go\n[01:40.00]Into the cosmic flow`,
  },
  {
    id: 'sample_3',
    title: 'Velvet Rain & Coffee',
    artist: 'Tokyo Chill Session',
    album: 'Shibuya Raindrops',
    duration: 172,
    coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=chill-abstract-intention-12099.mp3',
    bitrate: '320 kbps Master',
    format: 'MP3',
    type: 'music',
    lyrics: `[00:00.00]Rain tapping softly on the window pane\n[00:18.00]Steam rising from the porcelain\n[00:36.00]Vinyl crackle in the cozy room\n[00:54.00]Chasing away the afternoon gloom\n[01:12.00]Slow sips and quiet thoughts\n[01:30.00]Remembering all that time has brought`,
  },
  {
    id: 'sample_4',
    title: 'Emerald Forest Breeze',
    artist: 'Nordic Soundscapes',
    album: 'Wilderness Echoes',
    duration: 210,
    coverUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/02/07/audio_6506041ec6.mp3?filename=nature-ambient-14227.mp3',
    bitrate: 'Lossless Original',
    format: 'WAV',
    type: 'music',
    lyrics: `[00:00.00]Whispers through the pine trees tall\n[00:25.00]Listening to the mountain call\n[00:50.00]Clear mountain streams run cold and bright\n[01:15.00]Guiding our steps into the light`,
  }
];

export async function downloadTrackToLocal(track, onProgress = () => {}) {
  try {
    onProgress({ status: 'downloading', percent: 10 });
    const url = track.audioUrlHighQuality || track.audioUrl;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed with status ${response.status}`);

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    
    const reader = response.body.getReader();
    let receivedBytes = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedBytes += value.length;
      if (totalBytes > 0) {
        const percent = Math.min(95, Math.round((receivedBytes / totalBytes) * 100));
        onProgress({ status: 'downloading', percent, receivedBytes, totalBytes });
      }
    }

    const mimeType = track.format === 'FLAC' ? 'audio/flac' : 'audio/mpeg';
    const audioBlob = new Blob(chunks, { type: mimeType });

    onProgress({ status: 'saving', percent: 98 });
    const saved = await saveTrack({
      ...track,
      audioBlob,
      isDownloaded: true,
      fileSizeBytes: audioBlob.size,
      downloadedAt: Date.now(),
    });

    onProgress({ status: 'complete', percent: 100 });
    return saved;
  } catch (err) {
    console.error('Download to local error:', err);
    throw err;
  }
}

// Download from YouTube or direct URL via local backend or direct audio stream
export async function downloadFromWebUrl(inputUrl, customMeta = {}) {
  const trimmedUrl = inputUrl.trim();

  // 1. Try local companion backend server first (runs native yt-dlp)
  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: trimmedUrl, ...customMeta }),
      signal: AbortSignal.timeout(60000), // Allow 60s for high-quality audio extraction
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.track) {
        return saveTrack(data.track);
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) {
        throw new Error(errData.error);
      }
    }
  } catch (backendErr) {
    // If backend threw an explicit error from server
    if (backendErr.message && !backendErr.message.includes('fetch') && !backendErr.message.includes('timeout')) {
      throw backendErr;
    }
    // Otherwise backend server is not running or unreachable (e.g. on Vercel standalone), proceed to fallback
  }

  // 2. Direct Audio URL (.mp3, .m4a, .flac, .wav, .ogg, .aac)
  const isDirectAudio = /\.(mp3|m4a|wav|flac|ogg|aac)(\?.*)?$/i.test(trimmedUrl);
  if (isDirectAudio) {
    const filename = trimmedUrl.split('/').pop().split('?')[0];
    const cleanTitle = decodeURIComponent(filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    const track = {
      id: `web_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: customMeta.title || cleanTitle,
      artist: customMeta.artist || 'Web Stream',
      album: customMeta.album || 'Downloaded Tracks',
      audioUrl: trimmedUrl,
      coverUrl: customMeta.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      duration: 180,
      bitrate: '320 kbps Original',
      format: trimmedUrl.split('.').pop().split('?')[0].toUpperCase(),
      type: 'music',
    };
    return downloadTrackToLocal(track);
  }

  // 3. YouTube link on standalone web / Vercel without local backend server
  const isYouTube = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i.test(trimmedUrl);
  if (isYouTube) {
    throw new Error(
      'YouTube audio extraction requires the Pulse local server running on your Mac (run "npm run server" in terminal). Alternatively, you can paste any direct .mp3 / .m4a link or import local files directly!'
    );
  }

  throw new Error('Please enter a valid YouTube link or direct audio URL (.mp3, .m4a, .flac).');
}
