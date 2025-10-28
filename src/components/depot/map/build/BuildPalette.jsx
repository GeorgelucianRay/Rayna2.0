// src/components/depot/map/build/BuildPalette.jsx
import React, { useEffect, useState, useRef } from 'react';
import { PROP_TYPES } from '../world/propRegistry';
import { getProps, exportJSON, exportCSV, subscribe } from '../world/worldStore';

export default function BuildPalette({
  open,
  onClose,
  buildController,  // din useDepotScene.buildApi.controller
  buildActive,      // bool (din useDepotScene.buildApi.active sau state expus)
  setBuildActive,   // fn(bool)
  buildMode,        // 'place' | 'remove'
  setBuildMode,     // fn
}) {
  // --- STARE UI ---
  const [currentType, setCurrentType] = useState('road.segment');
  const [items, setItems] = useState(() => getProps?.() || []);
  const [minimized, setMinimized] = useState(false);
  const [fabPos, setFabPos] = useState({ x: 16, y: 16 }); // dist. față de colțul dreapta-jos
  const draggingRef = useRef(null);
  const [armed, setArmed] = useState(false); // armat pt. plasare touch/tap

  // select curent din controller (dacă are ceva selectat)
  const [selectedId, setSelectedId] = useState(() =>
    buildController?.getSelectedId?.() || null
  );

  // === legături cu controllerul ===
  useEffect(() => {
    if (buildController && currentType) buildController.setType(currentType);
  }, [buildController, currentType]);

  useEffect(() => {
    if (buildController && buildMode) buildController.setMode(buildMode);
  }, [buildController, buildMode]);

  // === subscribe la store pentru lista din dreapta ===
  useEffect(() => {
    if (!subscribe) return;
    const unsub = subscribe((st) => {
      setItems(Array.isArray(st?.props) ? st.props : []);
      // dacă itemul selectat a dispărut, curăță selecția
      if (selectedId && !st.props.some(p => p.id === selectedId)) {
        setSelectedId(null);
      }
    });
    return unsub;
  }, [selectedId]);

  // === sincronizează selecția dacă userul o schimbă din alt UI ===
  useEffect(() => {
    const id = buildController?.getSelectedId?.();
    if (id !== selectedId) setSelectedId(id || null);
    // verif. periodic scurtă (simplu și robust) – opțional:
    const t = setInterval(() => {
      const i = buildController?.getSelectedId?.();
      if (i !== selectedId) setSelectedId(i || null);
    }, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildController]);

  if (!open) return null;

  /* =====================  FAB (MINIMIZE)  ===================== */
  if (minimized) {
    const ringColor = buildActive ? '#10b981' : '#ef4444';

    const startDrag = (e) => {
      const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
      draggingRef.current = {
        startX: p.clientX,
        startY: p.clientY,
        baseX: fabPos.x,
        baseY: fabPos.y
      };
      e.preventDefault?.();
    };
    const onDrag = (e) => {
      if (!draggingRef.current) return;
      const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
      const dx = p.clientX - draggingRef.current.startX;
      const dy = p.clientY - draggingRef.current.startY;
      // “right: fabPos.x” și “bottom: fabPos.y” => mișcăm invers
      setFabPos({
        x: Math.max(8, draggingRef.current.baseX - dx),
        y: Math.max(8, draggingRef.current.baseY - dy)
      });
    };
    const endDrag = () => { draggingRef.current = null; };

    return (
      <div
        data-build-ui="true"
        style={{ position:'absolute', inset:0, zIndex:30, pointerEvents:'none' }}
        onMouseMove={onDrag}
        onMouseUp={endDrag}
        onTouchMove={onDrag}
        onTouchEnd={endDrag}
      >
        <button
          title={buildActive ? 'Build ON (tap pt. a deschide)' : 'Build OFF (tap pt. a deschide)'}
          onClick={() => setMinimized(false)}
          data-build-ui="true"
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          style={{
            position:'absolute',
            right: fabPos.x, bottom: fabPos.y,
            width:64, height:64, borderRadius:32,
            border:'2px solid ' + ringColor,
            background:'#0b1220', color:'#fff',
            fontSize:26, fontWeight:800,
            boxShadow:'0 8px 24px rgba(0,0,0,.45)',
            pointerEvents:'auto'
          }}
        >
          🧱
        </button>
      </div>
    );
  }

  // === handlers ===
  const armPlacement = () => {
    buildController?.armPlace?.();
    setArmed(true);
  };
  const disarmPlacement = () => {
    buildController?.disarmPlace?.();
    setArmed(false);
  };

  const onSelectItem = (id) => {
    buildController?.setSelectedId?.(id);
    setSelectedId(id);
  };

  const nudge = (dx, dz) => buildController?.nudgeSelected?.(dx, dz);
  const rotateSel = (dir) => buildController?.rotateStep?.(dir);

  const resetLocal = () => {
    // curăță scena + localStorage
    buildController?.clearAllFromScene?.();
    setSelectedId(null);
  };

  /* =====================  PANOUL MARE  ===================== */
  return (
    <div
      data-build-ui="true"
      style={{
        position:'absolute', inset:0, background:'rgba(0,0,0,.45)', zIndex:30,
        display:'flex', alignItems:'center', justifyContent:'center', padding:16
      }}
    >
      <div style={{
        width:'min(740px, 96vw)', background:'#0b1220', color:'#fff',
        borderRadius:12, padding:16, boxShadow:'0 10px 30px rgba(0,0,0,.4)'
      }}>
        {/* Header */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <h3 style={{margin:0, fontSize:18}}>Map Builder</h3>
            <span style={{
              padding:'4px 8px', borderRadius:999,
              background: buildActive ? '#10b981' : '#374151',
              color: buildActive ? '#06281e' : '#cbd5e1',
              fontSize:12, fontWeight:700
            }}>{buildActive ? 'ACTIVE' : 'OFF'}</span>
            {armed && (
              <span style={{
                padding:'4px 8px', borderRadius:999, background:'#22c55e33',
                color:'#a7f3d0', fontSize:12, fontWeight:700
              }}>ARMED</span>
            )}
          </div>
          <div style={{display:'flex', gap:8}}>
            <button
              title="Minimize"
              onClick={() => setMinimized(true)}
              style={{
                fontSize:16, background:'#0f172a', color:'#cbd5e1',
                border:'1px solid #1f2a44', borderRadius:8, padding:'6px 10px'
              }}
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
          {/* COL STÂNGA: Tip, mod, acțiuni */}
          <div style={{border:'1px solid #1f2a44', borderRadius:10, padding:12}}>
            {/* Tip obiect */}
            <div style={{fontSize:13, opacity:.85, marginBottom:8}}>Tip obiect</div>
            <div style={{display:'grid', gap:8, maxHeight:220, overflow:'auto', paddingRight:6}}>
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
                    onChange={()=>{
                      setCurrentType(p.key);
                      // la schimbare tip, dezarmează (util pt. touch)
                      disarmPlacement();
                    }}
                  />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>

            {/* Mod de lucru */}
            <div style={{marginTop:12, display:'flex', gap:8, flexWrap:'wrap'}}>
              <button
                onClick={() => { setBuildMode('place'); disarmPlacement(); }}
                style={{
                  height:36, borderRadius:8, border:'1px solid #1f2a44',
                  background: buildMode==='place' ? '#10b981' : '#111827',
                  color: buildMode==='place' ? '#06281e' : '#cbd5e1',
                  padding:'0 10px', fontWeight:700
                }}
              >Place</button>
              <button
                onClick={() => { setBuildMode('remove'); disarmPlacement(); }}
                style={{
                  height:36, borderRadius:8, border:'1px solid #1f2a44',
                  background: buildMode==='remove' ? '#ef4444' : '#111827',
                  color: buildMode==='remove' ? '#fff' : '#cbd5e1',
                  padding:'0 10px', fontWeight:700
                }}
              >Remove</button>
            </div>

            {/* Build ON/OFF */}
            <div style={{marginTop:12}}>
              <button
                onClick={() => { setBuildActive(v => !v); disarmPlacement(); }}
                style={{
                  width:'100%', height:40, borderRadius:8, border:'none',
                  background: buildActive ? '#ef4444' : '#10b981',
                  color: buildActive ? '#fff' : '#06281e',
                  fontWeight:800
                }}
              >{buildActive ? 'OPREȘTE BUILD MODE' : 'PORNEȘTE BUILD MODE'}</button>
            </div>

            {/* Armare plasare (touch-first) */}
            {buildMode === 'place' && (
              <div style={{marginTop:10}}>
                {!armed ? (
                  <button
                    onClick={armPlacement}
                    style={{
                      width:'100%', height:40, borderRadius:8, border:'1px solid #1f2a44',
                      background:'#0f172a', color:'#cbd5e1', fontWeight:700
                    }}
                    title="Apasă, apoi atinge pe hartă ca să plasezi obiectul"
                  >Armează plasarea (tap & place)</button>
                ) : (
                  <button
                    onClick={disarmPlacement}
                    style={{
                      width:'100%', height:40, borderRadius:8, border:'1px solid #1f2a44',
                      background:'#1f2937', color:'#a7f3d0', fontWeight:700
                    }}
                  >Dezarmează plasarea</button>
                )}
                <div style={{marginTop:6, fontSize:12, opacity:.8}}>
                  {armed ? 'Plasarea este ARMATĂ: atinge pe hartă pentru a plasa.' : 'Sfat: pe telefon/tabletă, apasă „Armează plasarea”, apoi atinge pe hartă.'}
                </div>
              </div>
            )}
          </div>

          {/* COL DREAPTA: Listă, selecție, nudge/rotate, export/reset */}
          <div style={{border:'1px solid #1f2a44', borderRadius:10, padding:12}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
              <div style={{fontSize:13, opacity:.85}}>Obiecte plasate (din sesiunea curentă)</div>
              <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                <button
                  onClick={()=>{
                    const blob = new Blob([exportJSON()], {type:'application/json'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'world-edits.json'; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{height:30, borderRadius:6, border:'1px solid #1f2a44', background:'#111827', color:'#cbd5e1', padding:'0 8px'}}
                >Export JSON</button>
                <button
                  onClick={()=>{
                    const blob = new Blob([exportCSV()], {type:'text/csv'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'world-edits.csv'; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{height:30, borderRadius:6, border:'1px solid #1f2a44', background:'#111827', color:'#cbd5e1', padding:'0 8px'}}
                >Export CSV</button>
                <button
                  onClick={resetLocal}
                  style={{height:30, borderRadius:6, border:'1px solid #7f1d1d', background:'#7f1d1d', color:'#fff', padding:'0 8px'}}
                  title="Șterge tot din scenă + localStorage"
                >Reset local</button>
              </div>
            </div>

            {/* LISTA */}
            <div style={{
              maxHeight:210, overflow:'auto', padding:8,
              background:'#0a1322', border:'1px dashed #1f2a44', borderRadius:8
            }}>
              {(!items || !items.length) && (
                <div style={{opacity:.65, fontSize:13}}>
                  Niciun obiect încă. Pornește „Build Mode”, alege un tip și dă tap/click pe teren.
                </div>
              )}

              {items && items.length > 0 && items.map(it => {
                const isSel = selectedId === it.id;
                return (
                  <div
                    key={it.id}
                    onClick={() => onSelectItem(it.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectItem(it.id);
                      }
                    }}
                    style={{
                      cursor:'pointer',
                      display:'grid',
                      gridTemplateColumns:'1fr auto',
                      padding:'6px 8px',
                      marginBottom:6,
                      borderRadius:6,
                      background: isSel ? '#22c55e33' : '#0f1b2f',
                      outline:'none'
                    }}
                    aria-pressed={isSel}
                    role="button"
                  >
                    <div style={{fontSize:13}}>
                      <div>
                        <b>{it.type}</b>
                        <span style={{opacity:.7}}> (id: {it.id.slice(0,8)}…)</span>
                      </div>
                      <div style={{opacity:.8}}>
                        pos: [{it.pos.map(n=>Number(n).toFixed(2)).join(', ')}], rotY: {Number(it.rotY).toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CONTROALE PENTRU SELECTAT */}
            <div style={{marginTop:12, borderTop:'1px solid #1f2a44', paddingTop:12}}>
              <div style={{fontSize:13, opacity:.85, marginBottom:8}}>Mută / rotește obiectul selectat</div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                {/* Nudge arrows */}
                <div style={{display:'grid', gridTemplateRows:'auto auto auto', placeItems:'center', gap:6}}>
                  <button
                    disabled={!selectedId}
                    onClick={() => nudge(0, -1)}
                    style={arrowBtnStyle(!selectedId)}
                  >↑</button>
                  <div style={{display:'flex', gap:12}}>
                    <button disabled={!selectedId} onClick={() => nudge(-1, 0)} style={arrowBtnStyle(!selectedId)}>←</button>
                    <button disabled={!selectedId} onClick={() => nudge(1, 0)}  style={arrowBtnStyle(!selectedId)}>→</button>
                  </div>
                  <button
                    disabled={!selectedId}
                    onClick={() => nudge(0, 1)}
                    style={arrowBtnStyle(!selectedId)}
                  >↓</button>
                </div>

                {/* Rotate */}
                <div style={{display:'flex', flexDirection:'column', gap:8, alignItems:'center', justifyContent:'center'}}>
                  <button
                    disabled={!selectedId}
                    onClick={() => rotateSel(+1)}
                    style={pillBtnStyle(!selectedId)}
                  >↻ Rotire +90°</button>
                  <button
                    disabled={!selectedId}
                    onClick={() => rotateSel(-1)}
                    style={pillBtnStyle(!selectedId)}
                  >↺ Rotire −90°</button>
                </div>
              </div>

              {buildMode === 'place' && (
                <div style={{marginTop:10, fontSize:12, opacity:.8}}>
                  Sfat: pe telefon/tabletă, folosește <b>Armează plasarea</b> apoi atinge pe hartă, repetă pentru mai multe piese.
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ======= mici utilitare pentru stil butoane ======= */
function arrowBtnStyle(disabled) {
  return {
    width:48, height:40, borderRadius:8,
    border:'1px solid #1f2a44',
    background: disabled ? '#0b1220' : '#111827',
    color: disabled ? '#3b4252' : '#cbd5e1',
    fontSize:18, fontWeight:800,
    pointerEvents: disabled ? 'none' : 'auto'
  };
}
function pillBtnStyle(disabled) {
  return {
    width:'100%', height:36, borderRadius:8,
    border:'1px solid #1f2a44',
    background: disabled ? '#0b1220' : '#111827',
    color: disabled ? '#3b4252' : '#cbd5e1',
    fontWeight:700,
    pointerEvents: disabled ? 'none' : 'auto'
  };
}