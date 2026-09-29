import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const CACHE_DIR = process.env.CACHE_DIR || path.join(rootDir, 'audio_cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export const config = {
  port: process.env.PORT || 3001,
  host: process.env.HOST || '0.0.0.0',
  cacheDir: CACHE_DIR,
  distDir: path.join(rootDir, 'dist'),
  venvYtDlp: path.join(rootDir, '.venv', 'bin', 'yt-dlp'),
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
};
