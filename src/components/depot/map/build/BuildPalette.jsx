import React, { useEffect, useState } from 'react';
import { PROP_TYPES } from '../world/propRegistry';
import { getProps, exportJSON, exportCSV, subscribe } from '../world/worldStore';

export default function BuildPalette({
  open,
  onClose,
  buildController,
  buildActive,
  setBuildActive,
  buildMode,
  setBuildMode,
}) {
  const [currentType, setCurrentType] = useState('road.segment');
  const [items, setItems] = useState(getProps());
  const [continuous, setContinuous] = useState(true);

  // sincronizez store -> listă
  useEffect(() => {
    const off = subscribe(s => setItems(s.props.slice().sort((a,b)=>b.ts-a.ts)));
    return off;
  }, []);

  // conectare controller
  useEffect(() => { buildController?.setType(currentType); }, [buildController, currentType]);
  useEffect(() => { buildController?.setMode(buildMode); }, [buildController, buildMode]);
  useEffect(() => { buildController?.mountExistingFromStore?.(); }, [buildController]);
  useEffect(() => { buildController?.setPlaceContinuous?.(continuous); }, [buildController, continuous]);

  if (!open) return null;

  const selectedId = buildController?.getSelectedId?.() || null;

  return (
    <div data-build-ui="true" style={backdrop}>
      <div style={panel}>
        {/* Header */}
        <div style={hdr}>
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <h3 style={{margin:0, fontSize:20}}>Build Mode</h3>
            <span style={pill(buildActive)}>{buildActive ? 'ACTIVE' : 'OFF'}</span>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button onClick={onClose} title="Închide" style={btnClose}>✕</button>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
          {/* Stânga: tip + mod + place/remove */}
          <div style={card}>
            <div style={label}>Tip obiect</div>
            <div style={{display:'grid', gap:8, maxHeight:260, overflow:'auto', paddingRight:6}}>
              {PROP_TYPES.map(p => (
                <label key={p.key} style={row(currentType === p.key)}>
                  <input
                    type="radio"
                    name="propType"
                    checked={currentType === p.key}
                    onChange={()=>setCurrentType(p.key)}
                  />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>

            <div style={{marginTop:12, display:'flex', gap:8, flexWrap:'wrap'}}>
              <button
                onClick={()=>{
                  setBuildMode('place');
                  setBuildActive(true);
                  buildController?.armPlace?.();
                }}
                style={btn(buildMode==='place', '#10b981', '#06281e')}
              >Place</button>

              <button
                onClick={()=>{ setBuildMode('remove'); }}
                style={btn(buildMode==='remove', '#ef4444', '#fff')}
              >Remove</button>

              <button
                onClick={()=>buildController?.rotateStep(1)}
                style={btn(false, '#111827', '#cbd5e1', true)}
              >⟳ Rotate</button>
            </div>

            <label style={{display:'flex', gap:8, alignItems:'center', marginTop:10, fontSize:13}}>
              <input
                type="checkbox"
                checked={continuous}
                onChange={e=>setContinuous(e.target.checked)}
              />
              Place continuu (tap=plasează la nesfârșit)
            </label>

            <div style={{marginTop:12}}>
              <button
                onClick={()=>setBuildActive(v=>!v)}
                style={bigBtn(buildActive)}
              >{buildActive ? 'OPREȘTE BUILD MODE' : 'PORNEȘTE BUILD MODE'}</button>
            </div>

            <div style={{marginTop:10, display:'flex', gap:8}}>
              <button
                onClick={()=>{
                  buildController?.resetScene?.();
                }}
                style={btn(false, '#64748b', '#0c111b')}
              >Reset local</button>
            </div>
          </div>

          {/* Dreapta: listă + export + săgeți */}
          <div style={card}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
              <div style={label}>Obiecte plasate (edits)</div>
              <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                <button
                  onClick={()=>{
                    const blob = new Blob([exportJSON()], {type:'application/json'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href=url; a.download='world-edits.json'; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={btnSq}>Export JSON</button>
                <button
                  onClick={()=>{
                    const blob = new Blob([exportCSV()], {type:'text/csv'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href=url; a.download='world-edits.csv'; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={btnSq}>Export CSV</button>
              </div>
            </div>

            <div style={listBox}>
              {(!items || !items.length) && (
                <div style={{opacity:.65, fontSize:13}}>Nimic plasat încă.</div>
              )}
              {items && items.length > 0 && items.map(it => (
                <div
                  key={it.id}
                  onClick={()=>buildController?.setSelectedId?.(it.id)}
                  style={itemRow(selectedId === it.id)}
                >
                  <div style={{fontSize:14, fontWeight:700}}>{it.type}</div>
                  <div style={{opacity:.8, fontSize:12}}>
                    id: {it.id.slice(0,8)}… · pos: [{it.pos.map(n=>Number(n).toFixed(2)).join(', ')}] · rotY: {Number(it.rotY||0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* săgeți în panel */}
            {selectedId && (
              <div style={{marginTop:12, display:'flex', justifyContent:'center'}}>
                <div style={{display:'grid', gridTemplateColumns:'48px 48px 48px', gridTemplateRows:'48px 48px 48px', gap:8}}>
                  <div />
                  <button onClick={()=>buildController?.nudgeSelected(0,-1)} style={btnSq}>↑</button>
                  <div />
                  <button onClick={()=>buildController?.nudgeSelected(-1,0)} style={btnSq}>←</button>
                  <button onClick={()=>buildController?.rotateStep(1)} style={{...btnSq, background:'#10b981', color:'#06281e'}}>↻</button>
                  <button onClick={()=>buildController?.nudgeSelected(1,0)} style={btnSq}>→</button>
                  <div />
                  <button onClick={()=>buildController?.nudgeSelected(0,1)} style={btnSq}>↓</button>
                  <div />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- UI helpers ---- */
const backdrop = {
  position:'absolute', inset:0, background:'rgba(0,0,0,.45)', zIndex:30,
  display:'flex', alignItems:'center', justifyContent:'center', padding:16
};
const panel = {
  width:'min(760px, 96vw)', background:'#0b1220', color:'#fff',
  borderRadius:12, padding:16, boxShadow:'0 10px 30px rgba(0,0,0,.4)'
};
const hdr = {display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12};
const card = {border:'1px solid #1f2a44', borderRadius:10, padding:12};
const label = {fontSize:13, opacity:.85, marginBottom:8};
const row = (active) => ({
  display:'flex', alignItems:'center', gap:8,
  background: active ? '#1f2937' : 'transparent',
  padding:'6px 8px', borderRadius:8, cursor:'pointer'
});
const pill = (on) => ({
  padding:'4px 8px', borderRadius:999,
  background: on ? '#10b981' : '#374151',
  color: on ? '#06281e' : '#cbd5e1',
  fontSize:12, fontWeight:700
});
const btn = (on, bgOn, colOn, ghost=false) => ({
  height:36, borderRadius:8, border:'1px solid #1f2a44',
  background: on ? bgOn : (ghost ? '#111827' : '#0f172a'),
  color: on ? colOn : '#cbd5e1', padding:'0 12px', fontWeight:700
});
const bigBtn = (on) => ({
  width:'100%', height:44, borderRadius:8, border:'none',
  background: on ? '#ef4444' : '#10b981',
  color: on ? '#fff' : '#06281e', fontWeight:800
});
const listBox = {maxHeight:300, overflow:'auto', padding:8, background:'#0a1322', border:'1px dashed #1f2a44', borderRadius:8};
const itemRow = (sel) => ({
  padding:'8px 10px', marginBottom:8, borderRadius:8, background: sel ? '#17324b' : '#0f1b2f',
  cursor:'pointer', border: sel ? '1px solid #22c55e' : '1px solid transparent'
});
const btnSq = {
  height:40, minWidth:40, borderRadius:8, border:'1px solid #1f2a44',
  background:'#111827', color:'#cbd5e1', padding:'0 10px', fontWeight:700
};