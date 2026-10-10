import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';

/**
 * Intelligently parse artist and song title from YouTube metadata and video titles.
 * Handles official music tags, "Artist - Title" video syntax, channel cleanup, and junk stripping.
 */
export function parseTitleAndArtist(info, customMeta = {}) {
  let title = customMeta.title?.trim();
  let artist = customMeta.artist?.trim();

  // 1. Official YouTube Music or ID3 tags parsed by yt-dlp
  const officialTrack = info?.track?.trim();
  const officialArtist = info?.artist?.trim() || info?.creator?.trim() || (Array.isArray(info?.artists) ? info.artists[0]?.trim() : null);

  if (!title && officialTrack) {
    title = officialTrack;
  }
  if (!artist && officialArtist) {
    artist = officialArtist;
  }

  // 2. Clean up common YouTube video decorations
  const cleanDecorations = (str) => {
    return str
      .replace(/\s*[\(\[](?:official\s*(?:music\s*)?video|official\s*audio|official|music\s*video|lyric\s*video|lyrics|audio|visualizer|hd|4k|hq|remastered|explicit|clean\s*version|extended\s*mix)[\)\]]/gi, '')
      .replace(/\s*[\(\[]\s*[\)\]]/g, '')
      .replace(/^["“”'']+|["“”'']+$/g, '')
      .trim();
  };

  const rawTitle = info?.title?.trim() || '';

  // 3. Try splitting video title on "Artist - Title" (e.g. "The Weeknd - Blinding Lights")
  if ((!title || !artist) && rawTitle) {
    const cleanedRawTitle = cleanDecorations(rawTitle);
    const separatorMatch = cleanedRawTitle.match(/^(.*?)\s*[-–—|:]\s*(.*)$/);

    if (separatorMatch) {
      const part1 = separatorMatch[1].trim();
      const part2 = separatorMatch[2].trim();

      if (!artist && !title) {
        artist = part1;
        title = part2;
      } else if (!artist && title) {
        artist = part1;
      } else if (artist && !title) {
        title = part2;
      }
    } else {
      if (!title) {
        title = cleanedRawTitle;
      }
    }
  }

  // 4. Fallback for artist from channel / uploader
  if (!artist) {
    let uploader = info?.uploader?.trim() || info?.channel?.trim() || '';
    if (uploader) {
      uploader = uploader
        .replace(/\s*-\s*Topic$/i, '')
        .replace(/VEVO$/i, '')
        .replace(/\s+Official(?:\s+Channel)?$/i, '')
        .replace(/\s+Records$/i, '')
        .trim();
      artist = uploader || 'Various Artists';
    } else {
      artist = 'Various Artists';
    }
  }

  // Fallback for title
  if (!title) {
    title = cleanDecorations(rawTitle) || 'Downloaded Audio';
  }

  // Final trim and cleanup
  title = title.replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim() || 'Downloaded Audio';
  artist = artist.replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim() || 'Various Artists';

  return { title, artist };
}

export async function extractAudioFromUrl(url, customMeta = {}) {
  const ytDlpCmd = (typeof config.resolveYtDlp === 'function' ? config.resolveYtDlp() : null)
    || (config.venvYtDlp && fs.existsSync(config.venvYtDlp) ? config.venvYtDlp : 'yt-dlp');

  const outputId = `track_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const outputPath = path.join(config.cacheDir, `${outputId}.%(ext)s`);

  // Ensure PATH contains all standard macOS and Homebrew tool locations
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const extraPaths = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    path.join(homeDir, '.local', 'bin'),
    path.join(homeDir, 'bin'),
    path.join(homeDir, 'Library', 'Application Support', 'pulse-music-player', 'bin'),
    process.resourcesPath ? path.join(process.resourcesPath, 'bin') : null,
  ].filter(Boolean);

  const existingPaths = (process.env.PATH || '').split(':');
  const enhancedPath = Array.from(new Set([...extraPaths, ...existingPaths])).filter(Boolean).join(':');

  const execEnv = {
    ...process.env,
    PATH: enhancedPath,
  };

  return new Promise((resolve, reject) => {
    const antiArgs = typeof config.getYtDlpAntiVerificationArgs === 'function'
      ? config.getYtDlpAntiVerificationArgs()
      : ['--js-runtimes', 'node', '--extractor-args', 'youtube:player_client=ios,android,mweb,web', '--geo-bypass'];
    const antiArgsStr = antiArgs.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ');

    // Download best available audio stream with client fallback and JS runtime support
    const cmd = `"${ytDlpCmd}" ${antiArgsStr} -f "ba[ext=m4a]/ba/b" --no-playlist -o "${outputPath}" --print-json "${url}"`;

    exec(cmd, { timeout: 90000, maxBuffer: 15 * 1024 * 1024, env: execEnv }, async (error, stdout, stderr) => {
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
      const files = fs.existsSync(config.cacheDir) ? fs.readdirSync(config.cacheDir) : [];
      const downloadedFile = files.find((f) => f.startsWith(outputId));

      if (downloadedFile) {
        // If secondary rootDir cache exists and differs from primary, mirror file for local dev access
        if (config.rootDirCache && config.rootDirCache !== config.cacheDir && fs.existsSync(config.rootDirCache)) {
          try {
            const src = path.join(config.cacheDir, downloadedFile);
            const dst = path.join(config.rootDirCache, downloadedFile);
            if (!fs.existsSync(dst)) {
              fs.copyFileSync(src, dst);
            }
          } catch (copyErr) {
            console.warn('Cache mirror notice:', copyErr.message);
          }
        }

        const ext = path.extname(downloadedFile).replace('.', '').toUpperCase() || 'M4A';
        const { title: trackTitle, artist: trackArtist } = parseTitleAndArtist(info, customMeta);
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
        const stderrStr = stderr ? stderr.toString() : '';
        const isVerificationRequired =
          stderrStr.includes('Sign in to confirm you’re not a bot') ||
          stderrStr.includes('Sign in to confirm you’re not a robot') ||
          stderrStr.includes('Sign in to confirm your age') ||
          stderrStr.includes('inappropriate for some users') ||
          stderrStr.includes('HTTP Error 429');

        // Automatic fallback: If YouTube requires verification (e.g. age-restricted music video or bot check),
        // recover the song title via oEmbed/metadata and download the clean audio track
        if (isVerificationRequired && !customMeta.__isRetry) {
          try {
            console.log('🔄 YouTube requires verification on direct video. Attempting clean audio fallback for:', url);
            let fallbackTitle = customMeta.title;
            let fallbackArtist = customMeta.artist;

            if (!fallbackTitle || !fallbackArtist) {
              try {
                const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
                const oembedRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
                if (oembedRes.ok) {
                  const oembedData = await oembedRes.json();
                  if (oembedData && oembedData.title) {
                    const parsed = parseTitleAndArtist({ title: oembedData.title, uploader: oembedData.author_name }, customMeta);
                    fallbackTitle = parsed.title;
                    fallbackArtist = parsed.artist;
                  }
                }
              } catch (oembedErr) {
                // oembed failed, continue
              }
            }

            if (fallbackTitle) {
              const searchQuery = `ytsearch1:${(fallbackArtist || '').replace(/[-–—]/g, ' ')} ${fallbackTitle.replace(/[-–—]/g, ' ')} audio`.trim();
              console.log('🔍 Searching clean audio fallback stream:', searchQuery);
              const fallbackTrack = await extractAudioFromUrl(searchQuery, {
                ...customMeta,
                title: fallbackTitle,
                artist: fallbackArtist || customMeta.artist,
                __isRetry: true,
              });
              return resolve(fallbackTrack);
            }
          } catch (fallbackError) {
            console.warn('Verification fallback attempt failed:', fallbackError.message);
          }
        }

        console.error('yt-dlp execution error:', {
          cmd,
          message: error.message,
          stderr: stderrStr.slice(0, 1000),
        });

        let userMsg = 'Failed to extract audio from link. Please verify the URL.';
        if (stderrStr) {
          if (stderrStr.includes('Private video')) userMsg = 'This video is private or requires sign-in.';
          else if (stderrStr.includes('Video unavailable')) userMsg = 'This video is unavailable or has been removed.';
          else if (isVerificationRequired) userMsg = 'YouTube requires verification for this specific video. You can place a cookies.txt file in Application Support/pulse-music-player or try another upload.';
        }
        return reject(new Error(userMsg));
      }

      reject(new Error('Audio file was not generated.'));
    });
  });
}
