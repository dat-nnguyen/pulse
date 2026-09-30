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

export const config = {
  port: process.env.PORT || 3030,
  host: process.env.HOST || '0.0.0.0',
  cacheDir: CACHE_DIR,
  rootDirCache,
  userDataCache,
  distDir: process.env.DIST_DIR || path.join(rootDir, 'dist'),
  venvYtDlp: process.env.YT_DLP_PATH || path.join(rootDir, '.venv', 'bin', 'yt-dlp'),
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
};

