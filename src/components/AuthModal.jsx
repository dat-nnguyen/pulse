import React, { useState } from 'react';
import {
  X,
  User,
  LogIn,
  UserPlus,
  LogOut,
  CheckCircle,
  AlertCircle,
  Loader2,
  Mail,
  KeyRound,
  Sparkles,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import {
  signIn,
  signUp,
  signOut,
  resendConfirmation,
  setPassphraseUser,
} from '../services/authService';
import { isSupabaseConfigured } from '../services/supabaseClient';

export default function AuthModal({ isOpen, onClose, user, onAuthSuccess }) {
  const [authMethod, setAuthMethod] = useState('email'); // 'email' | 'passphrase'
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showResendBtn, setShowResendBtn] = useState(false);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setShowResendBtn(false);

    try {
      if (mode === 'signup') {
        const result = await signUp(email, password);
        if (result.needsConfirmation) {
          setSuccessMsg(
            'Account created! A confirmation email was sent to your inbox. Please click the link in your email to confirm, then sign in.'
          );
          setShowResendBtn(true);
          setMode('login');
          return;
        }
        setSuccessMsg('Account created successfully! Syncing your library...');
        setTimeout(() => {
          if (onAuthSuccess) onAuthSuccess(result.user);
          onClose();
          window.location.reload();
        }, 1200);
      } else {
        const loggedUser = await signIn(email, password);
        setSuccessMsg('Signed in successfully! Library synced.');
        setTimeout(() => {
          if (onAuthSuccess) onAuthSuccess(loggedUser);
          onClose();
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('email not confirmed')) {
        setErrorMsg('Email not confirmed yet. Please verify your email link or click Resend below.');
        setShowResendBtn(true);
      } else {
        setErrorMsg(msg || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePassphraseSubmit = (e) => {
    e.preventDefault();
    if (!passphrase.trim()) {
      setErrorMsg('Please enter a sync passphrase');
      return;
    }

    setLoading(true);
    try {
      const syncUser = setPassphraseUser(passphrase.trim());
      setSuccessMsg(`Device linked with passcode "${passphrase.trim()}". Syncing library...`);
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(syncUser);
        onClose();
        window.location.reload();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to set sync passphrase');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your email above to resend verification.');
      return;
    }
    setResending(true);
    try {
      await resendConfirmation(email.trim());
      setSuccessMsg('Verification email resent! Please check your inbox and spam folder.');
    } catch (err) {
      setErrorMsg(err.message || 'Could not resend email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
      setSuccessMsg('Signed out successfully.');
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(null);
        onClose();
        window.location.reload();
      }, 800);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aura-modal-overlay" onClick={onClose}>
      <div
        className="aura-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460, width: '100%', padding: '24px 22px' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(0, 194, 209, 0.12)',
                border: '1px solid rgba(0, 194, 209, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={18} color="var(--pulse-accent)" />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: 18, margin: 0 }}>
                {user ? 'Account & Device Sync' : 'Sync Between Phone & Mac'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                Keep playlists, favorites & downloads synced everywhere
              </p>
            </div>
          </div>
          <button className="aura-circle-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* If user is already logged in */}
        {user ? (
          <div>
            <div
              style={{
                background: 'var(--pulse-bg-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: '16px 18px',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'var(--pulse-accent)',
                    color: '#080a10',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 800,
                  }}
                >
                  {(user.email || 'U')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#f8fafc',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user.email}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: '#10b981',
                      }}
                    />
                    <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                      Cloud Sync Active
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                Your playlists, favorites, and library are synchronized across your phone and computer.
              </div>
            </div>

            {successMsg && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  color: '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <CheckCircle size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              className="aura-btn-secondary"
              onClick={handleLogout}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                borderColor: 'rgba(244, 63, 94, 0.3)',
                color: '#f87171',
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              <span>Sign Out from this Device</span>
            </button>
          </div>
        ) : (
          /* Sign In / Sign Up Form */
          <div>
            {/* Auth Method Switcher: Email vs Instant Passcode */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 10,
                padding: 3,
                marginBottom: 16,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('email');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: authMethod === 'email' ? 'var(--pulse-bg-raised)' : 'transparent',
                  color: authMethod === 'email' ? 'var(--pulse-accent)' : 'var(--text-muted)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Mail size={14} />
                <span>Supabase Email</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMethod('passphrase');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: authMethod === 'passphrase' ? 'var(--pulse-bg-raised)' : 'transparent',
                  color: authMethod === 'passphrase' ? 'var(--pulse-accent)' : 'var(--text-muted)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <KeyRound size={14} />
                <span>Instant Passcode</span>
              </button>
            </div>

            {errorMsg && (
              <div
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <span>{errorMsg}</span>
                  {showResendBtn && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resending}
                        className="aura-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 11, gap: 6 }}
                      >
                        {resending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        <span>Resend Confirmation Email</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  color: '#34d399',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <span>{successMsg}</span>
                  {showResendBtn && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resending}
                        className="aura-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 11, gap: 6 }}
                      >
                        {resending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        <span>Resend Confirmation Email</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* METHOD 1: EMAIL / PASSWORD */}
            {authMethod === 'email' && (
              <div>
                {/* Sign In vs Sign Up Tab */}
                <div
                  style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-subtle)',
                    marginBottom: 16,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg('');
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: mode === 'login' ? '2px solid var(--pulse-accent)' : '2px solid transparent',
                      color: mode === 'login' ? '#f8fafc' : 'var(--text-muted)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMsg('');
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: mode === 'signup' ? '2px solid var(--pulse-accent)' : '2px solid transparent',
                      color: mode === 'signup' ? '#f8fafc' : 'var(--text-muted)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Create Account
                  </button>
                </div>

                <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pulse-input"
                      style={{ padding: '10px 14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pulse-input"
                      style={{ padding: '10px 14px' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="aura-btn-primary"
                    style={{
                      width: '100%',
                      marginTop: 4,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontSize: 14,
                    }}
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : mode === 'login' ? (
                      <LogIn size={16} />
                    ) : (
                      <UserPlus size={16} />
                    )}
                    <span>{mode === 'login' ? 'Sign In & Sync' : 'Create Account'}</span>
                  </button>
                </form>

                {/* Helpful Supabase Email Confirmation Tip */}
                <div
                  style={{
                    marginTop: 16,
                    padding: 10,
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed var(--border-subtle)',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: 'var(--text-secondary)' }}>💡 Note on Supabase email confirmation:</strong>
                  <br />
                  If your project requires email verification, check your inbox/spam for the confirmation link. Or in Supabase Dashboard (<strong>Auth ➔ Providers ➔ Email</strong>), turn <strong>OFF</strong> &quot;Confirm email&quot; for instant sign in.
                </div>
              </div>
            )}

            {/* METHOD 2: INSTANT PASSPHRASE SYNC (ZERO EMAIL CONFIRMATION NEEDED) */}
            {authMethod === 'passphrase' && (
              <div>
                <form onSubmit={handlePassphraseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                      Custom Sync Passcode / Nickname
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. datnguyen_music"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      className="pulse-input"
                      style={{ padding: '10px 14px' }}
                    />
                    <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Enter this same passcode on your laptop and your phone. All playlists, favorites, and imported songs will sync automatically without needing to confirm any email!
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="aura-btn-primary"
                    style={{
                      width: '100%',
                      marginTop: 6,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontSize: 14,
                    }}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    <span>Connect & Sync with Passcode</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
