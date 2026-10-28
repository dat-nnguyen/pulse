import { openDB } from 'idb';
import {
  isSupabaseConfigured,
  saveTrackToSupabase,
  uploadAudioToSupabaseStorage,
  uploadCoverToSupabaseStorage,
  fetchTracksFromSupabase,
  savePlaylistToSupabase,
  fetchPlaylistsFromSupabase,
  toggleLikeInSupabase,
  fetchLikesFromSupabase,
  deleteTrackFromSupabase,
  deletePlaylistFromSupabase,
} from './supabaseService';
import { downloadAudioForTrack, prepareAudioBlob, readAudioDuration, finiteDuration } from './audioMediaService.js';
import { repairM4aTiming, AUDIO_TIMING_VERSION } from './mp4TimingService.js';

const DB_NAME = 'PulseAudioDB';
const DB_VERSION = 2;

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains('tracks')) {
        const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
        trackStore.createIndex('addedAt', 'addedAt');
        trackStore.createIndex('type', 'type');
      }
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('likes')) {
        db.createObjectStore('likes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
    },
  });
}

function audioFormat(mime, fallback = '') {
  return ({ 'audio/mp4': 'M4A', 'audio/mpeg': 'MP3', 'audio/aac': 'AAC', 'audio/flac': 'FLAC',
    'audio/wav': 'WAV', 'audio/ogg': 'OGG', 'audio/webm': 'WEBM' })[mime.split(';')[0]] || fallback || 'MP3';
}

export async function updateTrackDuration(id, duration) {
  if (!id || !finiteDuration(duration)) return;
  const db = await getDB();
  const track = await db.get('tracks', id);
  if (track && (!track.durationVerified || track.duration !== duration)) {
    await db.put('tracks', { ...track, duration, durationVerified: true });
  }
}

async function migrateAudioTiming(tracks, db) {
  const migrated = [];
  for (const track of tracks) {
    if (!(track.audioBlob instanceof Blob) || !track.audioBlob.size || track.audioTimingVersion === AUDIO_TIMING_VERSION) {
      migrated.push(track);
      continue;
    }
    const timing = await repairM4aTiming(track.audioBlob);
    const fixed = { ...track, audioBlob: timing.blob, audioTimingVersion: AUDIO_TIMING_VERSION,
      ...(timing.changed && timing.duration ? { duration: timing.duration, durationVerified: true } : {}) };
    await db.put('tracks', fixed);
    migrated.push(fixed);
  }
  return migrated;
}

// Persist a repaired playback cache locally; do not re-upload a user's library.
export async function cachePreparedPlaybackTrack(track) {
  const db = await getDB();
  const existing = await db.get('tracks', track.id);
  const saved = { ...existing, ...track, addedAt: existing?.addedAt || track.addedAt || Date.now(),
    isDownloaded: true, fileSizeBytes: track.audioBlob.size, audioTimingVersion: AUDIO_TIMING_VERSION };
  await db.put('tracks', saved);
  return saved;
}

// Track operations: Local IndexedDB + Supabase Cloud
export async function saveTrack(track) {
  const db = await getDB();
  const item = {
    ...track,
    addedAt: track.addedAt || Date.now(),
    isDownloaded: Boolean(track.audioBlob instanceof Blob && track.audioBlob.size > 0),
  };

  if (item.audioUrl && (item.audioUrl.startsWith('/audio/') || item.audioUrl.includes('localhost') || item.audioUrl.includes('127.0.0.1'))) {
    item.localAudioUrl = item.localAudioUrl || item.audioUrl;
  }

  if (!item.audioBlob && (item.audioUrl || item.cloudAudioUrl) && (typeof navigator === 'undefined' || navigator.onLine)) {
    // A download must contain audio, not just a remote URL or an HTML error page.
    item.audioBlob = await downloadAudioForTrack(item);
  }
  if (item.audioBlob instanceof Blob && item.audioBlob.size > 0) {
    item.audioBlob = await prepareAudioBlob(item.audioBlob, item);
    const measured = item.durationVerified && item.audioTimingVersion === AUDIO_TIMING_VERSION
      ? finiteDuration(item.duration) : await readAudioDuration(item.audioBlob);
    item.duration = measured || finiteDuration(item.duration);
    item.durationVerified = Boolean(measured);
    item.format = audioFormat(item.audioBlob.type, item.format);
    item.isDownloaded = true;
    item.fileSizeBytes = item.audioBlob.size;
    item.downloadedAt = item.downloadedAt || Date.now();
    item.audioTimingVersion = AUDIO_TIMING_VERSION;
  }
  await db.put('tracks', item);

  if (!item.offlineCacheOnly && isSupabaseConfigured() && (typeof navigator === 'undefined' || navigator.onLine)) {
    try {
      if (item.audioBlob instanceof Blob && item.audioBlob.size > 0) {
        try {
          const cloudAudioUrl = await uploadAudioToSupabaseStorage(item.id, item.audioBlob, `${item.title || 'track'}.${(item.format || 'mp3').toLowerCase()}`);
          if (cloudAudioUrl) {
            item.cloudAudioUrl = cloudAudioUrl;
            if (!item.localAudioUrl) item.audioUrl = cloudAudioUrl;
          }
        } catch (error) {
          console.warn('Audio storage upload warning:', error.message);
        }
      }
      const savedCloud = await saveTrackToSupabase(item);
      if (savedCloud) item.isCloudSynced = true;
    } catch (error) {
      console.warn('Supabase cloud track upload warning:', error.message);
    }
  }

  await db.put('tracks', item);
  return item;
}

export async function cacheTrackForOffline(track, onProgress = () => {}) {
  if (!track?.id) throw new Error('Missing track');
  const existing = await getTrackById(track.id);
  const cached = existing?.audioBlob instanceof Blob && existing.audioBlob.size > 0 ? existing : track;
  if (cached.audioBlob instanceof Blob && cached.audioBlob.size > 0) {
    let audioBlob;
    try { audioBlob = await prepareAudioBlob(cached.audioBlob, cached); }
    catch { /* Re-download an old cache entry containing an HTML/error response. */ }
    if (audioBlob) {
      const timing = await repairM4aTiming(cached.audioBlob);
      const saved = { ...track, ...cached, audioBlob, isDownloaded: true, audioTimingVersion: AUDIO_TIMING_VERSION,
        ...(timing.changed && timing.duration ? { duration: timing.duration, durationVerified: true } : {}) };
      const db = await getDB();
      await db.put('tracks', saved);
      return saved;
    }
  }

  onProgress({ status: 'downloading', trackId: track.id });
  const blob = await downloadAudioForTrack({ ...cached, ...track }, onProgress);
  const measured = await readAudioDuration(blob);

  const saved = {
    ...track,
    audioBlob: blob,
    duration: measured || finiteDuration(track.duration),
    durationVerified: Boolean(measured),
    audioTimingVersion: AUDIO_TIMING_VERSION,
    format: audioFormat(blob.type, track.format),
    isDownloaded: true,
    offlineCacheOnly: true,
    fileSizeBytes: blob.size,
    downloadedAt: Date.now(),
  };
  const db = await getDB();
  await db.put('tracks', saved);
  onProgress({ status: 'complete', trackId: track.id, bytes: blob.size });
  return saved;
}

export async function downloadPlaylistForOffline(playlist, tracks) {
  const trackMap = new Map((tracks || []).map((track) => [track.id, track]));
  const items = (playlist?.trackIds || []).map((id) => trackMap.get(id)).filter(Boolean);
  const failures = [];
  let completed = 0;

  for (const track of items) {
    try {
      await cacheTrackForOffline(track);
      completed += 1;
    } catch (error) {
      failures.push({ trackId: track.id, title: track.title, error: error.message });
    }
  }
  return { completed, total: items.length, failures };
}

export async function syncLibraryWithCloud(force = false) {
  const db = await getDB();
  const localTracks = await migrateAudioTiming(await db.getAll('tracks'), db);
  const localPlaylists = await db.getAll('playlists');
  const localLikes = await db.getAll('likes');

  if (!isSupabaseConfigured() || !navigator.onLine) {
    return {
      synced: false,
      reason: 'offline',
      tracks: await db.getAllFromIndex('tracks', 'addedAt'),
      playlists: localPlaylists,
      likedIds: new Set(localLikes.map((l) => l.id)),
    };
  }

  try {
    // 1. Fetch latest data from Supabase in parallel
    const [cloudTracks, cloudPlaylists, cloudLikes] = await Promise.all([
      fetchTracksFromSupabase(),
      fetchPlaylistsFromSupabase(),
      fetchLikesFromSupabase(),
    ]);

    const cloudTrackMap = new Map(cloudTracks.map((t) => [t.id, t]));
    const localTrackMap = new Map(localTracks.map((t) => [t.id, t]));

    // 2. Reconcile Tracks
    // Put / update all cloud tracks into local IndexedDB
    for (const ct of cloudTracks) {
      const local = localTrackMap.get(ct.id);
      const resolvedCloudUrl = ct.cloudAudioUrl || local?.cloudAudioUrl;
      const merged = {
        ...ct,
        // Retain local audioBlob for instant zero-latency playback if cached
        audioBlob: local?.audioBlob || ct.audioBlob,
        localAudioUrl: local?.localAudioUrl || ((ct.audioUrl && (ct.audioUrl.startsWith('/audio/') || ct.audioUrl.includes('localhost') || ct.audioUrl.includes('127.0.0.1'))) ? ct.audioUrl : null),
        duration: local?.durationVerified ? local.duration : ct.duration,
        durationVerified: Boolean(local?.durationVerified),
        audioTimingVersion: local?.audioTimingVersion,
        format: local?.audioBlob ? local.format : ct.format,
        cloudAudioUrl: resolvedCloudUrl,
        audioUrl: resolvedCloudUrl || ct.audioUrl,
        isDownloaded: Boolean((local?.audioBlob || ct.audioBlob)?.size),
        isCloudSynced: true,
      };
      await db.put('tracks', merged);
    }

    // Handle local tracks that are not on cloud:
    for (const lt of localTracks) {
      if (!cloudTrackMap.has(lt.id)) {
        if (lt.isCloudSynced && !force) {
          // Track was deleted on another device -> delete locally
          await db.delete('tracks', lt.id);
          await db.delete('likes', lt.id);
        } else {
          // Track was added offline or local -> push to Supabase
          try {
            await saveTrackToSupabase(lt);
            lt.isCloudSynced = true;
            await db.put('tracks', lt);
          } catch (err) {
            console.warn('Failed to upload offline track to cloud:', lt.id, err);
          }
        }
      }
    }

    // 3. Reconcile Playlists
    const cloudPlaylistMap = new Map(cloudPlaylists.map((p) => [p.id, p]));
    for (const cp of cloudPlaylists) {
      await db.put('playlists', cp);
    }

    for (const lp of localPlaylists) {
      if (!cloudPlaylistMap.has(lp.id)) {
        if (lp.isCloudSynced && !force) {
          // Deleted from cloud on other device
          await db.delete('playlists', lp.id);
        } else {
          // Push local playlist to cloud
          try {
            await savePlaylistToSupabase(lp);
            lp.isCloudSynced = true;
            await db.put('playlists', lp);
          } catch (err) {
            console.warn('Failed to upload local playlist to cloud:', lp.id, err);
          }
        }
      }
    }

    // 4. Reconcile Likes
    for (const l of localLikes) {
      if (!cloudLikes.has(l.id)) {
        await db.delete('likes', l.id);
      }
    }
    for (const id of cloudLikes) {
      await db.put('likes', { id, likedAt: Date.now() });
    }

    // Return fresh consolidated lists
    const freshTracks = await db.getAllFromIndex('tracks', 'addedAt');
    const freshPlaylists = await db.getAll('playlists');
    const freshLikes = await db.getAll('likes');

    return {
      synced: true,
      tracks: freshTracks,
      playlists: freshPlaylists,
      likedIds: new Set(freshLikes.map((l) => l.id)),
    };
  } catch (err) {
    console.warn('syncLibraryWithCloud error:', err);
    return {
      synced: false,
      error: err.message,
      tracks: await db.getAllFromIndex('tracks', 'addedAt'),
      playlists: await db.getAll('playlists'),
      likedIds: new Set((await db.getAll('likes')).map((l) => l.id)),
    };
  }
}

export async function getAllTracks({ syncCloud = true } = {}) {
  const db = await getDB();
  const localTracks = await migrateAudioTiming(await db.getAllFromIndex('tracks', 'addedAt'), db);

  if (syncCloud && isSupabaseConfigured() && navigator.onLine) {
    try {
      const syncResult = await syncLibraryWithCloud();
      if (syncResult.synced && Array.isArray(syncResult.tracks)) {
        return syncResult.tracks;
      }
    } catch (e) {
      console.warn('Initial cloud tracks fetch warning:', e);
    }
  }

  return localTracks;
}

export async function getTrackById(id) {
  const db = await getDB();
  return db.get('tracks', id);
}

export async function deleteTrack(id) {
  const db = await getDB();
  await db.delete('tracks', id);
  await db.delete('likes', id);

  // Remove from playlists locally
  const playlists = await db.getAll('playlists');
  for (const pl of playlists) {
    if (pl.trackIds?.includes(id)) {
      const updated = {
        ...pl,
        trackIds: pl.trackIds.filter((tId) => tId !== id),
      };
      await db.put('playlists', updated);
      if (isSupabaseConfigured() && navigator.onLine) {
        savePlaylistToSupabase(updated).catch(() => {});
      }
    }
  }

  if (isSupabaseConfigured() && navigator.onLine) {
    deleteTrackFromSupabase(id).catch((err) => {
      console.warn('Supabase delete track warning:', err);
    });
  }
}

// Likes operations
export async function toggleLike(trackId) {
  const db = await getDB();
  const exists = await db.get('likes', trackId);
  const isLiked = !exists;

  if (exists) {
    await db.delete('likes', trackId);
  } else {
    await db.put('likes', { id: trackId, likedAt: Date.now() });
  }

  if (isSupabaseConfigured() && navigator.onLine) {
    toggleLikeInSupabase(trackId, isLiked).catch(() => {});
  }

  return isLiked;
}

export async function getLikedIds({ syncCloud = true } = {}) {
  const db = await getDB();
  const items = await db.getAll('likes');
  const localSet = new Set(items.map((i) => i.id));

  if (syncCloud && isSupabaseConfigured() && navigator.onLine) {
    try {
      const cloudLikes = await fetchLikesFromSupabase();
      cloudLikes.forEach((id) => {
        localSet.add(id);
        db.put('likes', { id, likedAt: Date.now() }).catch(() => {});
      });
    } catch (e) {
      // Offline fallback
    }
  }

  return localSet;
}

// Playlists operations
export async function savePlaylist(playlist) {
  const db = await getDB();
  const pl = {
    ...playlist,
    name: playlist.name || playlist.title || 'Untitled Playlist',
    title: playlist.title || playlist.name || 'Untitled Playlist',
  };
  await db.put('playlists', pl);

  if (isSupabaseConfigured() && navigator.onLine) {
    savePlaylistToSupabase(pl).catch((err) => {
      console.warn('Supabase playlist save warning:', err);
    });
  }

  return pl;
}

export async function getAllPlaylists({ syncCloud = true } = {}) {
  const db = await getDB();
  const localPlaylists = await db.getAll('playlists');

  if (syncCloud && isSupabaseConfigured() && navigator.onLine) {
    try {
      const cloudPlaylists = await fetchPlaylistsFromSupabase();
      for (const cp of cloudPlaylists) {
        await db.put('playlists', cp);
      }
      return await db.getAll('playlists');
    } catch (e) {
      // Offline fallback
    }
  }

  return localPlaylists;
}

export async function deletePlaylist(id) {
  const db = await getDB();
  await db.delete('playlists', id);

  if (isSupabaseConfigured() && navigator.onLine) {
    deletePlaylistFromSupabase(id).catch((err) => {
      console.warn('Supabase delete playlist warning:', err);
    });
  }
}

// Export / Download Audio File directly to Device / Browser Downloads
export async function downloadTrackAudioFile(track) {
  try {
    const blob = track.audioBlob instanceof Blob && track.audioBlob.size
      ? await prepareAudioBlob(track.audioBlob, track)
      : await downloadAudioForTrack(track);
    const ext = audioFormat(blob.type, track.format).toLowerCase();
    const safeTitle = (track.title || 'track').replace(/[/\\?%*:|"<>]/g, '_');
    const safeArtist = (track.artist || 'artist').replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `${safeArtist} - ${safeTitle}.${ext}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (err) {
    console.error('Download audio file error:', err);
    throw err;
  }
}

// Settings operations
export async function getSetting(key, defaultValue = null) {
  const db = await getDB();
  const val = await db.get('settings', key);
  return val !== undefined ? val : defaultValue;
}

export async function setSetting(key, value) {
  const db = await getDB();
  await db.put('settings', value, key);
}

// Re-export duplicate detection and playlist deduplication utilities
export {
  normalizeTrackMeta,
  areTracksDuplicate,
  findDuplicateTrackInLibrary,
  isTrackInPlaylist,
  detectPlaylistDuplicates,
  deduplicatePlaylist,
  filterNewTracksForPlaylist,
} from './duplicateDetectionService';

