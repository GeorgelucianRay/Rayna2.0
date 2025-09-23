import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError: false, err: null }; }
  static getDerivedStateFromError(err){ return { hasError: true, err }; }
  componentDidCatch(err, info){ console.error('UI crash:', err, info); }
  render(){
    if (this.state.hasError) {
      return (
        <div style={{padding:16,color:'#fff',background:'#0b1f3a'}}>
          <h3>Eroare afișare</h3>
          <p style={{opacity:.85}}>A apărut o eroare la randare. Verifică consola.</p>
          <pre style={{whiteSpace:'pre-wrap',fontSize:12,opacity:.8}}>
            {String(this.state.err)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}