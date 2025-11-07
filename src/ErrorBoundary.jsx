// src/ErrorBoundary.jsx
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state = { hasError:false, error:null, info:null };
  }
  static getDerivedStateFromError(error){ return { hasError:true, error }; }
  componentDidCatch(error, info){ this.setState({ info }); }

  render(){
    if(!this.state.hasError) return this.props.children;

    return (
      <div style={{
        position:'fixed', inset:0, zIndex: 99999,
        background:'rgba(0,0,0,.85)', color:'#fff',
        display:'grid', placeItems:'center', padding:'16px'
      }}>
        <div style={{maxWidth:800, width:'100%'}}>
          <h2 style={{margin:'0 0 12px'}}>A crăpat o componentă (ErrorBoundary)</h2>
          <pre style={{
            whiteSpace:'pre-wrap', background:'rgba(255,255,255,.06)',
            border:'1px solid rgba(255,255,255,.2)', padding:'12px', borderRadius:'12px'
          }}>
{String(this.state.error || 'Unknown')}
          </pre>
          {this.state.info?.componentStack && (
            <details open style={{marginTop:12}}>
              <summary>Component stack</summary>
              <pre style={{
                whiteSpace:'pre-wrap', background:'rgba(255,255,255,.06)',
                border:'1px solid rgba(255,255,255,.2)', padding:'12px', borderRadius:'12px'
              }}>{this.state.info.componentStack}</pre>
            </details>
          )}
          <button onClick={()=>location.reload()}
                  style={{marginTop:16, padding:'10px 16px', borderRadius:12, border:'1px solid #fff'}}>
            Reload app
          </button>
        </div>
      </div>
    );
  }
}