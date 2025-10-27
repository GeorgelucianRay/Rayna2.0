// src/components/depot/map/build/BuildPalette.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { PROP_TYPES } from '../world/propRegistry';
import { getProps, exportJSON, exportCSV } from '../world/worldStore';

export default function BuildPalette({
  open,
  onClose,
  buildController,   // createBuildController(...) (ex: buildRef.current)
  buildActive,       // bool
  setBuildActive,    // fn(bool)
  buildMode,         // 'place' | 'remove'
  setBuildMode,      // fn
}) {
  const [currentType, setCurrentType] = useState('road.segment');

  // sincronizează tipul ales cu controllerul
  useEffect(() => {
    if (open && buildController && currentType) {
      buildController.setType(currentType);
    }
  }, [open, buildController, currentType]);

  // sincronizează modul (place/remove) cu controllerul
  useEffect(() => {
    if (open && buildController) {
      buildController.setMode(buildMode);
    }
  }, [open, buildController, buildMode]);

  // extrage mereu lista din store ca să fie “live”
  const items = useMemo(() => getProps(), [open, buildActive, buildMode, currentType]);

  if (!open) return null;

  return (
    <div className="build-palette-ui" style={{
      position:'absolute', inset:0, background:'rgba(0,0,0,.45)', zIndex:30,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16
    }}>
      <div style={{
        width:'min(720px, 96vw)', background:'#0b1220', color:'#fff',
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
          <button
            onClick={onClose}
            style={{fontSize:18, background:'transparent', color:'#fff', border:'none', cursor:'pointer'}}
            aria-label="Închide"
          >✕</button>
        </div>

        {/* Controls */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
          {/* Stânga: selecție tip + mod + start/stop */}
          <div style={{border:'1px solid #1f2a44', borderRadius:10, padding:12}}>
            <div style={{fontSize:13, opacity:.85, marginBottom:8}}>Tip obiect</div>

            <div style={{display:'grid', gap:6, maxHeight:260, overflow:'auto', paddingRight:4}}>
              {PROP_TYPES.map(p => (
                <label key={p.key} style={{
                  display:'flex', alignItems:'center', gap:8,
                  background: currentType === p.key ? '#1f2937' : 'transparent',
                  padding:'6px 8px', borderRadius:8, cursor:'pointer', border:'1px solid #1f2a44'
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
                title="Plasează obiecte"
                style={{
                  height:36, borderRadius:8, border:'1px solid #1f2a44',
                  background: buildMode==='place' ? '#10b981' : '#111827',
                  color: buildMode==='place' ? '#06281e' : '#cbd5e1',
                  padding:'0 12px', fontWeight:700, cursor:'pointer'
                }}
              >Place</button>

              <button
                onClick={()=>setBuildMode('remove')}
                title="Șterge obiecte"
                style={{
                  height:36, borderRadius:8, border:'1px solid #1f2a44',
                  background: buildMode==='remove' ? '#ef4444' : '#111827',
                  color: buildMode==='remove' ? '#fff' : '#cbd5e1',
                  padding:'0 12px', fontWeight:700, cursor:'pointer'
                }}
              >Remove</button>

              <button
                onClick={()=>buildController?.rotateStep(1)}
                title="Rotire 90°"
                style={{
                  height:36, borderRadius:8, border:'1px solid #1f2a44',
                  background:'#111827', color:'#cbd5e1', padding:'0 12px', cursor:'pointer'
                }}
              >↻ Rotate</button>
            </div>

            <div style={{marginTop:12}}>
              <button
                onClick={()=>setBuildActive(v=>!v)}
                style={{
                  width:'100%', height:42, borderRadius:8, border:'none',
                  background: buildActive ? '#ef4444' : '#10b981',
                  color: buildActive ? '#fff' : '#06281e',
                  fontWeight:800, cursor:'pointer'
                }}
              >{buildActive ? 'OPREȘTE BUILD MODE' : 'PORNEȘTE BUILD MODE'}</button>
            </div>

            <div style={{fontSize:12, opacity:.75, marginTop:8, lineHeight:1.4}}>
              <div>• În modul <b>Place</b>: mișcă mouse-ul pe asfalt — apare un “preview” semitransparent. Click pentru a plasa.</div>
              <div>• În modul <b>Remove</b>: click pe obiect pentru a-l șterge.</div>
              <div>• Folosește <b>↻ Rotate</b> pentru a roti cu 90°.</div>
            </div>
          </div>

          {/* Dreapta: listă + export */}
          <div style={{border:'1px solid #1f2a44', borderRadius:10, padding:12}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
              <div style={{fontSize:13, opacity:.85}}>Obiecte plasate</div>
              <div style={{display:'flex', gap:8}}>
                <button
                  onClick={()=>{
                    const blob = new Blob([exportJSON()], {type:'application/json'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'world-edits.json'; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{height:30, borderRadius:6, border:'1px solid #1f2a44', background:'#111827', color:'#cbd5e1', padding:'0 8px', cursor:'pointer'}}
                >Export JSON</button>
                <button
                  onClick={()=>{
                    const blob = new Blob([exportCSV()], {type:'text/csv'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'world-edits.csv'; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{height:30, borderRadius:6, border:'1px solid #1f2a44', background:'#111827', color:'#cbd5e1', padding:'0 8px', cursor:'pointer'}}
                >Export CSV</button>
              </div>
            </div>

            <div style={{
              maxHeight:300, overflow:'auto', padding:8,
              background:'#0a1322', border:'1px dashed #1f2a44', borderRadius:8
            }}>
              {(!items || !items.length) && (
                <div style={{opacity:.65, fontSize:13}}>
                  Nimic plasat încă. Pornește „Build Mode”, alege un tip și fă click pe teren.
                </div>
              )}

              {items && items.length > 0 && items.map(it => (
                <div key={it.id} style={{
                  display:'grid',
                  gridTemplateColumns:'1fr auto',
                  padding:'6px 8px', marginBottom:6,
                  borderRadius:6, background:'#0f1b2f'
                }}>
                  <div style={{fontSize:13}}>
                    <div><b>{it.type}</b> <span style={{opacity:.7}}>(id: {String(it.id).slice(0,8)}…)</span></div>
                    <div style={{opacity:.8}}>
                      pos: [{it.pos.map(n=>Number(n).toFixed(2)).join(', ')}], rotY: {Number(it.rotY).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!buildController && (
              <div style={{marginTop:10, fontSize:12, color:'#fca5a5'}}>
                ⚠️ Controllerul de build lipsește. Verifică inițializarea lui în hook (createBuildController).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}