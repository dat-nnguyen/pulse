import { exec } from 'child_process';
import { parseTitleAndArtist } from './audioExtractor.js';
import { config } from '../config/index.js';

/**
 * Fast YouTube Search Service without API keys.
 * Primary method: Scrapes YouTube search initial data via HTTP (200-400ms).
 * Fallback method: yt-dlp flat-playlist search.
 */

export async function searchYouTubeWeb(query, limit = 15) {
  if (!query || !query.trim()) return [];

  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`YouTube HTTP returned status ${response.status}`);
    }

    const html = await response.text();
    const match =
      html.match(/var ytInitialData\s*=\s*({.+?});<\/script>/s) ||
      html.match(/ytInitialData\s*=\s*({.+?});/s);

    if (!match) {
      throw new Error('ytInitialData JSON payload not found in response');
    }

    const data = JSON.parse(match[1]);
    const sectionList =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;

    if (!Array.isArray(sectionList)) {
      return [];
    }

    const items = [];
    for (const section of sectionList) {
      const contents = section.itemSectionRenderer?.contents;
      if (!Array.isArray(contents)) continue;

      for (const item of contents) {
        const v = item.videoRenderer;
        if (!v || !v.videoId) continue;

        const rawTitle = v.title?.runs?.map((r) => r.text).join('') || v.title?.simpleText || '';
        const rawChannel =
          v.ownerText?.runs?.[0]?.text ||
          v.shortBylineText?.runs?.[0]?.text ||
          'Various Artists';
        const duration = v.lengthText?.simpleText || '';
        const views = v.viewCountText?.simpleText || '';
        const publishedTime = v.publishedTimeText?.simpleText || '';

        // Highest quality thumbnail available in array
        const thumbnails = v.thumbnail?.thumbnails || [];
        const thumbnail =
          thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : '';

        // Extract clean song title and artist using intelligent metadata parser
        const { title: cleanTitle, artist: cleanArtist } = parseTitleAndArtist({
          title: rawTitle,
          uploader: rawChannel,
          channel: rawChannel,
        });

        items.push({
          id: v.videoId,
          title: rawTitle,
          cleanTitle,
          cleanArtist,
          channel: rawChannel,
          duration,
          views,
          publishedTime,
          thumbnail,
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
        });

        if (items.length >= limit) break;
      }
      if (items.length >= limit) break;
    }

    if (items.length > 0) {
      return items;
    }
  } catch (webErr) {
    console.warn('Web scrape search notice, checking fallback:', webErr.message);
  }

  // Fallback: yt-dlp flat-playlist search
  return searchYouTubeYtDlp(query, limit);
}

/**
 * Fallback YouTube search using yt-dlp flat-playlist extractor
 */
export async function searchYouTubeYtDlp(query, limit = 10) {
  const ytDlpCmd =
    (typeof config.resolveYtDlp === 'function' ? config.resolveYtDlp() : null) ||
    config.venvYtDlp ||
    'yt-dlp';

  return new Promise((resolve) => {
    const cmd = `"${ytDlpCmd}" "ytsearch${limit}:${query.replace(/"/g, '\\"')}" --dump-json --flat-playlist --no-warnings`;

    exec(
      cmd,
      {
        timeout: 12000,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
        },
      },
      (error, stdout) => {
        if (error || !stdout) {
          return resolve([]);
        }

        const items = [];
        const lines = stdout.trim().split('\n');

        for (const line of lines) {
          try {
            const data = JSON.parse(line.trim());
            if (!data.id) continue;

            const { title: cleanTitle, artist: cleanArtist } = parseTitleAndArtist(data);

            const durationSec = Math.round(data.duration || 0);
            const durationFormatted =
              durationSec > 0
                ? `${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, '0')}`
                : '';

            items.push({
              id: data.id,
              title: data.title || '',
              cleanTitle,
              cleanArtist,
              channel: data.uploader || data.channel || 'Various Artists',
              duration: durationFormatted,
              views: data.view_count ? `${Number(data.view_count).toLocaleString()} views` : '',
              publishedTime: '',
              thumbnail: data.thumbnail || (data.thumbnails?.[0]?.url ?? ''),
              url: data.url || `https://www.youtube.com/watch?v=${data.id}`,
            });
          } catch (e) {}
        }

        resolve(items.slice(0, limit));
      }
    );
  });
}
