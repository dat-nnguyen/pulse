import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled Pulse Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = async () => {
    try {
      if (window.indexedDB) {
        window.indexedDB.deleteDatabase('AuraAudioDB');
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
      }
      if (window.caches) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Reset warning:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            width: '100vw',
            backgroundColor: '#0a0d14',
            color: '#f1f5f9',
            fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            padding: '24px',
            boxSizing: 'border-box',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              color: '#f43f5e',
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            !
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '0 0 10px 0',
              color: '#f1f5f9',
            }}
          >
            Something interrupted Pulse
          </h1>

          <p
            style={{
              fontSize: 14,
              color: '#94a3b8',
              maxWidth: 440,
              margin: '0 0 24px 0',
              lineHeight: 1.5,
            }}
          >
            An unexpected error occurred while rendering the player interface.
          </p>

          {this.state.error && (
            <div
              style={{
                background: '#0f1420',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                padding: '12px 16px',
                maxWidth: 480,
                width: '100%',
                fontSize: 12,
                color: '#f43f5e',
                fontFamily: 'monospace',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: 24,
                wordBreak: 'break-all',
              }}
            >
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleReload}
              style={{
                background: '#00c2d1',
                color: '#0a0d14',
                border: 'none',
                padding: '10px 22px',
                borderRadius: 9999,
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
            >
              Reload Pulse
            </button>

            <button
              onClick={this.handleReset}
              style={{
                background: 'transparent',
                color: '#94a3b8',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: '10px 20px',
                borderRadius: 9999,
                fontWeight: 600,
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              Reset Cache & Storage
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
