// Duplicate detection and playlist deduplication service

/**
 * Normalizes title or artist metadata by stripping common YouTube/audio tags,
 * release versions, brackets, punctuation, and excess whitespace.
 */
export function normalizeTrackMeta(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    // Strip common audio & video release tags and decorations in brackets/parentheses
    .replace(
      /\s*[\(\[](?:official\s*(?:music\s*)?video|official\s*video|official\s*audio|official|music\s*video|lyric\s*video|lyrics|audio|visualizer|hd|4k(?:\s*60fps)?|hq|(?:4k\s+)?remaster(?:ed)?(?:\s*\d+)?|explicit|clean\s*version|extended\s*mix|topic)[\)\]]/gi,
      ''
    )
    .replace(/\s*[\(\[]\s*[\)\]]/g, '')
    // Replace punctuation with empty string
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

/**
 * Determines whether two tracks represent the same audio track.
 * Matches by exact ID, audioUrl, or normalized title + artist.
 */
export function areTracksDuplicate(trackA, trackB) {
  if (!trackA || !trackB) return false;

  // 1. Direct ID match
  if (trackA.id && trackB.id && trackA.id === trackB.id) {
    return true;
  }

  // 2. Direct audio URL match
  if (trackA.audioUrl && trackB.audioUrl && trackA.audioUrl === trackB.audioUrl) {
    return true;
  }

  // 3. Normalized Title + Artist match
  const normTitleA = normalizeTrackMeta(trackA.title);
  const normTitleB = normalizeTrackMeta(trackB.title);
  const normArtistA = normalizeTrackMeta(trackA.artist);
  const normArtistB = normalizeTrackMeta(trackB.artist);

  if (!normTitleA || !normTitleB) return false;

  // Exact title match
  if (normTitleA === normTitleB) {
    // If either artist is missing or generic, title match is sufficient
    if (
      !normArtistA ||
      !normArtistB ||
      normArtistA === 'variousartists' ||
      normArtistB === 'variousartists' ||
      normArtistA === 'webaudio' ||
      normArtistB === 'webaudio'
    ) {
      return true;
    }

    // Artist exact match or inclusion (e.g. "The Weeknd" vs "The Weeknd & Daft Punk")
    if (
      normArtistA === normArtistB ||
      normArtistA.includes(normArtistB) ||
      normArtistB.includes(normArtistA)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Searches the library for an existing track that matches incoming track metadata.
 */
export function findDuplicateTrackInLibrary(trackInfo, libraryTracks = []) {
  if (!trackInfo || !Array.isArray(libraryTracks) || libraryTracks.length === 0) {
    return null;
  }
  return libraryTracks.find((existing) => areTracksDuplicate(trackInfo, existing)) || null;
}

/**
 * Checks whether a track (by object or ID) already exists in a given playlist.
 */
export function isTrackInPlaylist(trackOrId, playlist, allTracks = []) {
  if (!playlist || !Array.isArray(playlist.trackIds) || playlist.trackIds.length === 0) {
    return false;
  }

  const targetId = typeof trackOrId === 'string' ? trackOrId : trackOrId?.id;
  const targetTrack =
    typeof trackOrId === 'object' && trackOrId !== null
      ? trackOrId
      : allTracks.find((t) => t.id === targetId);

  // Exact ID check
  if (targetId && playlist.trackIds.includes(targetId)) {
    return true;
  }

  // Semantic check against tracks currently present in the playlist
  if (targetTrack) {
    const playlistTrackList = playlist.trackIds
      .map((id) => allTracks.find((t) => t.id === id))
      .filter(Boolean);

    return playlistTrackList.some((existing) => areTracksDuplicate(targetTrack, existing));
  }

  return false;
}

/**
 * Scans a playlist and returns detailed duplicate statistics and unique track IDs.
 */
export function detectPlaylistDuplicates(playlist, allTracks = []) {
  if (!playlist || !Array.isArray(playlist.trackIds)) {
    return {
      hasDuplicates: false,
      duplicateTrackIds: [],
      uniqueTrackIds: [],
      duplicateCount: 0,
      duplicateDetails: [],
    };
  }

  const seenIds = new Set();
  const seenSignatures = new Set();
  const uniqueTrackIds = [];
  const duplicateTrackIds = [];
  const duplicateDetails = [];

  for (const trackId of playlist.trackIds) {
    if (seenIds.has(trackId)) {
      duplicateTrackIds.push(trackId);
      const trackObj = allTracks.find((t) => t.id === trackId);
      duplicateDetails.push({
        trackId,
        title: trackObj?.title || trackId,
        artist: trackObj?.artist || '',
        reason: 'Duplicate track ID in playlist',
      });
      continue;
    }

    const trackObj = allTracks.find((t) => t.id === trackId);
    if (trackObj) {
      const normTitle = normalizeTrackMeta(trackObj.title);
      const normArtist = normalizeTrackMeta(trackObj.artist);
      const sig = `${normTitle}__${normArtist}`;

      if (normTitle && seenSignatures.has(sig)) {
        duplicateTrackIds.push(trackId);
        duplicateDetails.push({
          trackId,
          title: trackObj.title,
          artist: trackObj.artist,
          reason: 'Identical track title and artist',
        });
        continue;
      }
      if (normTitle) seenSignatures.add(sig);
    }

    seenIds.add(trackId);
    uniqueTrackIds.push(trackId);
  }

  return {
    hasDuplicates: duplicateTrackIds.length > 0,
    duplicateTrackIds,
    uniqueTrackIds,
    duplicateCount: duplicateTrackIds.length,
    duplicateDetails,
  };
}

/**
 * Returns a deduplicated playlist object preserving the order of the first occurrence of each track.
 */
export function deduplicatePlaylist(playlist, allTracks = []) {
  if (!playlist) return playlist;
  const { uniqueTrackIds } = detectPlaylistDuplicates(playlist, allTracks);
  return {
    ...playlist,
    trackIds: uniqueTrackIds,
  };
}

/**
 * Filters incoming tracks to prevent adding duplicates to a playlist.
 */
export function filterNewTracksForPlaylist(incomingTracks = [], playlist, allTracks = []) {
  const existingSet = new Set(playlist?.trackIds || []);
  const playlistTracks = (playlist?.trackIds || [])
    .map((id) => allTracks.find((t) => t.id === id))
    .filter(Boolean);

  const tracksToAdd = [];
  const skippedDuplicates = [];
  const newTrackIds = [];

  for (const item of incomingTracks) {
    const trackObj = typeof item === 'object' && item !== null ? item : allTracks.find((t) => t.id === item);
    const trackId = trackObj?.id || item;

    // Direct ID duplicate
    if (existingSet.has(trackId)) {
      skippedDuplicates.push(trackObj || { id: trackId });
      continue;
    }

    // Semantic duplicate in playlist or in previously accepted tracks for this batch
    const isDup =
      (trackObj && playlistTracks.some((p) => areTracksDuplicate(trackObj, p))) ||
      (trackObj && tracksToAdd.some((a) => areTracksDuplicate(trackObj, a)));

    if (isDup) {
      skippedDuplicates.push(trackObj || { id: trackId });
    } else {
      tracksToAdd.push(trackObj || { id: trackId });
      if (trackId) {
        newTrackIds.push(trackId);
        existingSet.add(trackId);
      }
    }
  }

  return {
    tracksToAdd,
    skippedDuplicates,
    newTrackIds,
  };
}
