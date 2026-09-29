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

const DB_NAME = 'AuraAudioDB';
const DB_VERSION = 1;

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
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

  // If Supabase is configured, upload to cloud in background
  if (isSupabaseConfigured()) {
    try {
      let cloudAudioUrl = item.audioUrl;
      // If user uploaded a local file blob, upload it to Supabase Storage
      if (item.audioBlob && item.audioBlob instanceof Blob) {
        cloudAudioUrl = await uploadAudioToSupabaseStorage(
          item.id,
          item.audioBlob,
          `${item.title || 'track'}.mp3`
        );
        item.audioUrl = cloudAudioUrl;
      }

      await saveTrackToSupabase(item);
      item.isCloudSynced = true;
    } catch (cloudErr) {
      console.warn('Supabase cloud track upload warning:', cloudErr);
    }
  }

  await db.put('tracks', item);
  return item;
}

export async function getAllTracks() {
  const db = await getDB();
  const localTracks = await db.getAllFromIndex('tracks', 'addedAt');

  // If Supabase is configured, fetch latest tracks from cloud and merge
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const cloudTracks = await fetchTracksFromSupabase();
      if (cloudTracks.length > 0) {
        for (const ct of cloudTracks) {
          const existing = await db.get('tracks', ct.id);
          if (!existing) {
            await db.put('tracks', ct);
            localTracks.unshift(ct);
          }
        }
      }
    } catch (e) {
      console.warn('Cloud tracks fetch warning:', e);
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
  await db.put('playlists', playlist);

  if (isSupabaseConfigured() && navigator.onLine) {
    savePlaylistToSupabase(playlist).catch((err) => {
      console.warn('Supabase playlist save warning:', err);
    });
  }

  return playlist;
}

export async function getAllPlaylists() {
  const db = await getDB();
  const localPlaylists = await db.getAll('playlists');

  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const cloudPlaylists = await fetchPlaylistsFromSupabase();
      for (const cp of cloudPlaylists) {
        await db.put('playlists', cp);
        if (!localPlaylists.some((p) => p.id === cp.id)) {
          localPlaylists.push(cp);
        }
      }
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
