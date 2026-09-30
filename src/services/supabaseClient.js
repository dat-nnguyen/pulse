import { createClient } from '@supabase/supabase-js';

// Cache client instance — keyed so that credential changes force a new client
let supabaseInstance = null;
let cachedUrl = null;
let cachedKey = null;

export function getSupabaseCredentials() {
  const envUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

  const envKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_KEY ||
    import.meta.env.SUPABASE_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const localUrl =
    localStorage.getItem('pulse_supabase_url') ||
    localStorage.getItem('aura_supabase_url');
  const localKey =
    localStorage.getItem('pulse_supabase_key') ||
    localStorage.getItem('aura_supabase_key');

  const url = (localUrl && localUrl.trim()) || (envUrl && envUrl.trim()) || '';
  const key = (localKey && localKey.trim()) || (envKey && envKey.trim()) || '';

  return { url, key };
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseCredentials();
  // Must have both a valid HTTPS URL and a non-empty key
  return Boolean(url && key && url.startsWith('https://'));
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;

  const { url, key } = getSupabaseCredentials();

  // Re-create client if credentials changed (e.g. user entered new keys)
  if (supabaseInstance && url === cachedUrl && key === cachedKey) {
    return supabaseInstance;
  }

  supabaseInstance = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  cachedUrl = url;
  cachedKey = key;

  return supabaseInstance;
}

export function setSupabaseConfig(url, key) {
  if (url && key) {
    localStorage.setItem('aura_supabase_url', url.trim());
    localStorage.setItem('aura_supabase_key', key.trim());
  } else {
    localStorage.removeItem('aura_supabase_url');
    localStorage.removeItem('aura_supabase_key');
    localStorage.removeItem('pulse_supabase_url');
    localStorage.removeItem('pulse_supabase_key');
  }
  // Force re-creation of the client on next call
  supabaseInstance = null;
  cachedUrl = null;
  cachedKey = null;
}

export async function testSupabaseConnection(url, key) {
  try {
    const client = createClient(url.trim(), key.trim(), {
      auth: { persistSession: false },
    });
    // Try a lightweight auth check rather than querying a table
    const { error } = await client.auth.getSession();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
