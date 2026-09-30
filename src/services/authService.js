import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const LOCAL_USER_KEY = 'pulse_auth_user';

export async function getCurrentUser() {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data: { user }, error } = await client.auth.getUser();
      if (user && !error) {
        return {
          id: user.id,
          email: user.email,
          provider: 'supabase',
        };
      }
    } catch (e) {
      console.warn('Failed to get Supabase user:', e);
    }
  }

  // Fallback to local stored session
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Ignore JSON error
  }

  return null;
}

export async function signUp(email, password) {
  if (!email || !password) throw new Error('Email and password are required');
  const client = getSupabaseClient();

  if (client) {
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    if (data.session && data.user) {
      const userObj = { id: data.user.id, email: data.user.email, provider: 'supabase' };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userObj));
      return { user: userObj, needsConfirmation: false };
    }
    if (data.user) {
      return {
        user: { id: data.user.id, email: data.user.email, provider: 'supabase' },
        needsConfirmation: true,
      };
    }
  }

  // Local-first fallback if Supabase not yet configured
  const localUser = {
    id: 'usr_' + Math.random().toString(36).substring(2, 9),
    email: email.trim(),
    provider: 'local',
  };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
  return { user: localUser, needsConfirmation: false };
}

export async function signIn(email, password) {
  if (!email || !password) throw new Error('Email and password are required');
  const client = getSupabaseClient();

  if (client) {
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    if (data.user) {
      const userObj = { id: data.user.id, email: data.user.email, provider: 'supabase' };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userObj));
      return userObj;
    }
  }

  // Local-first fallback
  const localUser = {
    id: 'usr_' + Math.random().toString(36).substring(2, 9),
    email: email.trim(),
    provider: 'local',
  };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
  return localUser;
}

export async function resendConfirmation(email) {
  if (!email) throw new Error('Please enter your email');
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured');
  const { error } = await client.auth.resend({
    type: 'signup',
    email: email.trim(),
  });
  if (error) throw error;
  return true;
}

export function setPassphraseUser(passphrase) {
  if (!passphrase || !passphrase.trim()) throw new Error('Passphrase cannot be empty');
  const clean = passphrase.trim();
  const userObj = {
    id: 'sync_' + clean.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    email: clean + ' (Passphrase Sync)',
    provider: 'passphrase',
  };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userObj));
  return userObj;
}

export async function signOut() {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
  }
  localStorage.removeItem(LOCAL_USER_KEY);
  return true;
}

export function subscribeAuthChange(callback) {
  const client = getSupabaseClient();
  if (client) {
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email,
          provider: 'supabase',
        });
      } else {
        // Fallback to local stored session if signed in via passphrase
        try {
          const raw = localStorage.getItem(LOCAL_USER_KEY);
          if (raw) {
            callback(JSON.parse(raw));
            return;
          }
        } catch (e) {}
        callback(null);
      }
    });
    return () => subscription.unsubscribe();
  }

  return () => {};
}
