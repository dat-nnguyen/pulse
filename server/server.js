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

// Serve cached audio files
app.use('/audio', express.static(config.cacheDir));

// Mount API routes
app.use('/api', apiRouter);

// Serve frontend build in production
if (fs.existsSync(config.distDir)) {
  app.use(express.static(config.distDir));
  app.use((req, res) => {
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
