import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[MediMind ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: '40px', textAlign: 'center',
          background: 'var(--bg-primary)', color: 'var(--text-primary)',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', marginBottom: '12px', color: 'var(--accent-rose)' }}>
            Something went wrong
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', marginBottom: '24px', lineHeight: '1.7' }}>
            MediMind encountered an unexpected error. Your locally stored data is safe.
          </p>
          <div style={{
            background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
            borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: '28px',
            maxWidth: '600px', textAlign: 'left',
          }}>
            <code style={{ fontSize: '12px', color: 'var(--accent-rose)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {this.state.error?.message || 'Unknown error'}
            </code>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: 'var(--gradient-primary)', color: 'white', border: 'none',
              borderRadius: 'var(--radius-md)', padding: '12px 28px', fontSize: '15px',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
