import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isAsar = __filename.includes('.asar');
const rootDir = path.resolve(__dirname, '../../');

// On macOS / Linux / Windows, determine user data directory
const homeDir = process.env.HOME || process.env.USERPROFILE || '';
const userDataCache = process.platform === 'darwin'
  ? path.join(homeDir, 'Library', 'Application Support', 'pulse-music-player', 'audio_cache')
  : path.join(homeDir, '.config', 'pulse-music-player', 'audio_cache');

// rootDirCache only exists if running in dev (not inside read-only .asar archive)
const rootDirCache = isAsar ? null : path.join(rootDir, 'audio_cache');
if (rootDirCache && !fs.existsSync(rootDirCache)) {
  try {
    fs.mkdirSync(rootDirCache, { recursive: true });
  } catch (e) {}
}

const CACHE_DIR = process.env.CACHE_DIR || (isAsar ? userDataCache : (fs.existsSync(userDataCache) ? userDataCache : (rootDirCache || userDataCache)));
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch (e) {}
}

export function resolveYtDlpBinary() {
  if (process.env.YT_DLP_PATH && fs.existsSync(process.env.YT_DLP_PATH)) {
    return process.env.YT_DLP_PATH;
  }

  const candidatePaths = [
    // 1. Packaged electron Resources/bin/yt-dlp
    process.resourcesPath ? path.join(process.resourcesPath, 'bin', 'yt-dlp') : null,
    // 2. Persistent user Application Support bin
    path.join(homeDir, 'Library', 'Application Support', 'pulse-music-player', 'bin', 'yt-dlp'),
    // 3. Project root / parent bin
    path.join(rootDir, 'bin', 'yt-dlp'),
    path.join(rootDir, '..', 'bin', 'yt-dlp'),
    // 4. Standard Mac system/brew paths
    '/usr/local/bin/yt-dlp',
    '/opt/homebrew/bin/yt-dlp',
    path.join(homeDir, '.local', 'bin', 'yt-dlp'),
    // 5. Development repo venv / bin
    path.join(rootDir, '.venv', 'bin', 'yt-dlp'),
    '/Users/datnguyen/Documents/project/real-free-music-player/bin/yt-dlp',
    '/Users/datnguyen/Documents/project/real-free-music-player/.venv/bin/yt-dlp',
  ].filter(Boolean);

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (e) {}
  }

  return 'yt-dlp';
}

// Augment PATH so any spawned process can find yt-dlp or system tools
const extraPaths = [
  '/usr/local/bin',
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  path.join(homeDir, '.local', 'bin'),
  path.join(homeDir, 'Library', 'Application Support', 'pulse-music-player', 'bin'),
  path.join(rootDir, 'bin'),
  process.resourcesPath ? path.join(process.resourcesPath, 'bin') : null,
].filter(Boolean);

const existingPaths = (process.env.PATH || '').split(':');
process.env.PATH = Array.from(new Set([...extraPaths, ...existingPaths])).filter(Boolean).join(':');

const resolvedYtDlp = resolveYtDlpBinary();

export const config = {
  port: process.env.PORT || 3030,
  host: process.env.HOST || '0.0.0.0',
  cacheDir: CACHE_DIR,
  rootDirCache,
  userDataCache,
  distDir: process.env.DIST_DIR || path.join(rootDir, 'dist'),
  venvYtDlp: resolvedYtDlp,
  resolveYtDlp: resolveYtDlpBinary,
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
};

