// src/components/depot/map/build/BuildPalette.jsx
import React, { useEffect, useState, useRef } from 'react';
import { PROP_TYPES } from '../world/propRegistry';
import { getProps, exportJSON, exportCSV } from '../world/worldStore';

/* --- tiny inline MovePad so you don't need another file --- */
function MovePad({ controller }) {
  if (!controller) return null;
  const hasSel = !!controller.getSelectedId?.();

  const btn = (label, onClick, extra = {}) => (
    <button
      onClick={onClick}
      disabled={!hasSel}
      style={{
        width: 56, height: 56, borderRadius: 12,
        border: '1px solid #172036',
        background: hasSel ? '#0f172a' : '#0b1324',
        color: hasSel ? '#e5e7eb' : '#6b7280',
        fontSize: 20, fontWeight: 800, boxShadow: '0 8px 22px rgba(0,0,0,.35)',
        ...extra
      }}
      aria-disabled={!hasSel}
      title={hasSel ? '' : 'Selectează un obiect din listă'}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      position: 'absolute', right: 12, top: 70, zIndex: 31,
      display: 'grid', gridTemplateColumns: '56px 56px 56px', gap: 10,
      alignItems: 'center', justifyItems: 'center'
    }}>
      <div />
      {btn('↑', () => controller.nudge?.(0, -1))}
      <div />
      {btn('←', () => controller.nudge?.(-1, 0))}
      {btn('⟳', () => controller.rotateStep?.(1), { background: '#10b981', color: '#06281e' })}
      {btn('→', () => controller.nudge?.(1, 0))}
      <div />
      {btn('↓', () => controller.nudge?.(0, 1))}
      <div />
    </div>
  );
}

export default function BuildPalette({
  open,
  onClose,
  buildController,
  buildActive,
  setBuildActive,
  buildMode,        // 'place' | 'remove'
  setBuildMode,
}) {
  // tip selectat în UI
  const [currentType, setCurrentType] = useState('road.segment');

  // UI: minimizare în FAB + drag poziție FAB
  const [minimized, setMinimized] = useState(false);
  const [fabPos, setFabPos] = useState({ x: 16, y: 16 }); // offset from right/bottom
  const dragRef = useRef(null);

  // menține controllerul sincronizat cu UI
  useEffect(() => {
    if (buildController && currentType) buildController.setType(currentType);
  }, [buildController, currentType]);

  useEffect(() => {
    if (buildController) buildController.setMode(buildMode);
  }, [buildController, buildMode]);

  if (!open) return null;

  const items = getProps?.() || [];
  const selectedId = buildController?.getSelectedId?.();

  /* -------------------- MINIMIZED FAB -------------------- */
  if (minimized) {
    const ring = buildActive ? '#10b981' : '#ef4444';

    const startDrag = (e) => {
      const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
      dragRef.current = { sx: p.clientX, sy: p.clientY, bx: fabPos.x, by: fabPos.y };
      e.preventDefault?.();
    };
    const onDrag = (e) => {
      if (!dragRef.current) return;
      const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
      const dx = p.clientX - dragRef.current.sx;
      const dy = p.clientY - dragRef.current.sy;
      setFabPos({
        x: Math.max(8, dragRef.current.bx - dx),
        y: Math.max(8, dragRef.current.by - dy),
      });
    };
    const endDrag = () => { dragRef.current = null; };

    return (
      <div
        data-build-ui="true"
        style={{ position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'none' }}
        onMouseMove={onDrag}
        onMouseUp={endDrag}
        onTouchMove={onDrag}
        onTouchEnd={endDrag}
      >
        <button
          title={buildActive ? 'Build ON — deschide paleta' : 'Build OFF — deschide paleta'}
          onClick={() => setMinimized(false)}
          data-build-ui="true"
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          style={{
            position: 'absolute',
            right: fabPos.x, bottom: fabPos.y,
            width: 64, height: 64, borderRadius: 32,
            border: `2px solid ${ring}`,
            background: '#0b1220', color: '#fff',
            fontSize: 26, fontWeight: 800,
            boxShadow: '0 8px 24px rgba(0,0,0,.45)',
            pointerEvents: 'auto'
          }}
        >
          🧱
        </button>

        {/* când e minimizat, oferim MovePad separat pentru deplasarea selecției */}
        <MovePad controller={buildController} />
      </div>
    );
  }

  /* -------------------- FULL PANEL -------------------- */
  return (
    <div
      data-build-ui="true"
      style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
      }}
    >
      <div style={{
        position: 'relative',
        width: 'min(740px, 96vw)', background: '#0b1220', color: '#fff',
        borderRadius: 12, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,.4)'
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Build Mode</h3>
            <span style={{
              padding: '4px 8px', borderRadius: 999,
              background: buildActive ? '#10b981' : '#374151',
              color: buildActive ? '#06281e' : '#cbd5e1',
              fontSize: 12, fontWeight: 700
            }}>{buildActive ? 'ACTIVE' : 'OFF'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              title="Minimize"
              onClick={() => setMinimized(true)}
              style={{ fontSize: 16, background: '#0f172a', color: '#cbd5e1', border: '1px solid #1f2a44', borderRadius: 8, padding: '6px 10px' }}
            >—</button>
            <button
              onClick={onClose}
              style={{ fontSize: 18, background: 'transparent', color: '#fff', border: 'none' }}
              title="Închide paleta"
            >✕</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* stânga: tip + mod */}
          <div style={{ border: '1px solid #1f2a44', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 13, opacity: .85, marginBottom: 8 }}>Tip obiect</div>
            <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflow: 'auto', paddingRight: 6 }}>
              {PROP_TYPES.map(p => (
                <label key={p.key} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: currentType === p.key ? '#1f2937' : 'transparent',
                  padding: '6px 8px', borderRadius: 8, cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="propType"
                    checked={currentType === p.key}
                    onChange={() => setCurrentType(p.key)}
                  />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setBuildMode('place')}
                style={{
                  height: 36, borderRadius: 8, border: '1px solid #1f2a44',
                  background: buildMode === 'place' ? '#10b981' : '#111827',
                  color: buildMode === 'place' ? '#06281e' : '#cbd5e1',
                  padding: '0 10px', fontWeight: 700
                }}
              >Place</button>
              <button
                onClick={() => setBuildMode('remove')}
                style={{
                  height: 36, borderRadius: 8, border: '1px solid #1f2a44',
                  background: buildMode === 'remove' ? '#ef4444' : '#111827',
                  color: buildMode === 'remove' ? '#fff' : '#cbd5e1',
                  padding: '0 10px', fontWeight: 700
                }}
              >Remove</button>
              <button
                onClick={() => buildController?.rotateStep(1)}
                style={{
                  height: 36, borderRadius: 8, border: '1px solid #1f2a44',
                  background: '#111827', color: '#cbd5e1', padding: '0 10px'
                }}
              >↻ Rotate</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => setBuildActive(v => !v)}
                style={{
                  width: '100%', height: 40, borderRadius: 8, border: 'none',
                  background: buildActive ? '#ef4444' : '#10b981',
                  color: buildActive ? '#fff' : '#06281e',
                  fontWeight: 800
                }}
              >{buildActive ? 'OPREȘTE BUILD MODE' : 'PORNEȘTE BUILD MODE'}</button>
            </div>
          </div>

          {/* dreapta: listă + export */}
          <div style={{ position: 'relative', border: '1px solid #1f2a44', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, opacity: .85 }}>Obiecte plasate</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    const blob = new Blob([exportJSON()], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'world-edits.json'; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{ height: 30, borderRadius: 6, border: '1px solid #1f2a44', background: '#111827', color: '#cbd5e1', padding: '0 8px' }}
                >Export JSON</button>
                <button
                  onClick={() => {
                    const blob = new Blob([exportCSV()], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'world-edits.csv'; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{ height: 30, borderRadius: 6, border: '1px solid #1f2a44', background: '#111827', color: '#cbd5e1', padding: '0 8px' }}
                >Export CSV</button>
              </div>
            </div>

            <div style={{
              maxHeight: 260, overflow: 'auto', padding: 8,
              background: '#0a1322', border: '1px dashed #1f2a44', borderRadius: 8
            }}>
              {(!items || !items.length) && (
                <div style={{ opacity: .65, fontSize: 13 }}>
                  Nimic plasat încă. Pornește „Build Mode”, alege un tip și atinge/click pe teren.
                </div>
              )}

              {items && items.length > 0 && items.map(it => {
                const active = selectedId === it.id;
                return (
                  <div
                    key={it.id}
                    onClick={() => buildController?.setSelectedId?.(it.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        buildController?.setSelectedId?.(it.id);
                      }
                    }}
                    style={{
                      cursor: 'pointer',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      padding: '6px 8px', marginBottom: 6,
                      borderRadius: 6,
                      background: active ? '#22c55e33' : '#0f1b2f',
                      outline: 'none'
                    }}
                    aria-pressed={active}
                    role="button"
                  >
                    <div style={{ fontSize: 13 }}>
                      <div>
                        <b>{it.type}</b>
                        <span style={{ opacity: .7 }}> (id: {it.id.slice(0, 8)}…)</span>
                      </div>
                      <div style={{ opacity: .8 }}>
                        pos: [{it.pos.map(n => Number(n).toFixed(2)).join(', ')}], rotY: {Number(it.rotY).toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MovePad ancorat lângă listă */}
            <MovePad controller={buildController} />
          </div>
        </div>
      </div>
    </div>
  );
}