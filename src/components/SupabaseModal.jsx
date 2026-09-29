import React, { useState } from 'react';
import {
  X,
  Database,
  Cloud,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Save,
  Trash2,
  RefreshCw
} from 'lucide-react';
import {
  getSupabaseCredentials,
  setSupabaseConfig,
  testSupabaseConnection,
  isSupabaseConfigured
} from '../services/supabaseClient';

export default function SupabaseModal({ isOpen, onClose }) {
  const credentials = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(credentials.url || '');
  const [supabaseKey, setSupabaseKey] = useState(credentials.key || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTestAndSave = async (e) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseKey.trim()) return;

    setIsTesting(true);
    setTestResult(null);

    const result = await testSupabaseConnection(supabaseUrl.trim(), supabaseKey.trim());
    setIsTesting(false);
    setTestResult(result);

    if (result.success) {
      setSupabaseConfig(supabaseUrl.trim(), supabaseKey.trim());
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Disconnect Supabase and switch to Local Offline Mode?')) {
      setSupabaseConfig('', '');
      setSupabaseUrl('');
      setSupabaseKey('');
      setTestResult(null);
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  const isConnected = isSupabaseConfigured();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-surface" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={22} color="var(--pulse-accent)" />
            <h2 className="modal-title">Supabase Cloud Sync</h2>
          </div>
          <button className="aura-circle-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Status Badge */}
        <div
          style={{
            background: isConnected ? 'rgba(0, 210, 223, 0.1)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${isConnected ? 'rgba(0, 210, 223, 0.3)' : 'var(--border-subtle)'}`,
            padding: '12px 16px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cloud size={20} color={isConnected ? 'var(--pulse-accent)' : 'var(--text-secondary)'} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#f8fafc' }}>
                {isConnected ? 'Connected to Supabase Cloud' : 'Local Offline Mode (IndexedDB)'}
              </div>
              <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                {isConnected
                  ? 'Tracks, playlists & audio files sync across iPhone & Mac'
                  : 'Operating locally on device with zero cloud latency'}
              </div>
            </div>
          </div>

          {isConnected && (
            <button
              onClick={handleDisconnect}
              className="aura-circle-btn"
              style={{ width: 'auto', padding: '4px 10px', fontSize: 11, color: '#f43f5e', border: 'none' }}
              title="Disconnect cloud"
            >
              <Trash2 size={13} />
              <span>Disconnect</span>
            </button>
          )}
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleTestAndSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
              Supabase Project URL
            </label>
            <input
              type="url"
              required
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="aura-search-input"
              style={{ width: '100%', borderRadius: 8, padding: '10px 14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
              Supabase Anon Public API Key
            </label>
            <input
              type="password"
              required
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              className="aura-search-input"
              style={{ width: '100%', borderRadius: 8, padding: '10px 14px' }}
            />
          </div>

          {/* Test / Error Result */}
          {testResult && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: testResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                border: `1px solid ${testResult.success ? '#10b981' : '#f43f5e'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
              }}
            >
              {testResult.success ? (
                <>
                  <CheckCircle size={18} color="#10b981" />
                  <span style={{ color: '#10b981' }}>Connection verified! Reloading with cloud sync...</span>
                </>
              ) : (
                <>
                  <AlertCircle size={18} color="#f43f5e" />
                  <span style={{ color: '#f43f5e' }}>{testResult.error || 'Connection failed'}</span>
                </>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: 'var(--pulse-accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span>Get Free Supabase Keys</span>
              <ExternalLink size={12} />
            </a>

            <button
              type="submit"
              disabled={isTesting || !supabaseUrl.trim() || !supabaseKey.trim()}
              className="aura-btn-primary"
              style={{ padding: '9px 20px', fontSize: 13 }}
            >
              {isTesting ? (
                <>
                  <Loader2 size={15} className="spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Connect & Sync</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* 1-Minute Supabase Setup Instructions */}
        <div style={{ marginTop: 22, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>
            Quick Setup (Free):
          </div>
          <ol style={{ fontSize: 12, color: '#94a3b8', paddingLeft: 18, lineHeight: 1.6 }}>
            <li>Create a free project at <strong>supabase.com</strong>.</li>
            <li>In Supabase, go to <strong>SQL Editor</strong> and run <strong>supabase/schema.sql</strong> from this repository.</li>
            <li>Go to <strong>Project Settings → API</strong>, copy your <strong>URL</strong> and <strong>anon key</strong>, and paste them above (or set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in Vercel).</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
