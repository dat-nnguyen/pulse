// Service to persist and restore YouTube search results and download states
// Retains search results, active tab, query, and batch queue across navigations, tab switches, and page reloads for up to 2 hours.

const SEARCH_SESSION_KEY = 'pulse_search_session_v2';
const MAX_SESSION_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours retention

function getStorage() {
  try {
    if (typeof localStorage !== 'undefined') {
      const testKey = '__pulse_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return localStorage;
    }
  } catch (e) {
    // localStorage unavailable, try sessionStorage
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage;
    }
  } catch (e) {
    // storage disabled
  }
  return null;
}

/**
 * Saves current search state to storage
 * @param {Object} state - { query, results, hasSearched, activeTab, downloadedIds, batchUrlsText }
 */
export function saveSearchSession(state) {
  try {
    const storage = getStorage();
    if (!storage) return;

    const payload = {
      query: state.query || '',
      results: Array.isArray(state.results) ? state.results : [],
      hasSearched: Boolean(state.hasSearched),
      activeTab: state.activeTab || 'search',
      downloadedIds: Array.isArray(state.downloadedIds) ? state.downloadedIds : [],
      batchUrlsText: state.batchUrlsText || '',
      timestamp: Date.now(),
    };

    storage.setItem(SEARCH_SESSION_KEY, JSON.stringify(payload));
  } catch (e) {
    // Catch quota exceeded or serialization errors gracefully
  }
}

/**
 * Retrieves persisted search state if fresh (within 2 hours)
 * @returns {Object|null}
 */
export function getSearchSession() {
  try {
    const storage = getStorage();
    if (!storage) return null;

    const raw = storage.getItem(SEARCH_SESSION_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data || typeof data.timestamp !== 'number') return null;

    // Check expiration (2 hours)
    if (Date.now() - data.timestamp > MAX_SESSION_AGE_MS) {
      storage.removeItem(SEARCH_SESSION_KEY);
      return null;
    }

    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Clears saved search session
 */
export function clearSearchSession() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SEARCH_SESSION_KEY);
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SEARCH_SESSION_KEY);
    }
  } catch (e) {}
}

