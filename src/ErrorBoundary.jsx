// src/ErrorBoundary.jsx
import React from 'react';
import { useLocation } from 'react-router-dom';

function CopyBtn({ text }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      style={{padding:'6px 10px',borderRadius:8,border:'1px solid #333',background:'#161616',color:'#eee',cursor:'pointer'}}
      title="Copiază în clipboard"
    >
      Copy
    </button>
  );
}

/** Învelitor mic pentru a putea citi ruta chiar și în fallback */
function WithLocation({ children }) {
  const loc = useLocation();
  return children(loc);
}

export default class ErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state = { err: null, componentStack: '' };
  }

  static getDerivedStateFromError(error){
    return { err: error };
  }

  componentDidCatch(error, info){
    // ținem și stack-ul de componentă (important!)
    this.setState({ componentStack: info?.componentStack || '' });

    // împingem și în bus-ul tău de debug, ca să apară în DebugConsole
    try {
      window.__raynaBus?.push?.('error', 'React crash', {
        message: error?.message || String(error),
        stack: error?.stack || null,
        componentStack: info?.componentStack || null,
      });
      // plus în console pt. Vercel logs
      // eslint-disable-next-line no-console
      console.error('[React crash]', error, info);
    } catch {}
  }

  renderOk(){
    return this.props.children;
  }

  renderCrash(loc){
    const { err, componentStack } = this.state;
    const message = err?.message || String(err);
    const full = [
      `PATH: ${loc?.pathname || '/'}`,
      '',
      'MESSAGE:',
      message,
      '',
      'ERROR STACK:',
      err?.stack || '(no stack)',
      '',
      'COMPONENT STACK:',
      componentStack || '(no component stack)',
      '',
      'LAST LOGS:',
      ...(window.__raynaBus?.logs || []).slice(-10).map(l =>
        `[${new Date(l.ts).toISOString()}] ${l.level.toUpperCase()} ${l.title} ${JSON.stringify(l.data)}`
      ),
    ].join('\n');

    return (
      <div style={{minHeight:'100vh',background:'#0b0b0b',color:'#eee',fontFamily:'Inter, system-ui',padding:'18px'}}>
        <h1 style={{margin:'6px 0 10px'}}>A crăpat o componentă <small style={{opacity:.6}}>(ErrorBoundary)</small></h1>

        <div style={{
          background:'#121212',border:'1px solid #2a2a2a',borderRadius:12,padding:12,marginBottom:12
        }}>
          <div style={{opacity:.85,marginBottom:6,wordBreak:'break-word'}}>{message}</div>
          <div style={{display:'flex',gap:8}}>
            <CopyBtn text={full} />
            <button onClick={() => location.reload()} style={{padding:'6px 10px',borderRadius:8,border:'1px solid #333',background:'#161616',color:'#eee',cursor:'pointer'}}>Reload</button>
          </div>
        </div>

        <details open style={{marginBottom:12}}>
          <summary style={{cursor:'pointer'}}>Component stack</summary>
          <pre style={{whiteSpace:'pre-wrap',background:'#0e0e0e',padding:12,borderRadius:10,border:'1px solid #242424',overflow:'auto'}}>
{componentStack || '(no component stack)'}
          </pre>
        </details>

        <details>
          <summary style={{cursor:'pointer'}}>Error stack</summary>
          <pre style={{whiteSpace:'pre-wrap',background:'#0e0e0e',padding:12,borderRadius:10,border:'1px solid #242424',overflow:'auto'}}>
{err?.stack || '(no error stack)'}
          </pre>
        </details>
      </div>
    );
  }

  render(){
    if (!this.state.err) return this.renderOk();
    return <WithLocation>{loc => this.renderCrash(loc)}</WithLocation>;
  }
}