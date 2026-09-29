// Podcast service using Apple Podcasts Search API and RSS feed parser

const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `/api/podcast/feed?url=${encodeURIComponent(url)}`,
];

export async function searchApplePodcasts(term) {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=podcast&limit=20`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return (data.results || []).map((p) => ({
      id: String(p.collectionId),
      name: p.collectionName,
      artist: p.artistName,
      coverUrl: p.artworkUrl600 || p.artworkUrl100,
      feedUrl: p.feedUrl,
      genres: p.genres || [],
      trackCount: p.trackCount,
    }));
  } catch (err) {
    console.warn('Apple Podcasts search failed:', err);
    return [];
  }
}

export async function fetchPodcastFeed(feedUrl) {
  let xmlText = null;

  // Try direct fetch first
  try {
    const directRes = await fetch(feedUrl, { signal: AbortSignal.timeout(4000) });
    if (directRes.ok) {
      xmlText = await directRes.text();
    }
  } catch (e) {
    // direct fetch failed due to CORS, continue to proxies
  }

  // Try proxies if direct fetch failed
  if (!xmlText) {
    for (const proxyFn of CORS_PROXIES) {
      try {
        const proxyUrl = proxyFn(feedUrl);
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          xmlText = await res.text();
          if (xmlText && xmlText.includes('<rss')) break;
        }
      } catch (err) {
        // try next proxy
      }
    }
  }

  if (!xmlText) {
    throw new Error('Could not fetch podcast feed. Please check URL or network connection.');
  }

  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');

  const channel = xml.querySelector('channel');
  if (!channel) throw new Error('Invalid podcast RSS feed structure.');

  const podcastTitle = channel.querySelector('title')?.textContent || 'Podcast';
  const podcastDesc = channel.querySelector('description')?.textContent || '';
  const podcastAuthor = channel.querySelector('itunes\\:author, author')?.textContent || '';
  const podcastImg =
    channel.querySelector('itunes\\:image')?.getAttribute('href') ||
    channel.querySelector('image > url')?.textContent ||
    '';

  const items = Array.from(channel.querySelectorAll('item'));
  const episodes = items.slice(0, 50).map((item, idx) => {
    const title = item.querySelector('title')?.textContent || `Episode ${idx + 1}`;
    const description = item.querySelector('description, itunes\\:summary')?.textContent || '';
    const pubDate = item.querySelector('pubDate')?.textContent || '';
    const duration = item.querySelector('itunes\\:duration')?.textContent || '00:00';
    const enclosure = item.querySelector('enclosure');
    const audioUrl = enclosure?.getAttribute('url') || '';
    const length = enclosure?.getAttribute('length') || '';

    return {
      id: `pod_${item.querySelector('guid')?.textContent || idx}_${Date.now()}`,
      title,
      artist: podcastTitle,
      album: podcastTitle,
      description,
      pubDate,
      duration: parseDurationToSeconds(duration),
      formattedDuration: formatDurationDisplay(duration),
      audioUrl,
      coverUrl: podcastImg,
      type: 'podcast',
      bitrate: 'Original Broadcast Quality',
    };
  }).filter((ep) => Boolean(ep.audioUrl));

  return {
    title: podcastTitle,
    description: podcastDesc,
    author: podcastAuthor,
    coverUrl: podcastImg,
    episodes,
  };
}

function parseDurationToSeconds(dur) {
  if (!dur) return 0;
  if (/^\d+$/.test(dur.trim())) return parseInt(dur.trim(), 10);
  const parts = dur.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatDurationDisplay(dur) {
  if (!dur) return '';
  const secs = parseDurationToSeconds(dur);
  const mins = Math.floor(secs / 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} hr ${remMins} min`;
  }
  return `${mins} min`;
}

// Curated popular podcasts for instant discovery
export const FEATURED_PODCASTS = [
  {
    id: 'huberman',
    name: 'Huberman Lab',
    artist: 'Dr. Andrew Huberman',
    coverUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
    feedUrl: 'https://feeds.megaphone.fm/hubermanlab',
    genre: 'Science & Health',
  },
  {
    id: 'lex-fridman',
    name: 'Lex Fridman Podcast',
    artist: 'Lex Fridman',
    coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
    feedUrl: 'https://lexfridman.com/feed/podcast/',
    genre: 'Technology & AI',
  },
  {
    id: 'daily',
    name: 'The Daily',
    artist: 'The New York Times',
    coverUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80',
    feedUrl: 'https://rss.art19.com/the-daily',
    genre: 'News & Current Affairs',
  },
  {
    id: 'song-exploder',
    name: 'Song Exploder',
    artist: 'Hrishikesh Hirway',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    feedUrl: 'https://feeds.simplecast.com/7xQsmZzP',
    genre: 'Music & Storytelling',
  }
];
