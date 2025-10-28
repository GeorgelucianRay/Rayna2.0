// src/components/depot/map/build/BuildPalette.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PROP_TYPES } from '../world/propRegistry';
import { getProps, exportJSON, exportCSV, clearAllProps } from '../world/worldStore';

export default function BuildPalette({
  open,
  onClose,
  buildController,   // createBuildController()
  buildActive,
  setBuildActive,
  buildMode,         // 'place' | 'remove'
  setBuildMode,
}) {
  const [currentType, setCurrentType] = useState('road.segment');
  const [minimized, setMinimized] = useState(false);
  const [fabPos, setFabPos] = useState({ x: 16, y: 16 });
  const dragRef = useRef(null);

  // asigurăm legătura cu controllerul
  useEffect(() => { if (buildController && currentType) buildController.setType(currentType); }, [buildController, currentType]);
  useEffect(() => { if (buildController) buildController.setMode(buildMode); }, [buildController, buildMode]);

  // ——— lista “edits” din localStorage (doar ce ai adăugat/mișcat tu) ———
  const items = getProps() || [];

  // ========= FAB (minimized) =========
  if (!open) return null;
  if (minimized) {
    const ring = buildActive ? '#10b981' : '#ef4444';

    const startDrag = e => {
      const p = e.touches?.[0] ?? e;
      dragRef.current = { sx: p.clientX, sy: p.clientY, bx: fabPos.x, by: fabPos.y };
      e.preventDefault?.();
    };
    const onDrag = e => {
      if (!dragRef.current) return;
      const p = e.touches?.[0] ?? e;
      const dx = p.clientX - dragRef.current.sx;
      const dy = p.clientY - dragRef.current.sy;
      setFabPos({ x: Math.max(8, dragRef.current.bx - dx), y: Math.max(8, dragRef.current.by - dy) });
    };
    const endDrag = () => (dragRef.current = null);

    return (
      <div
        data-build-ui="true"
        style={{ position:'absolute', inset:0, zIndex:30, pointerEvents:'none' }}
        onMouseMove={onDrag} onMouseUp={endDrag}
        onTouchMove={onDrag} onTouchEnd={endDrag}
      >
        <button
          title={buildActive ? 'Build ON (tap pt. a deschide)' : 'Build OFF (tap pt. a deschide)'}
          onClick={() => setMinimized(false)}
          onMouseDown={startDrag} onTouchStart={startDrag}
          data-build-ui="true"
          style={{
            position:'absolute', right: fabPos.x, bottom: fabPos.y,
            width:64, height:64, borderRadius:32,
            border:'2px solid ' + ring, background:'#0b1220', color:'#fff',
            fontSize:26, fontWeight:800, pointerEvents:'auto',
            boxShadow:'0 8px 24px rgba(0,0,0,.45)'
          }}
        >🧱</button>

        {/* Pad-ul de săgeți rămâne vizibil și când e minimizat */}
        <ArrowPadOverlay buildController={buildController} />
      </div>
    );
  }

  // ========= PANE + LISTĂ =========
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
        borderRadius:12, padding:16, boxShadow:'0 10px 30px rgba(0,0,0,.4)',
        position:'relative'
      }}>
        {/* HEADER */}
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
              onClick={() => { setBuildActive(false); onClose?.(); }}
              style={{fontSize:18, background:'transparent', color:'#fff', border:'none'}}
              title="Închide paleta"
            >✕</button>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
          {/* STÂNGA: tip + mod + toggle */}
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
                    type="radio" name="propType"
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
                style={{
                  height:36, borderRadius:8, border:'1px solid #1f2a44',
                  background: buildMode==='place' ? '#10b981' : '#111827',
                  color: buildMode==='place' ? '#06281e' : '#cbd5e1',
                  padding:'0 10px', fontWeight:700
                }}
              >Place</button>
              <button
                onClick={()=>setBuildMode('remove')}
                style={{
                  height:36, borderRadius:8, border:'1px solid #1f2a44',
                  background: buildMode==='remove' ? '#ef4444' : '#111827',
                  color: buildMode==='remove' ? '#fff' : '#cbd5e1',
                  padding:'0 10px', fontWeight:700
                }}
              >Remove</button>
              <button
                onClick={()=>buildController?.rotateStep(1)}
                style={{ height:36, borderRadius:8, border:'1px solid #1f2a44', background:'#111827', color:'#cbd5e1', padding:'0 10px' }}
              >↻ Rotate</button>
            </div>

            <div style={{marginTop:12}}>
              <button
                onClick={()=>setBuildActive(v=>!v)}
                style={{
                  width:'100%', height:40, borderRadius:8, border:'none',
                  background: buildActive ? '#ef4444' : '#10b981',
                  color: buildActive ? '#fff' : '#06281e', fontWeight:800
                }}
              >{buildActive ? 'OPREȘTE BUILD MODE' : 'PORNEȘTE BUILD MODE'}</button>
            </div>
          </div>

          {/* DREAPTA: lista EDITS + export + reset */}
          <div style={{border:'1px solid #1f2a44', borderRadius:10, padding:12, position:'relative'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
              <div style={{fontSize:13, opacity:.85}}>Obiecte plasate <b>(edits)</b></div>
              <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                <button
                  onClick={()=>{
                    const blob = new Blob([exportJSON()], {type:'application/json'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'world-edits.json'; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{height:30, borderRadius:6, border:'1px solid #1f2a44', background:'#111827', color:'#cbd5e1', padding:'0 8px'}}
                >Export JSON</button>
                <button
                  onClick={()=>{
                    const blob = new Blob([exportCSV()], {type:'text/csv'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'world-edits.csv'; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{height:30, borderRadius:6, border:'1px solid #1f2a44', background:'#111827', color:'#cbd5e1', padding:'0 8px'}}
                >Export CSV</button>
                <button
                  onClick={()=>{
                    if (confirm('Șterg toate edits din localStorage?')) {
                      clearAllProps();
                      // forțăm rerandarea listelor (truc mic)
                      const ev = new Event('storage'); window.dispatchEvent(ev);
                    }
                  }}
                  style={{height:30, borderRadius:6, border:'1px solid #7f1d1d', background:'#1f2937', color:'#fecaca', padding:'0 8px'}}
                  title="Șterge toate modificările locale"
                >Reset edits</button>
              </div>
            </div>

            <EditsList
              items={items}
              getSelectedId={buildController?.getSelectedId}
              setSelectedId={buildController?.setSelectedId}
            />

            {/* Unicul ArrowPad */}
            <ArrowPadOverlay buildController={buildController} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Lista items + select ===== */
function EditsList({ items, getSelectedId, setSelectedId }) {
  // mic refresh când se schimbă localStorage (după Reset)
  const [, force] = useState(0);
  useEffect(() => {
    const h = () => force(x=>x+1);
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, []);

  if (!items?.length) {
    return (
      <div style={{
        maxHeight:260, overflow:'auto', padding:8, background:'#0a1322',
        border:'1px dashed #1f2a44', borderRadius:8, color:'#cbd5e1'
      }}>
        Nimic plasat încă. Pornește „Build Mode”, alege un tip și atinge/click pe teren.
      </div>
    );
  }

  const sel = getSelectedId?.() || null;

  return (
    <div style={{
      maxHeight:260, overflow:'auto', padding:8, background:'#0a1322',
      border:'1px dashed #1f2a44', borderRadius:8
    }}>
      {items.map(it => {
        const active = sel === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setSelectedId?.(it.id)}
            style={{
              width:'100%', textAlign:'left',
              display:'grid', gridTemplateColumns:'1fr auto',
              padding:'8px 10px', marginBottom:8, borderRadius:8,
              background: active ? '#134e4a' : '#0f1b2f',
              color:'#e5e7eb', border:'1px solid ' + (active ? '#10b981' : '#1f2a44')
            }}
          >
            <div style={{fontSize:13}}>
              <div><b>{it.type}</b> <span style={{opacity:.7}}>(id: {it.id.slice(0,8)}…)</span></div>
              <div style={{opacity:.85}}>
                pos: [{it.pos.map(n=>Number(n).toFixed(2)).join(', ')}], rotY: {Number(it.rotY).toFixed(2)}
              </div>
            </div>
            <div style={{opacity:.7, alignSelf:'center'}}>select</div>
          </button>
        );
      })}
    </div>
  );
}

/* ===== Arrow pad (un singur overlay) ===== */
function ArrowPadOverlay({ buildController }) {
  const nudge = (dx, dz) => buildController?.nudgeSelected?.(dx, dz);
  const rotate = () => buildController?.rotateSelected?.(1);

  // poziționat în dreapta, sub listă
  return (
    <div
      data-build-ui="true"
      style={{
        position:'absolute', right:-72, top:32, zIndex:40,
        display:'grid', gridTemplateAreas:`"u u u" "l c r" "d d d"`, gap:10
      }}
    >
      <PadBtn area="u" label="↑" onClick={()=>nudge(0,-1)} />
      <PadBtn area="l" label="←" onClick={()=>nudge(-1,0)} />
      <PadBtn area="c" label="↻" onClick={rotate} primary />
      <PadBtn area="r" label="→" onClick={()=>nudge(1,0)} />
      <PadBtn area="d" label="↓" onClick={()=>nudge(0,1)} />
    </div>
  );
}

function PadBtn({ area, label, onClick, primary }) {
  return (
    <button
      data-build-ui="true"
      onClick={onClick}
      style={{
        gridArea: area,
        width:56, height:56, borderRadius:10,
        background: primary ? '#10b981' : '#0f172a',
        color: primary ? '#093d31' : '#cbd5e1',
        border: '1px solid ' + (primary ? '#10b981' : '#1f2a44'),
        boxShadow:'0 10px 24px rgba(0,0,0,.35)', fontSize:22, fontWeight:800
      }}
    >{label}</button>
  );
}