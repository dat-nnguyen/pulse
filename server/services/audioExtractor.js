import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';

export async function extractAudioFromUrl(url, customMeta = {}) {
  const ytDlpCmd = fs.existsSync(config.venvYtDlp) ? config.venvYtDlp : 'yt-dlp';
  const outputId = `track_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const outputPath = path.join(config.cacheDir, `${outputId}.%(ext)s`);

  return new Promise((resolve, reject) => {
    // Download best available audio stream (prefers m4a/aac, falls back to webm/opus) without needing ffmpeg
    const cmd = `"${ytDlpCmd}" -f "ba[ext=m4a]/ba/b" --no-playlist -o "${outputPath}" --print-json "${url}"`;

    exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
      let info = null;
      if (stdout) {
        try {
          const lines = stdout.trim().split('\n');
          // Last JSON object in output
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              info = JSON.parse(lines[i]);
              if (info && info.id) break;
            } catch (e) {}
          }
        } catch (parseErr) {
          // Continue
        }
      }

      // Check if file was downloaded to cache
      const files = fs.readdirSync(config.cacheDir);
      const downloadedFile = files.find((f) => f.startsWith(outputId));

      if (downloadedFile) {
        const ext = path.extname(downloadedFile).replace('.', '').toUpperCase() || 'M4A';
        const trackTitle = customMeta.title || (info && info.title) || 'Downloaded Audio';
        const trackArtist = customMeta.artist || (info && (info.uploader || info.channel)) || 'Various Artists';
        const trackDuration = Math.round((info && info.duration) || 180);
        const coverUrl = (info && info.thumbnail) || '';

        return resolve({
          success: true,
          track: {
            id: outputId,
            title: trackTitle,
            artist: trackArtist,
            album: (info && info.album) || 'Web Audio Downloads',
            duration: trackDuration,
            coverUrl,
            audioUrl: `/audio/${downloadedFile}`,
            bitrate: '320 kbps (High Quality)',
            format: ext,
            type: 'music',
            isDownloaded: true,
          },
        });
      }

      if (error) {
        console.error('yt-dlp execution error:', error.message, stderr);
        return reject(new Error('Failed to extract audio from link. Please verify the URL.'));
      }

      reject(new Error('Audio file was not generated.'));
    });
  });
}
