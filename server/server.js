import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from './config/index.js';
import apiRouter from './routes/api.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security and CORS
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// An extensionless lookup recovers an original file for cloud tracks packaged as HLS.
const audioExtensions = ['m4a', 'mp4', 'mp3', 'aac', 'flac', 'wav', 'ogg', 'opus', 'webm'];
const cacheDirs = new Set([config.cacheDir, config.rootDirCache, config.userDataCache]);
for (const dir of cacheDirs) {
  if (dir) app.use('/audio', express.static(dir, { extensions: audioExtensions, index: false, redirect: false }));
}

// Audio not found handler: never fall through to HTML SPA fallback for audio requests!
app.use('/audio', (req, res) => {
  res.status(404).json({ error: 'Audio file not found in cache' });
});

// Mount API routes
app.use('/api', apiRouter);

// Serve frontend build in production
if (fs.existsSync(config.distDir)) {
  app.use(express.static(config.distDir));
  app.use((req, res) => {
    if (req.path.startsWith('/audio/') || req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.sendFile(path.join(config.distDir, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

// Start server
const server = app.listen(config.port, config.host, () => {
  console.log(`🎵 Pulse Audio Server running at http://${config.host}:${config.port}`);
  console.log(`📁 Audio cache directory: ${config.cacheDir}`);
});

export { app, server };
export default app;
