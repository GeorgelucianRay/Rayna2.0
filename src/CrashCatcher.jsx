import React from 'react';

export default class CrashCatcher extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(error) { return { err: error }; }
  componentDidCatch(error, info) { console.error('[CrashCatcher]', error, info); }

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ padding: 16, fontFamily: 'Inter, system-ui', color: '#fff', background:'#1a1a1a', minHeight:'100vh' }}>
        <h2 style={{ margin: '8px 0' }}>A apărut o eroare</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.err?.message || this.state.err)}</pre>
        <button onClick={() => location.reload()} style={{ marginTop: 12 }}>
          Reîncarcă aplicația
        </button>
      </div>
    );
  }
}