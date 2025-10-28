// src/components/depot/map/build/BuildPalette.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const [minimized, setMinimized] = useState(false);
  const [fabPos, setFabPos] = useState({ x: 16, y: 16 }); // distanță față de colțul DREAPTA-JOS
  const dragRef = useRef(null);

  // ——— sincronizări cu controllerul ———
  useEffect(() => {
    if (buildController && currentType) buildController.setType(currentType);
  }, [buildController, currentType]);

  useEffect(() => {
    if (buildController) buildController.setMode(buildMode);
  }, [buildController, buildMode]);

  const items = useMemo(() => getProps() || [], []); // lista din store (edits)

  const selectedId = buildController?.getSelectedId?.() || null;
  const selectItem = (id) => buildController?.setSelectedId?.(id);

  // ——— Pad (săgeți + rotire) ———
  const Pad = ({ floating = false }) => {
    const step = 1;       // 1m pe apăsare
    const rotStep = 90;   // 90° pe apăsare

    const btn = (label, onClick, extra = {}) => (
      <button
        data-build-ui="true"
        onClick={onClick}
        style={{
          width: 64, height: 64, borderRadius: 12,
          background: '#0f172a', color: '#cbd5e1',
          border: '1px solid #1f2a44', fontSize: 24, fontWeight: 800,
          display: 'grid', placeItems: 'center',
          ...extra,
        }}
      >
        {label}
      </button>
    );

    return (
      <div
        data-build-ui="true"
        style={{
          position: floating ? 'fixed' : 'absolute',
          right: floating ? 16 : -88,             // când panoul e deschis: pad-ul stă puțin în afara lui (dreapta)
          top: floating ? '50%' : 'calc(50% - 32px)',
          transform: 'translateY(-50%)',
          zIndex: 31,
          display: 'grid',
          gridTemplateAreas: `
            ".    up    ."
            "left rot  right"
            ".   down   ."
          `,
          gap: 10,
          pointerEvents: 'auto',
        }}
      >
        <div style={{ gridArea: 'up'    }}>{btn('↑', () => buildController?.nudgeSelected?.(0, -step))}</div>
        <div style={{ gridArea: 'left'  }}>{btn('←', () => buildController?.nudgeSelected?.(-step, 0))}</div>
        <div style={{ gridArea: 'right' }}>{btn('→', () => buildController?.nudgeSelected?.( step, 0))}</div>
        <div style={{ gridArea: 'down'  }}>{btn('↓', () => buildController?.nudgeSelected?.(0,  step))}</div>
        <div style={{ gridArea: 'rot'   }}>
          {btn(
            '↻',
            () => buildController?.rotateSelected?.(rotStep),
            { background: '#10b981', color: '#06281e', borderColor: '#10b981' }
          )}
        </div>
      </div>
    );
  };

  // ——— FAB când e minimizat ———
  if (!open) return null;

  if (minimized) {
    const ring = buildActive ? '#10b981' : '#ef4444';

    const onStart = (e) => {
      const p = e.touches?.[0] || e;
      dragRef.current = { sx: p.clientX, sy: p.clientY, bx: fabPos.x, by: fabPos.y };
      e.preventDefault?.();
    };
    const onMove = (e) => {
      if (!dragRef.current) return;
      const p = e.touches?.[0] || e;
      const dx = p.clientX - dragRef.current.sx;
      const dy = p.clientY - dragRef.current.sy;
      setFabPos({ x: Math.max(8, dragRef.current.bx - dx), y: Math.max(8, dragRef.current.by - dy) });
    };
    const onEnd = () => { dragRef.current = null; };

    return (
      <>
        {/* pad flotant (în scenă) */}
        <Pad floating />

        {/* container invizibil pt drag */}
        <div
          data-build-ui="true"
          onMouseMove={onMove}
          onMouseUp={onEnd}
          onTouchMove={onMove}
          onTouchEnd={onEnd}
          style={{ position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'none' }}
        />

        {/* FAB */}
        <button
          data-build-ui="true"
          onMouseDown={onStart}
          onTouchStart={onStart}
          onClick={() => setMinimized(false)}
          title={buildActive ? 'Build ON – deschide paleta' : 'Build OFF – deschide paleta'}
          style={{
            position: 'fixed',
            right: fabPos.x, bottom: fabPos.y,
            width: 64, height: 64, borderRadius: 32,
            background: '#0b1220', color: '#fff',
            border: `2px solid ${ring}`,
            boxShadow: '0 8px 24px rgba(0,0,0,.45)',
            fontSize: 26, fontWeight: 800, zIndex: 32,
          }}
        >
          🧱
        </button>
      </>
    );
  }

  // ——— Panoul principal ———
  return (
    <div
      data-build-ui="true"
      style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{
        position: 'relative',   // ca să putem ancora pad-ul lângă panou
        width: 'min(760px, 96vw)', background: '#0b1220', color: '#fff',
        borderRadius: 12, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,.4)',
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Build Mode</h3>
            <span style={{
              padding: '4px 8px', borderRadius: 999,
              background: buildActive ? '#10b981' : '#374151',
              color: buildActive ? '#06281e' : '#cbd5e1',
              fontSize: 12, fontWeight: 700,
            }}>
              {buildActive ? 'ACTIVE' : 'OFF'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              title="Minimize"
              onClick={() => setMinimized(true)}
              style={{ fontSize: 16, background: '#0f172a', color: '#cbd5e1', border: '1px solid #1f2a44', borderRadius: 8, padding: '6px 10px' }}
            >—</button>
            <button
              onClick={onClose}
              title="Închide paleta"
              style={{ fontSize: 18, background: 'transparent', color: '#fff', border: 'none' }}
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
                  padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
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
                  padding: '0 10px', fontWeight: 700,
                }}
              >Place</button>
              <button
                onClick={() => setBuildMode('remove')}
                style={{
                  height: 36, borderRadius: 8, border: '1px solid #1f2a44',
                  background: buildMode === 'remove' ? '#ef4444' : '#111827',
                  color: buildMode === 'remove' ? '#fff' : '#cbd5e1',
                  padding: '0 10px', fontWeight: 700,
                }}
              >Remove</button>
              <button
                onClick={() => buildController?.rotateStep?.(1)}
                style={{
                  height: 36, borderRadius: 8, border: '1px solid #1f2a44',
                  background: '#111827', color: '#cbd5e1', padding: '0 10px',
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
                  fontWeight: 800,
                }}
              >{buildActive ? 'OPREȘTE BUILD MODE' : 'PORNEȘTE BUILD MODE'}</button>
            </div>
          </div>

          {/* dreapta: listă de obiecte noi + export */}
          <div style={{ border: '1px solid #1f2a44', borderRadius: 10, padding: 12, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, opacity: .85 }}>Obiecte plasate (edits)</div>
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
              background: '#0a1322', border: '1px dashed #1f2a44', borderRadius: 8,
            }}>
              {(!items || items.length === 0) && (
                <div style={{ opacity: .65, fontSize: 13 }}>
                  Nimic plasat încă. Pornește „Build Mode”, alege un tip și atinge/click pe teren.
                </div>
              )}
              {items && items.length > 0 && items.map(it => {
                const isSel = selectedId === it.id;
                return (
                  <div
                    key={it.id}
                    onClick={() => selectItem(it.id)}
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), selectItem(it.id))}
                    style={{
                      cursor: 'pointer',
                      padding: '8px 10px', marginBottom: 6,
                      borderRadius: 8,
                      background: isSel ? '#22c55e33' : '#0f1b2f',
                      border: isSel ? '1px solid #22c55e' : '1px solid transparent',
                    }}
                    role="button"
                    aria-pressed={isSel}
                  >
                    <div style={{ fontSize: 13, lineHeight: 1.3 }}>
                      <div><b>{it.type}</b> <span style={{ opacity: .7 }}>(id: {it.id.slice(0, 8)}…)</span></div>
                      <div style={{ opacity: .8 }}>
                        pos: [{it.pos.map(n => Number(n).toFixed(2)).join(', ')}], rotY: {Number(it.rotY).toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pad ancorat lângă panou (în timp ce panoul e deschis) */}
            <Pad />
          </div>
        </div>
      </div>
    </div>
  );
}