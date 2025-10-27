// src/components/depot/map/ui/BuildPalette.jsx
import React from 'react';
import { PROP_TYPES } from '../world/propRegistry';
import { exportJSON, exportCSV, getProps } from '../world/worldStore';

export default function BuildPalette({
  mode = 'place',
  setMode,
  onPickType,
  onRotateStep,
  onClose,
  onAfterExport, // opțional
}) {
  return (
    <div style={{
      position:'absolute', left:12, top:12, zIndex:7,
      background:'rgba(17,24,39,.92)', color:'#fff',
      borderRadius:16, padding:12, width:260,
      boxShadow:'0 12px 30px rgba(0,0,0,.35)', backdropFilter:'blur(4px)'
    }}>
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
        <button onClick={onClose}
          style={{width:44,height:44,borderRadius:22,border:'1px solid rgba(255,255,255,.2)',background:'transparent',color:'#fff',fontSize:18}}>
          ✕
        </button>
        <h3 style={{margin:0, fontSize:22, fontWeight:800}}>Build</h3>
      </div>

      {/* Place / Remove */}
      <div style={{display:'flex', gap:8, marginBottom:10}}>
        <button
          onClick={() => setMode?.('place')}
          style={{
            flex:1,height:36,borderRadius:18,border:'none',
            background: mode==='place' ? '#10b981' : '#0b1220',
            color: mode==='place' ? '#063024' : '#d1d5db', fontWeight:700
          }}>
          Place
        </button>
        <button
          onClick={() => setMode?.('remove')}
          style={{
            flex:1,height:36,borderRadius:18,border:'none',
            background: mode==='remove' ? '#ef4444' : '#0b1220',
            color: mode==='remove' ? '#fff' : '#d1d5db', fontWeight:700
          }}>
          Remove
        </button>
      </div>

      {/* Rotate */}
      <div style={{display:'flex', gap:8, marginBottom:10}}>
        <button onClick={() => onRotateStep?.(-1)}
          style={{flex:1,height:36,borderRadius:18,border:'1px solid rgba(255,255,255,.2)',background:'transparent',color:'#fff'}}>↶</button>
        <button onClick={() => onRotateStep?.(1)}
          style={{flex:1,height:36,borderRadius:18,border:'1px solid rgba(255,255,255,.2)',background:'transparent',color:'#fff'}}>↷</button>
      </div>

      {/* Tipuri de obiecte */}
      <div style={{display:'grid', gap:10, marginBottom:12}}>
        {PROP_TYPES.map(t => (
          <button key={t.key}
            onClick={() => onPickType?.(t.key)}
            style={{
              height:36,borderRadius:18,border:'none',
              background:'#e5e7eb', color:'#111827', fontWeight:700
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Finalizare / export */}
      <button
        onClick={() => {
          const json = exportJSON();
          const csv  = exportCSV();

          // descarcă JSON
          const blob = new Blob([json], { type:'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'world-items.json'; a.click();
          URL.revokeObjectURL(url);

          console.log('World items:', getProps());
          onAfterExport?.(json, csv);

          onClose?.();
        }}
        style={{
          width:'100%', height:42, borderRadius:10, border:'none',
          background:'#059669', color:'#06281e', fontWeight:800
        }}>
        Finalizează / Exportă
      </button>
    </div>
  );
}