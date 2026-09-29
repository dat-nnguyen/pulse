import { openDB } from 'idb';

const DB_NAME = 'SpotifyLocalDB';
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

// Track operations
export async function saveTrack(track) {
  const db = await getDB();
  const item = {
    ...track,
    addedAt: track.addedAt || Date.now(),
    isDownloaded: Boolean(track.audioBlob || track.isDownloaded),
  };
  await db.put('tracks', item);
  return item;
}

export async function getAllTracks() {
  const db = await getDB();
  return db.getAllFromIndex('tracks', 'addedAt');
}

export async function getTrackById(id) {
  const db = await getDB();
  return db.get('tracks', id);
}

export async function deleteTrack(id) {
  const db = await getDB();
  await db.delete('tracks', id);
  await db.delete('likes', id);
}

// Likes operations
export async function toggleLike(trackId) {
  const db = await getDB();
  const exists = await db.get('likes', trackId);
  if (exists) {
    await db.delete('likes', trackId);
    return false;
  } else {
    await db.put('likes', { id: trackId, likedAt: Date.now() });
    return true;
  }
}

export async function getLikedIds() {
  const db = await getDB();
  const items = await db.getAll('likes');
  return new Set(items.map((i) => i.id));
}

// Playlists operations
export async function savePlaylist(playlist) {
  const db = await getDB();
  await db.put('playlists', playlist);
  return playlist;
}

export async function getAllPlaylists() {
  const db = await getDB();
  return db.getAll('playlists');
}

export async function deletePlaylist(id) {
  const db = await getDB();
  await db.delete('playlists', id);
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
