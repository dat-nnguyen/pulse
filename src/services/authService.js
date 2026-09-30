import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const LOCAL_USER_KEY = 'pulse_auth_user';

export async function getCurrentUser() {
  const client = getSupabaseClient();
  if (client) {
    try {
      // First try to restore from existing session (handles page refresh)
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        const userObj = {
          id: session.user.id,
          email: session.user.email,
          provider: 'supabase',
        };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userObj));
        return userObj;
      }
    } catch (e) {
      console.warn('Failed to get Supabase session:', e);
    }
  }

  // Fallback to locally stored session (passphrase users or offline mode)
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Don't restore a Supabase session from local storage — it may be stale
      // Only restore passphrase/local providers
      if (parsed.provider !== 'supabase') return parsed;

      // For supabase provider: only return if we have a live session
      // (already tried above — session was null, so clear stale entry)
      localStorage.removeItem(LOCAL_USER_KEY);
    }
  } catch (e) {
    // Ignore JSON error
  }

  return null;
}

export async function signUp(email, password) {
  if (!email || !password) throw new Error('Email and password are required');

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Please enter your Supabase URL and API key in Settings → Cloud Sync first.'
    );
  }

  const client = getSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) throw error;

  // Supabase returns a user with an unconfirmed identity if email confirmation is required
  if (data.user && !data.session) {
    return {
      user: { id: data.user.id, email: data.user.email, provider: 'supabase' },
      needsConfirmation: true,
    };
  }

  if (data.session && data.user) {
    const userObj = { id: data.user.id, email: data.user.email, provider: 'supabase' };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userObj));
    return { user: userObj, needsConfirmation: false };
  }

  throw new Error('Sign up failed. Please try again.');
}

export async function signIn(email, password) {
  if (!email || !password) throw new Error('Email and password are required');

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Please enter your Supabase URL and API key in Settings → Cloud Sync first.'
    );
  }

  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    // Make common errors user-friendly
    const msg = error.message || '';
    if (msg.toLowerCase().includes('invalid login credentials')) {
      throw new Error('Incorrect email or password. Please try again.');
    }
    if (msg.toLowerCase().includes('email not confirmed')) {
      throw new Error('email not confirmed');
    }
    throw error;
  }

  if (!data.user || !data.session) {
    throw new Error('Sign in failed. Please check your credentials and try again.');
  }

  const userObj = { id: data.user.id, email: data.user.email, provider: 'supabase' };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userObj));
  return userObj;
}

export async function resendConfirmation(email) {
  if (!email) throw new Error('Please enter your email');
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');

  const client = getSupabaseClient();
  const { error } = await client.auth.resend({
    type: 'signup',
    email: email.trim(),
  });
  if (error) throw error;
  return true;
}

export async function resetPassword(email) {
  if (!email) throw new Error('Please enter your email address');
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please set up Cloud Sync first.');
  }

  const client = getSupabaseClient();
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
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
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          const userObj = {
            id: session.user.id,
            email: session.user.email,
            provider: 'supabase',
          };
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userObj));
          callback(userObj);
        }
      } else if (event === 'SIGNED_OUT') {
        // Only clear supabase sessions — preserve passphrase users
        try {
          const raw = localStorage.getItem(LOCAL_USER_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.provider === 'passphrase') {
              callback(parsed);
              return;
            }
          }
        } catch (e) {}
        localStorage.removeItem(LOCAL_USER_KEY);
        callback(null);
      }
    });
    return () => subscription.unsubscribe();
  }

  // If Supabase not configured, check for local passphrase user
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.provider === 'passphrase') {
        setTimeout(() => callback(parsed), 0);
      }
    }
  } catch (e) {}

  return () => {};
}
