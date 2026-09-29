import { createClient } from '@supabase/supabase-js';

// Cache client instance
let supabaseInstance = null;

const DEFAULT_SUPABASE_URL = 'https://wtrlpbumpwtauvxqwrrg.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_46vEMz8QI1UlU8ou_etYXw_YrheuDI2';

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

  const localUrl = localStorage.getItem('pulse_supabase_url') || localStorage.getItem('aura_supabase_url');
  const localKey = localStorage.getItem('pulse_supabase_key') || localStorage.getItem('aura_supabase_key');

  const url = (localUrl && localUrl.trim()) || (envUrl && envUrl.trim()) || DEFAULT_SUPABASE_URL;
  const key = (localKey && localKey.trim()) || (envKey && envKey.trim()) || DEFAULT_SUPABASE_KEY;

  return { url, key };
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key && url.startsWith('https://'));
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;

  const { url, key } = getSupabaseCredentials();
  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key, {
      auth: { persistSession: true },
    });
  }
  return supabaseInstance;
}

export function setSupabaseConfig(url, key) {
  if (url && key) {
    localStorage.setItem('aura_supabase_url', url.trim());
    localStorage.setItem('aura_supabase_key', key.trim());
  } else {
    localStorage.removeItem('aura_supabase_url');
    localStorage.removeItem('aura_supabase_key');
  }
  supabaseInstance = null;
}

export async function testSupabaseConnection(url, key) {
  try {
    const client = createClient(url, key);
    const { error } = await client.from('tracks').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
