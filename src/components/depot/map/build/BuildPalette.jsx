// src/components/depot/map/build/BuildPalette.jsx
import React, { useEffect, useState, useRef } from 'react';
import { PROP_TYPES } from '../world/propRegistry';
import { getProps, exportJSON, exportCSV } from '../world/worldStore';

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

  // UI state: minimizat + poziția butonului plutitor
  const [minimized, setMinimized] = useState(false);
  const [fabPos, setFabPos] = useState({ x: 16, y: 16 });
  const dragRef = useRef(null);

  // ținem controllerul sincronizat cu selecțiile din UI
  useEffect(() => { if (buildController && currentType) buildController.setType(currentType); }, [buildController, currentType]);
  useEffect(() => { if (buildController) buildController.setMode(buildMode); }, [buildController, buildMode]);

  if (!open) return null;

  const items = getProps() || [];

  /* ------------------- FAB + D-Pad (doar când e MINIMIZAT) ------------------- */
  if (minimized) {
    const ringColor = buildActive ? '#10b981' : '#ef4444';

    const startDrag = (e) => {
      const p = e.touches?.[0] ?? e;
      dragRef.current = { sx: p.clientX, sy: p.clientY, bx: fabPos.x, by: fabPos.y };
      e.preventDefault?.();
    };
    const onDrag = (e) => {
      if (!dragRef.current) return;
      const p = e.touches?.[0] ?? e;
      const dx = p.clientX - dragRef.current.sx;
      const dy = p.clientY - dragRef.current.sy;
      setFabPos({
        x: Math.max(8, dragRef.current.bx - dx),
        y: Math.max(8, dragRef.current.by - dy),
      });
    };
    const endDrag = () => { dragRef.current = null; };

    const nudge = (dx, dz) => buildController?.nudgeSelected?.(dx, dz);
    const rotate = () => buildController?.rotateStep?.(1);

    return (
      <div
        data-build-ui="true"
        style={{ position:'absolute', inset:0, zIndex:30, pointerEvents:'none' }}
        onMouseMove={onDrag}
        onMouseUp={endDrag}
        onTouchMove={onDrag}
        onTouchEnd={endDrag}
      >
        {/* FAB – deschide panoul mare */}
        <button
          title={buildActive ? 'Build ON – deschide panoul' : 'Build OFF – deschide panoul'}
          data-build-ui="true"
          onClick={() => setMinimized(false)}
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          style={{
            position:'absolute',
            right: fabPos.x, bottom: fabPos.y + 110,
            width:64, height:64, borderRadius:32,
            border:`2px solid ${ringColor}`,
            background:'#0b1220', color:'#fff',
            fontSize:26, fontWeight:800,
            boxShadow:'0 8px 24px rgba(0,0,0,.45)',
            pointerEvents:'auto'
          }}
        >
          🧱
        </button>

        {/* D-Pad – doar în modul minimizat */}
        <div
          data-build-ui="true"
          style={{
            position:'absolute',
            right: fabPos.x, bottom: fabPos.y,
            display:'grid',
            gridTemplateAreas:`". up ."
                               "left rot right"
                               ". down ."`,
            gap:8,
            pointerEvents:'auto'
          }}
        >
          <PadBtn area="up"    onClick={()=>nudge(0,-1)}>↑</PadBtn>
          <PadBtn area="down"  onClick={()=>nudge(0, 1)}>↓</PadBtn>
          <PadBtn area="left"  onClick={()=>nudge(-1,0)}>←</PadBtn>
          <PadBtn area="right" onClick={()=>nudge( 1,0)}>→</PadBtn>
          <PadBtn area="rot"   primary onClick={rotate}>↻</PadBtn>
        </div>
      </div>
    );
  }
  /* -------------------------------------------------------------------------- */

  /* -------------------------- Panoul mare (vizibil) ------------------------- */
  return (
    <div
      data-build-ui="true"
      style={{
        position:'absolute', inset:0, background:'rgba(0,0,0,.45)', zIndex:30,
        display:'flex', alignItems:'center', justifyContent:'center', padding:16
      }}
    >
      <div style={{
        width:'min(760px, 96vw)', background:'#0b1220', color:'#fff',
        borderRadius:12, padding:16, boxShadow:'0 10px 30px rgba(0,0,0,.4)'
      }}>
        {/* Header */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <h3 style={{margin:0, fontSize:18}}>Build Mode</h3>
            <span style={{
              padding:'4px 8px', borderRadius:999,
              background: buildActive ? '#10b981' : '#374151',
              color: buildActive ? '#06281e' : '#cbd5e1',
              fontSize:12, fontWeight:700
            }}>{buildActive ? 'ACTIVE' : 'OFF'}</span>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button
              title="Minimize"
              onClick={() => setMinimized(true)}
              style={{fontSize:16, background:'#0f172a', color:'#cbd5e1', border:'1px solid #1f2a44', borderRadius:8, padding:'6px 10px'}}
            >—</button>
            <button
              onClick={onClose}
              style={{fontSize:18, background:'transparent', color:'#fff', border:'none'}}
              title="Închide paleta"
            >✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
          {/* Col stânga: tip + mod */}
          <div style={{border:'1px solid #1f2a44', borderRadius:10, padding:12}}>
            <div style={{fontSize:13, opacity:.85, marginBottom:8}}>Tip obiect</div>
            <div style={{display:'grid', gap:8, maxHeight:260, overflow:'auto', paddingRight:6}}>
              {PROP_TYPES.map(p => (
                <label key={p.key} style={{
                  display:'flex', alignItems:'center', gap:8,
                  background: currentType === p.key ? '#1f2937' : 'transparent',
                  padding:'6px 8px', borderRadius:8, cursor:'pointer'
                }}>
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
                onClick={()=>setBuildMode('place')}
                style={btnMode(buildMode==='place', '#10b981')}
              >Place</button>
              <button
                onClick={()=>setBuildMode('remove')}
                style={btnMode(buildMode==='remove', '#ef4444', true)}
              >Remove</button>
              <button
                onClick={()=>buildController?.rotateStep(1)}
                style={btnGhost()}
              >↻ Rotate</button>
            </div>

            <div style={{marginTop:12}}>
              <button
                onClick={()=>setBuildActive(v=>!v)}
                style={{
                  width:'100%', height:40, borderRadius:8, border:'none',
                  background: buildActive ? '#ef4444' : '#10b981',
                  color: buildActive ? '#fff' : '#06281e',
                  fontWeight:800
                }}
              >{buildActive ? 'OPREȘTE BUILD MODE' : 'PORNEȘTE BUILD MODE'}</button>
            </div>
          </div>

          {/* Col dreapta: LISTA de obiecte plasate + export */}
          <div style={{border:'1px solid #1f2a44', borderRadius:10, padding:12, position:'relative'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
              <div style={{fontSize:13, opacity:.85}}>Obiecte plasate (edits)</div>
              <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                <button onClick={()=>download('world-edits.json', exportJSON(), 'application/json')} style={btnGhost()}>Export JSON</button>
                <button onClick={()=>download('world-edits.csv',  exportCSV(),  'text/csv')}           style={btnGhost()}>Export CSV</button>
              </div>
            </div>

            <div style={{
              maxHeight:300, overflow:'auto', padding:8,
              background:'#0a1322', border:'1px dashed #1f2a44', borderRadius:8
            }}>
              {(!items || !items.length) && (
                <div style={{opacity:.65, fontSize:13}}>Nimic plasat încă. Pornește „Build Mode”, alege un tip și atinge/click pe teren. Selectează din listă pentru a muta cu D-pad (disponibil când panoul e minimizat).</div>
              )}

              {items && items.length > 0 && items.map((it) => {
                const selected = buildController?.getSelectedId?.() === it.id;
                return (
                  <div
                    key={it.id}
                    onClick={() => buildController?.setSelectedId?.(it.id)}
                    tabIndex={0}
                    onKeyDown={(e)=>{ if (e.key==='Enter' || e.key===' ') { e.preventDefault(); buildController?.setSelectedId?.(it.id); } }}
                    role="button"
                    aria-pressed={selected}
                    style={{
                      cursor:'pointer',
                      display:'grid',
                      gridTemplateColumns:'1fr auto',
                      gap:8,
                      padding:'8px 10px',
                      marginBottom:8,
                      borderRadius:8,
                      background: selected ? '#22c55e33' : '#0f1b2f',
                      outline:'none'
                    }}
                  >
                    <div style={{fontSize:13}}>
                      <div><b>{it.type}</b> <span style={{opacity:.7}}>(id: {it.id.slice(0,8)}…)</span></div>
                      <div style={{opacity:.8}}>pos: [{it.pos.map(n=>Number(n).toFixed(2)).join(', ')}], rotY: {Number(it.rotY).toFixed(2)}</div>
                    </div>
                    {selected && <span title="selectat" style={{alignSelf:'center'}}>✅</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- componente & utils --------------------------- */
function PadBtn({ area, onClick, children, primary }) {
  return (
    <button
      onClick={onClick}
      data-build-ui="true"
      style={{
        gridArea: area,
        width:64, height:64, borderRadius:12,
        border:'1px solid #1f2a44',
        background: primary ? '#10b981' : '#0f172a',
        color:'#fff', fontSize:22, fontWeight:800,
        boxShadow:'0 6px 18px rgba(0,0,0,.35)'
      }}
    >{children}</button>
  );
}

function btnGhost() {
  return { height:36, borderRadius:8, border:'1px solid #1f2a44', background:'#111827', color:'#cbd5e1', padding:'0 10px', fontWeight:700 };
}
function btnMode(active, color, danger) {
  return {
    height:36, borderRadius:8, border:'1px solid #1f2a44',
    background: active ? color : '#111827',
    color: active ? (danger ? '#fff' : '#06281e') : '#cbd5e1',
    padding:'0 10px', fontWeight:700
  };
}
function download(name, data, type) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}