/**
 * ErrorBoundary — Global crash guard.
 *
 * Catches any uncaught render error in the React tree and shows a friendly
 * fallback screen instead of a blank white page. Also surfaces details for
 * debugging and gives the user a one-click recovery path (reload / clear cache).
 *
 * This protects the app from the "White Screen of Death" pattern caused by
 * stale bundles referencing undefined components (e.g., the ClubSchedule bug).
 */
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error so it appears in browser console + surfaces in monitoring
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo);
    this.setState({ errorInfo });

    // Optional: POST to a server endpoint for error tracking
    try {
      const payload = {
        message: error?.message || String(error),
        stack: error?.stack || '',
        componentStack: errorInfo?.componentStack || '',
        url: window.location.href,
        userAgent: navigator.userAgent,
        ts: new Date().toISOString(),
      };
      // Fire-and-forget — do not block if backend is unreachable
      if (window.navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        window.navigator.sendBeacon('/api/_client-errors', blob);
      }
    } catch (_e) {
      // swallow — telemetry must never break the boundary
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHardReload = () => {
    // Clear caches + service workers and then reload
    try {
      if ('caches' in window) {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
      }
    } catch (_e) {
      // swallow
    }
    setTimeout(() => window.location.reload(true), 150);
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, errorInfo, showDetails } = this.state;
    const message = error?.message || String(error) || 'Unknown error';

    return (
      <div
        data-testid="error-boundary"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'linear-gradient(180deg, #0f0f14 0%, #1a1a24 100%)',
          color: '#fff',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '560px',
            width: '100%',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '40px 32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            aria-hidden
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              fontSize: '28px',
            }}
          >
            <span style={{ color: '#fff', fontWeight: 700 }}>!</span>
          </div>

          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              margin: '0 0 12px 0',
              letterSpacing: '-0.01em',
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              fontSize: '15px',
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.7)',
              margin: '0 0 28px 0',
            }}
          >
            The app hit an unexpected error while rendering. This usually resolves with a reload. If
            it keeps happening, try a hard reload to clear cached files.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <button
              type="button"
              data-testid="error-boundary-reload-btn"
              onClick={this.handleReload}
              style={{
                padding: '12px 20px',
                borderRadius: '10px',
                border: 'none',
                background: '#dc2626',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
            >
              Reload app
            </button>
            <button
              type="button"
              data-testid="error-boundary-hard-reload-btn"
              onClick={this.handleHardReload}
              style={{
                padding: '12px 20px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Hard reload (clear cache)
            </button>
            <button
              type="button"
              data-testid="error-boundary-home-btn"
              onClick={this.handleGoHome}
              style={{
                padding: '12px 20px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Go to home
            </button>
          </div>

          <button
            type="button"
            data-testid="error-boundary-details-toggle"
            onClick={() => this.setState({ showDetails: !showDetails })}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            {showDetails ? 'Hide technical details' : 'Show technical details'}
          </button>

          {showDetails && (
            <pre
              data-testid="error-boundary-details"
              style={{
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                fontSize: '12px',
                lineHeight: 1.5,
                color: 'rgba(255,255,255,0.75)',
                overflow: 'auto',
                maxHeight: '240px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {message}
              {errorInfo?.componentStack ? '\n\nComponent stack:' + errorInfo.componentStack : ''}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
