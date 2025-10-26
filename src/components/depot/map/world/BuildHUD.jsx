// world/BuildHUD.jsx
import React from 'react';
import { PROP_TYPES } from './propRegistry';

export default function BuildHUD({ active, mode, onToggle, onMode, onRotate, onType, onExportJSON, onExportCSV, onClear }) {
  if (!active) {
    return (
      <button
        onClick={onToggle}
        style={{ position:'absolute', left:12, top:80, zIndex:6, width:44, height:44, borderRadius:8, border:'none', background:'#334155', color:'#fff' }}
        title="Build mode"
      >🧱</button>
    );
  }
  return (
    <div style={{ position:'absolute', left:12, top:80, zIndex:6, padding:8, background:'rgba(15,23,42,.9)', color:'#fff', borderRadius:8, width:220 }}>
      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <button onClick={()=>onMode('place')} style={{ flex:1, background: mode==='place'?'#10b981':'#334155', color:'#fff', border:'none', borderRadius:6, padding:'6px 8px' }}>Place</button>
        <button onClick={()=>onMode('remove')} style={{ flex:1, background: mode==='remove'?'#ef4444':'#334155', color:'#fff', border:'none', borderRadius:6, padding:'6px 8px' }}>Remove</button>
        <button onClick={()=>onRotate(1)} title="Rotate 90°" style={{ width:44, background:'#475569', border:'none', borderRadius:6, color:'#fff' }}>⟳</button>
      </div>
      <select onChange={e=>onType(e.target.value)} style={{ width:'100%', padding:6, borderRadius:6, background:'#0f172a', color:'#fff', border:'1px solid #334155' }}>
        {PROP_TYPES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
      <div style={{ display:'flex', gap:8, marginTop:10 }}>
        <button onClick={onExportJSON} style={{ flex:1, background:'#1d4ed8', border:'none', borderRadius:6, color:'#fff', padding:'6px 8px' }}>Export JSON</button>
        <button onClick={onExportCSV}  style={{ flex:1, background:'#0ea5e9', border:'none', borderRadius:6, color:'#0c111b', padding:'6px 8px' }}>CSV</button>
      </div>
      <div style={{ display:'flex', gap:8, marginTop:8 }}>
        <button onClick={onClear} style={{ flex:1, background:'#64748b', border:'none', borderRadius:6, color:'#0c111b', padding:'6px 8px' }}>Reset local</button>
        <button onClick={onToggle} style={{ flex:1, background:'#334155', border:'1px solid #475569', borderRadius:6, color:'#fff', padding:'6px 8px' }}>Close</button>
      </div>
    </div>
  );
}