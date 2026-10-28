import { extractAudioFromUrl } from '../services/audioExtractor.js';

export async function handleDownload(req, res, next) {
  try {
    const { url, title, artist, album, type } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const result = await extractAudioFromUrl(url, { title, artist, album, type });
    res.json(result);
  } catch (error) {
    next(error);
  }
}
