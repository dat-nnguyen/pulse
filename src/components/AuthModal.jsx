import React, { useState } from 'react';
import { X, User, LogIn, UserPlus, LogOut, CheckCircle, AlertCircle, Loader2, Cloud } from 'lucide-react';
import { signIn, signUp, signOut } from '../services/authService';
import { isSupabaseConfigured } from '../services/supabaseClient';

export default function AuthModal({ isOpen, onClose, user, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let loggedUser;
      if (mode === 'signup') {
        loggedUser = await signUp(email, password);
        setSuccessMsg('Account created successfully! Syncing your music...');
      } else {
        loggedUser = await signIn(email, password);
        setSuccessMsg('Signed in successfully! Library synced.');
      }

      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(loggedUser);
        onClose();
        window.location.reload();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
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

  const isConnected = isSupabaseConfigured();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-surface" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(0, 210, 223, 0.1)',
                border: '1px solid rgba(0, 210, 223, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={18} color="#00d2df" />
            </div>
            <div>
              <h2 className="modal-title">{user ? 'Account & Device Sync' : 'Account Login'}</h2>
              <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                {user ? 'Connected across devices' : 'Sync between your Mac & mobile phone'}
              </div>
            </div>
          </div>
          <button className="aura-circle-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* If user is already logged in */}
        {user ? (
          <div>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
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
                    background: '#00d2df',
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
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>{user.email}</div>
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
                      Cross-Device Sync Active
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
                  color: '#94a3b8',
                  lineHeight: 1.5,
                }}
              >
                Your playlists, favorites, and imported audio files are synchronized between this device and your phone.
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
            {/* Mode Switcher */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 10,
                padding: 3,
                marginBottom: 18,
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
                  borderRadius: 8,
                  border: 'none',
                  background: mode === 'login' ? 'var(--aura-surface-active)' : 'transparent',
                  color: mode === 'login' ? '#f8fafc' : '#94a3b8',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
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
                  borderRadius: 8,
                  border: 'none',
                  background: mode === 'signup' ? 'var(--aura-surface-active)' : 'transparent',
                  color: mode === 'signup' ? '#f8fafc' : '#94a3b8',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Create Account
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
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
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
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <CheckCircle size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--aura-bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: '#f8fafc',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--aura-bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: '#f8fafc',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
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
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : mode === 'login' ? (
                  <LogIn size={16} />
                ) : (
                  <UserPlus size={16} />
                )}
                <span>{mode === 'login' ? 'Sign In & Sync Library' : 'Create Account'}</span>
              </button>
            </form>

            <div
              style={{
                marginTop: 18,
                fontSize: 11.5,
                color: '#64748b',
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              Sign in with the same account on your Mac and iPhone to keep your playlists, favorites, and downloads in sync.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
