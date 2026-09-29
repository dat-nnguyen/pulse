import { fetchPodcastFeedXml } from '../services/podcastService.js';

export async function handlePodcastFeed(req, res, next) {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'Podcast URL query parameter is required' });
    }

    const xml = await fetchPodcastFeedXml(url);
    res.set('Content-Type', 'text/xml');
    res.send(xml);
  } catch (error) {
    next(error);
  }
}
