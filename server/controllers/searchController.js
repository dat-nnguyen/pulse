import { searchYouTubeWeb } from '../services/youtubeSearchService.js';

export async function handleSearch(req, res, next) {
  try {
    const query = req.query.q || req.query.query;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Search query parameter (q) is required', results: [] });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 15, 30);
    const results = await searchYouTubeWeb(query.trim(), limit);

    res.json({
      success: true,
      query: query.trim(),
      total: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
}
