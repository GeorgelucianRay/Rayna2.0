// src/components/depot/map/ui/BuildHUD.jsx
import React from 'react';
import { PROP_TYPES } from '../world/propRegistry';

export default function BuildHUD({
  mode, setMode,
  onRotateLeft, onRotateRight,
  onPickType, onFinalize,
  onClose,
}) {
  return (
    <div style={{
      position:'absolute', left:12, top:12, zIndex:7,
      background:'rgba(17,24,39,.9)', color:'#fff',
      borderRadius:12, padding:10, display:'grid', gap:8,
      boxShadow:'0 6px 20px rgba(0,0,0,.35)'
    }}>
      <div style={{display:'flex', gap:6}}>
        <button onClick={onClose}>✕</button>
        <strong>Build</strong>
      </div>

      <div style={{display:'flex', gap:6}}>
        <button onClick={()=>setMode('place')} style={{opacity: mode==='place'?1:0.6}}>Place</button>
        <button onClick={()=>setMode('remove')} style={{opacity: mode==='remove'?1:0.6}}>Remove</button>
      </div>

      <div style={{display:'flex', gap:6}}>
        <button onClick={onRotateLeft}>⟲</button>
        <button onClick={onRotateRight}>⟳</button>
      </div>

      <div style={{display:'grid', gap:6, maxHeight:200, overflow:'auto'}}>
        {PROP_TYPES.map(p => (
          <button key={p.key} onClick={()=>onPickType(p.key)}>{p.label}</button>
        ))}
      </div>

      <button onClick={onFinalize} style={{background:'#10b981', color:'#06281e', border:'none', borderRadius:8, padding:8, fontWeight:700}}>
        Finalizează / Exportă
      </button>
    </div>
  );
}