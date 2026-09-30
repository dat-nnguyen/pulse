import { Router } from 'express';
import { handleDownload } from '../controllers/downloadController.js';
import { handlePodcastFeed } from '../controllers/podcastController.js';

const router = Router();

// Healthcheck
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    app: 'Pulse High-Fidelity Audio Player',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Audio & Media Endpoints
router.post('/download', handleDownload);
router.get('/podcast/feed', handlePodcastFeed);

export default router;
