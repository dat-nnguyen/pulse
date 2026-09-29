import { fetchLyrics } from '../services/lyricsService.js';

export async function handleLyrics(req, res, next) {
  try {
    const { track_name, artist_name } = req.query;
    if (!track_name) {
      return res.status(400).json({ error: 'track_name query parameter is required' });
    }

    const lyricsData = await fetchLyrics(track_name, artist_name || '');
    res.json(lyricsData);
  } catch (error) {
    next(error);
  }
}
