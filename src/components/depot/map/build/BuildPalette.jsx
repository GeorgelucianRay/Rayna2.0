// BuildPalette.jsx - UI pentru editarea hărții
import React, { useEffect, useState } from ‘react’;
import { PROP_TYPES } from ‘../world/propRegistry’;
import { getProps, exportJSON, exportCSV, subscribe, clearAllProps } from ‘../world/worldStore’;

export default function BuildPalette({
open,
onClose,
buildController,
buildActive,
setBuildActive,
buildMode,
setBuildMode,
}) {
const [currentType, setCurrentType] = useState(‘road.segment’);
const [minimized, setMinimized] = useState(false);
const [hint, setHint] = useState(’’);
const [items, setItems] = useState(getProps());

// Sincronizare store → UI
useEffect(() => {
const unsubscribe = subscribe(s => {
const sorted = s.props.slice().sort((a, b) => b.ts - a.ts);
setItems(sorted);
console.log(‘📋 Lista actualizată:’, sorted.length, ‘obiecte’);
});
return unsubscribe;
}, []);

// Sincronizare controller cu tipul curent
useEffect(() => {
if (buildController && currentType) {
buildController.setType(currentType);
console.log(‘🔧 Tip setat:’, currentType);
}
}, [buildController, currentType]);

// Sincronizare controller cu modul
useEffect(() => {
if (buildController) {
buildController.setMode(buildMode);
console.log(‘🔧 Mod setat:’, buildMode);
}
}, [buildController, buildMode]);

// Montează obiectele existente la pornire
useEffect(() => {
if (buildController) {
buildController.mountExistingFromStore();
}
}, [buildController]);

if (!open) return null;

const selectedId = buildController?.getSelectedId?.() || null;

// Componenta pentru mutare cu săgeți
const NudgePad = ({ floating = false }) => (
<div
data-build-ui=“true”
style={{
position: floating ? ‘fixed’ : ‘relative’,
right: floating ? 16 : undefined,
bottom: floating ? 92 : undefined,
display: ‘grid’,
gridTemplateColumns: ‘48px 48px 48px’,
gridTemplateRows: ‘48px 48px 48px’,
gap: 8,
justifyContent: ‘center’,
alignItems: ‘center’,
pointerEvents: ‘auto’,
zIndex: 35,
}}
>
<div />
<button onClick={() => buildController?.nudgeSelected(0, -1)} style={btnSq} title=“Sus”>↑</button>
<div />

```
  <button onClick={() => buildController?.nudgeSelected(-1, 0)} style={btnSq} title="Stânga">←</button>
  <button 
    onClick={() => buildController?.rotateStep(1)} 
    style={{ ...btnSq, background: '#10b981', color: '#06281e' }}
    title="Rotește"
  >↻</button>
  <button onClick={() => buildController?.nudgeSelected(1, 0)} style={btnSq} title="Dreapta">→</button>
  
  <div />
  <button onClick={() => buildController?.nudgeSelected(0, 1)} style={btnSq} title="Jos">↓</button>
  <div />
</div>
```

);

// FAB când panelul e minimizat
if (minimized) {
return (
<>
{selectedId && <NudgePad floating />}
<button
data-build-ui=“true”
onClick={() => setMinimized(false)}
title=“Deschide Build”
style={{
position: ‘fixed’,
right: 16,
bottom: 16,
width: 66,
height: 66,
borderRadius: 33,
border: ’2px solid ’ + (buildActive ? ‘#10b981’ : ‘#ef4444’),
background: ‘#0b1220’,
color: ‘#fff’,
fontSize: 26,
fontWeight: 800,
boxShadow: ‘0 8px 24px rgba(0,0,0,.45)’,
zIndex: 36,
cursor: ‘pointer’,
}}
>
🧱
</button>
</>
);
}

return (
<div data-build-ui="true" style={backdrop}>
<div style={panel}>
{/* Header */}
<div style={hdr}>
<div style={{ display: ‘flex’, gap: 10, alignItems: ‘center’ }}>
<h3 style={{ margin: 0, fontSize: 20 }}>Build Mode</h3>
<span style={pill(buildActive)}>
{buildActive ? ‘ACTIV’ : ‘OPRIT’}
</span>
</div>
<div style={{ display: ‘flex’, gap: 8 }}>
<button
onClick={() => setMinimized(true)}
title=“Minimizează”
style={btnMini}
>
—
</button>
<button onClick={onClose} title="Închide" style={btnClose}>
✕
</button>
</div>
</div>

```
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* STÂNGA: Tipuri + Moduri */}
      <div style={card}>
        <div style={label}>Tip obiect</div>
        <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflow: 'auto', paddingRight: 6 }}>
          {PROP_TYPES.map(p => (
            <label key={p.key} style={row(currentType === p.key)}>
              <input
                type="radio"
                name="propType"
                checked={currentType === p.key}
                onChange={() => {
                  setCurrentType(p.key);
                  console.log('🎨 Tip selectat:', p.key);
                }}
              />
              <span>{p.label}</span>
            </label>
          ))}
        </div>

        {/* Butoane Place / Remove */}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              setBuildMode('place');
              setBuildActive(true);
              setHint('✅ Click pe hartă pentru a plasa ' + currentType);
            }}
            style={btn(buildMode === 'place', '#10b981', '#06281e')}
          >
            🎯 Place
          </button>

          <button
            onClick={() => {
              setBuildMode('remove');
              setBuildActive(true);
              setHint('🗑️ Click pe obiect pentru a șterge');
            }}
            style={btn(buildMode === 'remove', '#ef4444', '#fff')}
          >
            🗑️ Remove
          </button>
        </div>

        {/* Rotire preview */}
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => {
              buildController?.rotateStep(1);
              setHint('↻ Preview rotit cu 90°');
            }}
            style={btn(false, '#111827', '#cbd5e1', true)}
          >
            ⟳ Rotește preview
          </button>
        </div>

        {/* Toggle Build Mode */}
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => {
              const newState = !buildActive;
              setBuildActive(newState);
              setHint(newState ? '✅ Build activ' : '⏸️ Build oprit');
            }}
            style={bigBtn(buildActive)}
          >
            {buildActive ? '⏸️ OPREȘTE BUILD' : '▶️ PORNEȘTE BUILD'}
          </button>
        </div>

        {/* Hint */}
        {hint && (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8, color: '#a5b4fc' }}>
            💡 {hint}
          </div>
        )}
      </div>

      {/* DREAPTA: Lista + Export */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={label}>
            Obiecte plasate ({items.length})
          </div>
          <button
            onClick={() => {
              if (window.confirm('Ștergi TOATE obiectele? (nu se poate anula)')) {
                clearAllProps();
                setHint('🧹 Toate obiectele șterse');
              }
            }}
            style={{ ...btnSq, background: '#ef4444', color: '#fff', fontSize: 14 }}
            title="Șterge tot"
          >
            🧹
          </button>
        </div>

        {/* Export buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              const json = exportJSON();
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `world-edits-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
              setHint('📥 JSON exportat');
              console.log('📥 Export JSON:', json);
            }}
            style={btnSq}
          >
            📄 JSON
          </button>
          <button
            onClick={() => {
              const csv = exportCSV();
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `world-edits-${Date.now()}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              setHint('📊 CSV exportat');
              console.log('📊 Export CSV:', csv);
            }}
            style={btnSq}
          >
            📊 CSV
          </button>
        </div>

        {/* Lista obiecte */}
        <div style={listBox}>
          {items.length === 0 && (
            <div style={{ opacity: 0.65, fontSize: 13, textAlign: 'center', padding: 20 }}>
              📭 Nimic plasat încă
            </div>
          )}
          {items.map(it => (
            <div
              key={it.id}
              onClick={() => {
                buildController?.setSelectedId?.(it.id);
                setHint(`✅ Selectat: ${it.type}`);
              }}
              style={itemRow(selectedId === it.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{it.type}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Ștergi ${it.type}?`)) {
                      buildController?.setSelectedId?.(it.id);
                      setBuildMode('remove');
                      buildController?.clickAt?.(0, 0); // Trigger remove
                    }
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 18, cursor: 'pointer' }}
                  title="Șterge"
                >
                  🗑️
                </button>
              </div>
              <div style={{ opacity: 0.8, fontSize: 11, marginTop: 4 }}>
                🆔 {it.id.slice(0, 8)}...
              </div>
              <div style={{ opacity: 0.7, fontSize: 11 }}>
                📍 [{it.pos.map(n => Number(n).toFixed(2)).join(', ')}]
              </div>
              <div style={{ opacity: 0.7, fontSize: 11 }}>
                ↻ {Number(it.rotY || 0).toFixed(2)} rad
              </div>
            </div>
          ))}
        </div>

        {/* Săgeți pentru obiectul selectat */}
        {selectedId && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6, textAlign: 'center' }}>
              🎮 Mută obiectul selectat:
            </div>
            <NudgePad />
          </div>
        )}
      </div>
    </div>
  </div>
</div>
```

);
}

/* –– STILURI –– */
const backdrop = {
position: ‘absolute’,
inset: 0,
background: ‘rgba(0,0,0,.5)’,
zIndex: 30,
display: ‘flex’,
alignItems: ‘center’,
justifyContent: ‘center’,
padding: 16,
backdropFilter: ‘blur(2px)’,
};

const panel = {
width: ‘min(800px, 96vw)’,
background: ‘#0b1220’,
color: ‘#fff’,
borderRadius: 12,
padding: 16,
boxShadow: ‘0 10px 30px rgba(0,0,0,.6)’,
maxHeight: ‘90vh’,
overflow: ‘auto’,
};

const hdr = {
display: ‘flex’,
alignItems: ‘center’,
justifyContent: ‘space-between’,
marginBottom: 12,
};

const card = {
border: ‘1px solid #1f2a44’,
borderRadius: 10,
padding: 12,
background: ‘#111827’,
};

const label = {
fontSize: 13,
opacity: 0.85,
marginBottom: 8,
fontWeight: 600,
};

const row = (active) => ({
display: ‘flex’,
alignItems: ‘center’,
gap: 8,
background: active ? ‘#1f2937’ : ‘transparent’,
padding: ‘6px 8px’,
borderRadius: 8,
cursor: ‘pointer’,
transition: ‘all 0.2s’,
});

const pill = (on) => ({
padding: ‘4px 8px’,
borderRadius: 999,
background: on ? ‘#10b981’ : ‘#374151’,
color: on ? ‘#06281e’ : ‘#cbd5e1’,
fontSize: 12,
fontWeight: 700,
});

const btn = (on, bgOn, colOn, ghost = false) => ({
flex: 1,
height: 36,
borderRadius: 8,
border: ‘1px solid #1f2a44’,
background: on ? bgOn : (ghost ? ‘#111827’ : ‘#0f172a’),
color: on ? colOn : ‘#cbd5e1’,
padding: ‘0 12px’,
fontWeight: 700,
cursor: ‘pointer’,
transition: ‘all 0.2s’,
});

const bigBtn = (on) => ({
width: ‘100%’,
height: 44,
borderRadius: 8,
border: ‘none’,
background: on ? ‘#ef4444’ : ‘#10b981’,
color: on ? ‘#fff’ : ‘#06281e’,
fontWeight: 800,
cursor: ‘pointer’,
transition: ‘all 0.2s’,
});

const btnClose = {
fontSize: 18,
background: ‘transparent’,
color: ‘#fff’,
border: ‘none’,
cursor: ‘pointer’,
};

const btnMini = {
fontSize: 16,
background: ‘#0f172a’,
color: ‘#cbd5e1’,
border: ‘1px solid #1f2a44’,
borderRadius: 8,
padding: ‘6px 10px’,
cursor: ‘pointer’,
};

const listBox = {
maxHeight: 300,
overflow: ‘auto’,
padding: 8,
background: ‘#0a1322’,
border: ‘1px dashed #1f2a44’,
borderRadius: 8,
};

const itemRow = (sel) => ({
padding: ‘8px 10px’,
marginBottom: 8,
borderRadius: 8,
background: sel ? ‘#17324b’ : ‘#0f1b2f’,
cursor: ‘pointer’,
border: sel ? ‘2px solid #22c55e’ : ‘1px solid transparent’,
transition: ‘all 0.2s’,
});

const btnSq = {
height: 40,
minWidth: 40,
borderRadius: 8,
border: ‘1px solid #1f2a44’,
background: ‘#111827’,
color: ‘#cbd5e1’,
padding: ‘0 10px’,
fontWeight: 700,
cursor: ‘pointer’,
transition: ‘all 0.2s’,
fontSize: 14,
};