import React from 'react';

/**
 * ErrorBoundary — catches any uncaught render-time JS error and shows a
 * diagnostic panel instead of a blank page. Makes production debugging possible.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0f172a',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          padding: '2rem',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h1 style={{ color: '#ef4444', fontSize: '1.25rem', margin: 0 }}>
            ReportAnalyzer — System Fault
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '600px', textAlign: 'center', margin: 0 }}>
            A critical error prevented the interface from rendering.
            Open browser DevTools (F12 → Console) for the full stack trace.
          </p>
          <pre style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            padding: '1rem',
            fontSize: '0.75rem',
            color: '#fca5a5',
            maxWidth: '700px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {this.state.error?.toString()}
            {this.state.info?.componentStack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'rgba(6,182,212,0.15)',
              border: '1px solid rgba(6,182,212,0.4)',
              color: '#06b6d4',
              padding: '0.5rem 1.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '0.85rem'
            }}
          >
            🔄 Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
