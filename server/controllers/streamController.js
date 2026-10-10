import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config, resolveYtDlpBinary } from '../config/index.js';

/**
 * Streams audio from YouTube on the fly for audio testing and previewing.
 * Uses yt-dlp stdout piping so zero temporary storage is required,
 * with immediate kill on client disconnect to prevent CPU waste.
 */
export async function handleStream(req, res, next) {
  try {
    const videoId = req.query.id;
    let url = req.query.url;

    if (!url && videoId) {
      url = `https://www.youtube.com/watch?v=${videoId}`;
    }

    if (!url) {
      return res.status(400).json({ error: 'Video ID or URL parameter is required' });
    }

    // 1. If audio for this video is already in local cache, redirect directly to static audio
    if (videoId && fs.existsSync(config.cacheDir)) {
      try {
        const files = fs.readdirSync(config.cacheDir);
        const match = files.find((f) => f.includes(videoId));
        if (match) {
          return res.redirect(`/audio/${match}`);
        }
      } catch (cacheErr) {
        // Continue to stream
      }
    }

    const ytDlpCmd = (typeof config.resolveYtDlp === 'function' ? config.resolveYtDlp() : null)
      || (typeof resolveYtDlpBinary === 'function' ? resolveYtDlpBinary() : 'yt-dlp');

    // Build process environment with expanded PATH
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const extraPaths = [
      '/usr/local/bin',
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/usr/bin',
      '/bin',
      path.join(homeDir, '.local', 'bin'),
      path.join(homeDir, 'bin'),
      path.join(homeDir, 'Library', 'Application Support', 'pulse-music-player', 'bin'),
      process.resourcesPath ? path.join(process.resourcesPath, 'bin') : null,
    ].filter(Boolean);

    const existingPaths = (process.env.PATH || '').split(':');
    const enhancedPath = Array.from(new Set([...extraPaths, ...existingPaths])).filter(Boolean).join(':');

    const antiArgs = typeof config.getYtDlpAntiVerificationArgs === 'function'
      ? config.getYtDlpAntiVerificationArgs()
      : ['--js-runtimes', 'node', '--extractor-args', 'youtube:player_client=ios,android,mweb,web', '--geo-bypass'];

    const proc = spawn(ytDlpCmd, [
      ...antiArgs,
      '-f', 'ba[ext=m4a]/ba/b',
      '--no-playlist',
      '--buffer-size', '16K',
      '-o', '-',
      url,
    ], {
      env: {
        ...process.env,
        PATH: enhancedPath,
      },
    });

    res.setHeader('Content-Type', 'audio/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    proc.stdout.pipe(res);

    // Clean up instantly when client pauses, closes tab, or switches preview
    req.on('close', () => {
      try {
        proc.kill('SIGTERM');
      } catch (e) {}
    });

    proc.on('error', (err) => {
      console.warn('Audio preview streaming process error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to initiate audio stream' });
      }
    });

    proc.stderr.on('data', (chunk) => {
      // Optional logging for debugging
    });
  } catch (error) {
    next(error);
  }
}
