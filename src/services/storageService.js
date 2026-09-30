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

// Track operations: Local IndexedDB + Supabase Cloud
export async function saveTrack(track) {
  const db = await getDB();
  let item = {
    ...track,
    addedAt: track.addedAt || Date.now(),
    isDownloaded: Boolean(track.audioBlob || track.isDownloaded),
  };

  // Preserve local URL for instant offline/desktop playback
  if (item.audioUrl && (item.audioUrl.startsWith('/audio/') || item.audioUrl.includes('localhost') || item.audioUrl.includes('127.0.0.1'))) {
    item.localAudioUrl = item.localAudioUrl || item.audioUrl;
  }

  // If Supabase is configured, upload audio file & metadata to cloud
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      // 1. If audioBlob exists (e.g. from local file import), upload to Supabase Storage
      if (item.audioBlob && item.audioBlob instanceof Blob) {
        try {
          const cloudAudioUrl = await uploadAudioToSupabaseStorage(
            item.id,
            item.audioBlob,
            `${item.title || 'track'}.${(item.format || 'mp3').toLowerCase()}`
          );
          if (cloudAudioUrl) {
            item.cloudAudioUrl = cloudAudioUrl;
            if (!item.localAudioUrl) {
              item.audioUrl = cloudAudioUrl;
            }
          }
        } catch (uploadErr) {
          console.warn('Audio storage upload warning:', uploadErr.message);
        }
      } else if (
        item.audioUrl &&
        (item.audioUrl.startsWith('/audio/') ||
          item.audioUrl.startsWith('http://localhost') ||
          item.audioUrl.startsWith('http://127.0.0.1'))
      ) {
        // If downloaded via local Mac backend, fetch the audio and upload to Supabase Storage
        // so iPhone and Web can stream it globally!
        try {
          let fetchTarget = item.localAudioUrl || item.audioUrl;
          if (fetchTarget.startsWith('/audio/')) {
            const host = (typeof window !== 'undefined' && window.location?.origin?.startsWith('http'))
              ? window.location.origin
              : 'http://127.0.0.1:3030';
            fetchTarget = `${host}${fetchTarget}`;
          }
          const res = await fetch(fetchTarget);
          if (res.ok) {
            const blob = await res.blob();
            item.audioBlob = blob;
            const cloudAudioUrl = await uploadAudioToSupabaseStorage(
              item.id,
              blob,
              `${item.title || 'track'}.${(item.format || 'm4a').toLowerCase()}`
            );
            if (cloudAudioUrl) {
              item.cloudAudioUrl = cloudAudioUrl;
            }
          }
        } catch (fetchErr) {
          console.warn('Local audio stream to Supabase upload warning:', fetchErr.message);
        }
      }

      const savedCloud = await saveTrackToSupabase(item);
      if (savedCloud) {
        item.isCloudSynced = true;
      }
    } catch (cloudErr) {
      console.warn('Supabase cloud track upload warning:', cloudErr.message);
    }
  }

  await db.put('tracks', item);
  return item;
}

// Complete Bidirectional Cloud Sync
export async function syncLibraryWithCloud(force = false) {
  const db = await getDB();
  const localTracks = await db.getAll('tracks');
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
      const merged = {
        ...ct,
        // Retain local audioBlob for instant zero-latency playback if cached
        audioBlob: local?.audioBlob || ct.audioBlob,
        isDownloaded: Boolean(local?.audioBlob || ct.isDownloaded),
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

export async function getAllTracks() {
  const db = await getDB();
  const localTracks = await db.getAllFromIndex('tracks', 'addedAt');

  if (isSupabaseConfigured() && navigator.onLine) {
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

export async function getLikedIds() {
  const db = await getDB();
  const items = await db.getAll('likes');
  const localSet = new Set(items.map((i) => i.id));

  if (isSupabaseConfigured() && navigator.onLine) {
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

export async function getAllPlaylists() {
  const db = await getDB();
  const localPlaylists = await db.getAll('playlists');

  if (isSupabaseConfigured() && navigator.onLine) {
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
    let blob = track.audioBlob;
    if (!blob) {
      const url = track.audioUrlHighQuality || track.audioUrl;
      if (!url) throw new Error('No audio URL found for this track');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch audio stream (${res.status})`);
      blob = await res.blob();
    }

    const ext = (track.format || 'mp3').toLowerCase();
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
