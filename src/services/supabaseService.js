import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
export { isSupabaseConfigured };

// Upload audio blob/file to Supabase Storage Bucket ('audio-files')
export async function uploadAudioToSupabaseStorage(trackId, fileBlob, filename = 'track.mp3') {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured');

  const fileExt = (filename.split('.').pop() || 'mp3').toLowerCase();
  const filePath = `audio/${trackId}.${fileExt}`;

  let contentType = fileBlob.type;
  if (!contentType || contentType === 'application/octet-stream') {
    if (fileExt === 'm4a') contentType = 'audio/mp4';
    else if (fileExt === 'flac') contentType = 'audio/flac';
    else if (fileExt === 'wav') contentType = 'audio/wav';
    else if (fileExt === 'aac') contentType = 'audio/aac';
    else contentType = 'audio/mpeg';
  }

  const { error } = await client.storage.from('audio-files').upload(filePath, fileBlob, {
    upsert: true,
    contentType,
  });

  if (error) {
    console.warn(`Supabase Storage upload warning for ${filePath}:`, error.message);
    throw error;
  }

  const { data } = client.storage.from('audio-files').getPublicUrl(filePath);
  return data.publicUrl;
}

// Upload album cover image to Supabase Storage
export async function uploadCoverToSupabaseStorage(trackId, imageBlob) {
  const client = getSupabaseClient();
  if (!client) return null;

  const filePath = `covers/${trackId}.png`;
  const { error } = await client.storage.from('audio-files').upload(filePath, imageBlob, {
    upsert: true,
    contentType: imageBlob.type || 'image/png',
  });

  if (error) return null;
  const { data } = client.storage.from('audio-files').getPublicUrl(filePath);
  return data.publicUrl;
}

// Upsert track in Supabase 'tracks' table
export async function saveTrackToSupabase(track) {
  const client = getSupabaseClient();
  if (!client) return null;

  const record = {
    id: track.id,
    title: track.title || 'Untitled Track',
    artist: track.artist || 'Unknown Artist',
    album: track.album || 'Single',
    duration: Math.round(track.duration || 180),
    cover_url: track.coverUrl || null,
    audio_url: track.cloudAudioUrl || track.audioUrl,
    bitrate: track.bitrate || '320kbps Original',
    format: track.format || 'MP3',
    type: track.type || 'music',
  };

  const { data, error } = await client.from('tracks').upsert(record).select().single();
  if (error) {
    console.warn('Supabase track save error:', error.message);
    return null;
  }

  return {
    ...track,
    id: data.id,
    audioUrl: data.audio_url,
    coverUrl: data.cover_url,
  };
}

// Fetch all tracks from Supabase
export async function fetchTracksFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('tracks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Failed to fetch tracks from Supabase:', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    duration: row.duration,
    coverUrl: row.cover_url,
    audioUrl: row.audio_url,
    bitrate: row.bitrate,
    format: row.format,
    type: row.type,
    lyrics: row.lyrics,
    addedAt: new Date(row.created_at).getTime(),
    isCloudSynced: true,
  }));
}

// Fetch all playlists from Supabase
export async function fetchPlaylistsFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data: playlistsData, error: plErr } = await client.from('playlists').select('*');
  if (plErr) return [];

  const { data: tracksJunction } = await client.from('playlist_tracks').select('*').order('position');

  const junctionMap = {};
  (tracksJunction || []).forEach((j) => {
    if (!junctionMap[j.playlist_id]) junctionMap[j.playlist_id] = [];
    junctionMap[j.playlist_id].push(j.track_id);
  });

  return (playlistsData || []).map((pl) => ({
    id: pl.id,
    name: pl.name,
    title: pl.name,
    description: pl.description,
    coverUrl: pl.cover_url,
    trackIds: junctionMap[pl.id] || [],
    createdAt: new Date(pl.created_at).getTime(),
    isCloudSynced: true,
  }));
}

// Save playlist to Supabase
export async function savePlaylistToSupabase(playlist) {
  const client = getSupabaseClient();
  if (!client) return null;

  const { error: plError } = await client.from('playlists').upsert({
    id: playlist.id,
    name: playlist.name || playlist.title || 'Untitled Playlist',
    description: playlist.description || '',
    cover_url: playlist.coverUrl || null,
  });

  if (plError) {
    console.warn('Supabase playlist save error:', plError.message);
    return null;
  }

  // Sync track junction
  if (Array.isArray(playlist.trackIds)) {
    await client.from('playlist_tracks').delete().eq('playlist_id', playlist.id);
    const rows = playlist.trackIds.map((trackId, idx) => ({
      playlist_id: playlist.id,
      track_id: trackId,
      position: idx,
    }));
    if (rows.length > 0) {
      await client.from('playlist_tracks').insert(rows);
    }
  }

  return { ...playlist, isCloudSynced: true };
}

// Sync likes
export async function fetchLikesFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return new Set();

  const { data, error } = await client.from('likes').select('track_id');
  if (error) return new Set();

  return new Set((data || []).map((d) => d.track_id));
}

export async function toggleLikeInSupabase(trackId, isLiked) {
  const client = getSupabaseClient();
  if (!client) return;

  if (isLiked) {
    await client.from('likes').upsert({ track_id: trackId });
  } else {
    await client.from('likes').delete().eq('track_id', trackId);
  }
}

export async function deleteTrackFromSupabase(trackId) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('tracks').delete().eq('id', trackId);
  } catch (err) {
    console.warn('Failed to delete track from Supabase:', err);
  }
}

export async function deletePlaylistFromSupabase(playlistId) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('playlists').delete().eq('id', playlistId);
  } catch (err) {
    console.warn('Failed to delete playlist from Supabase:', err);
  }
}

// Realtime Changes Listener
export function subscribeToCloudChanges(onSyncNeeded) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel('pulse-realtime-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tracks' }, (payload) => {
      onSyncNeeded('tracks', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, (payload) => {
      onSyncNeeded('playlists', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'playlist_tracks' }, (payload) => {
      onSyncNeeded('playlist_tracks', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, (payload) => {
      onSyncNeeded('likes', payload);
    })
    .subscribe();

  return () => {
    try {
      client.removeChannel(channel);
    } catch (e) {}
  };
}
