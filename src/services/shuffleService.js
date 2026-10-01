// Service for shuffle algorithms, queue randomization, and sequential order restoration

/**
 * Fisher-Yates uniform shuffle algorithm.
 * Returns a new shuffled copy of the input array.
 */
export function shuffleArray(array) {
  if (!Array.isArray(array)) return [];
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Calculates remaining sequential tracks in a playlist after the current track.
 */
export function getRemainingSequentialTracks(currentTrack, playlistTracks = []) {
  if (!currentTrack || !Array.isArray(playlistTracks) || playlistTracks.length === 0) {
    return [];
  }
  const currIdx = playlistTracks.findIndex((t) => t.id === currentTrack.id);
  if (currIdx === -1) {
    return playlistTracks.filter((t) => t.id !== currentTrack.id);
  }
  return playlistTracks.slice(currIdx + 1);
}

/**
 * Computes next queue state when toggling shuffle ON or OFF.
 *
 * @param {Object} params
 * @param {boolean} params.isEnabling - True when toggling shuffle ON, false when toggling OFF
 * @param {Object|null} params.currentTrack - Currently playing track
 * @param {Array} params.currentQueue - Current queue items
 * @param {Array} params.activeContextTracks - Active playlist or library tracks
 * @param {Array} params.unshuffledQueue - Previously remembered unshuffled queue
 * @returns {{ nextQueue: Array, nextUnshuffledQueue: Array }}
 */
export function computeToggledQueue({
  isEnabling,
  currentTrack,
  currentQueue = [],
  activeContextTracks = [],
  unshuffledQueue = [],
}) {
  const contextTracks = Array.isArray(activeContextTracks) && activeContextTracks.length > 0
    ? activeContextTracks
    : [];

  if (isEnabling) {
    // ENABLING SHUFFLE:
    let savedUnshuffled = [];
    if (currentTrack && contextTracks.length > 0) {
      savedUnshuffled = getRemainingSequentialTracks(currentTrack, contextTracks);
    } else if (currentQueue.length > 0) {
      savedUnshuffled = [...currentQueue];
    }

    let randomized = [];
    if (currentQueue.length > 0) {
      randomized = shuffleArray(currentQueue);
    } else if (currentTrack && contextTracks.length > 0) {
      const others = contextTracks.filter((t) => t.id !== currentTrack.id);
      randomized = shuffleArray(others);
    }

    return {
      nextQueue: randomized,
      nextUnshuffledQueue: savedUnshuffled,
    };
  } else {
    // DISABLING SHUFFLE:
    let sequentialRestored = [];
    if (currentTrack && contextTracks.length > 0) {
      sequentialRestored = getRemainingSequentialTracks(currentTrack, contextTracks);
    } else if (Array.isArray(unshuffledQueue) && unshuffledQueue.length > 0) {
      sequentialRestored = [...unshuffledQueue];
    }

    // Preserve any custom user-added queue items that are not part of the active context
    const contextIdSet = new Set(contextTracks.map((t) => t.id));
    const manualQueueAdditions = currentQueue.filter((t) => !contextIdSet.has(t.id));

    return {
      nextQueue: [...sequentialRestored, ...manualQueueAdditions],
      nextUnshuffledQueue: [],
    };
  }
}
