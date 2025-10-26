// src/components/depot/map/Navbar3D.jsx
import React, { useState } from 'react';
import SearchBox from './SearchBox';
import styles from './Map3DStandalone.module.css';

/** Buton rotund mic (icon only) */
function IconBtn({ title, onClick, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 44, height: 44, borderRadius: 22,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'transparent', color: '#fff', fontSize: 22
      }}
      aria-label={title}
    >
      {children}
    </button>
  );
}

/** Modal “Add item” – adaptează câmpurile după formularul tău din Depot */
function AddItemModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({ matricula: '', lane: 'A', index: '1', tier: 'A' });
  if (!open) return null;

  return (
    <div style={{
      position:'absolute', inset:0, background:'rgba(0,0,0,.45)', zIndex:20,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16
    }}>
      <div style={{
        width:'min(440px, 94vw)', background:'#111827', color:'#fff',
        borderRadius:12, padding:16, boxShadow:'0 10px 30px rgba(0,0,0,.4)'
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
          <h3 style={{margin:0, fontSize:18}}>Adaugă container</h3>
          <button onClick={onClose} style={{fontSize:20, background:'transparent', color:'#fff', border:'none'}}>✕</button>
        </div>

        <label style={{display:'grid', gap:6, fontSize:13, marginBottom:10}}>
          <span style={{opacity:.85}}>Matriculă</span>
          <input
            value={form.matricula}
            onChange={e=>setForm({...form, matricula:e.target.value})}
            style={{background:'#0b1220', border:'1px solid #1f2a44', borderRadius:8, padding:'8px 10px', color:'#fff'}}
          />
        </label>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10}}>
          <label style={{display:'grid', gap:6, fontSize:13}}>
            <span style={{opacity:.85}}>Coloană (A–F)</span>
            <input
              value={form.lane}
              onChange={e=>setForm({...form, lane:e.target.value.toUpperCase()})}
              style={{background:'#0b1220', border:'1px solid #1f2a44', borderRadius:8, padding:'8px 10px', color:'#fff'}}
            />
          </label>
          <label style={{display:'grid', gap:6, fontSize:13}}>
            <span style={{opacity:.85}}>Index (1–20)</span>
            <input
              type="number" min="1" max="20"
              value={form.index}
              onChange={e=>setForm({...form, index:e.target.value})}
              style={{background:'#0b1220', border:'1px solid #1f2a44', borderRadius:8, padding:'8px 10px', color:'#fff'}}
            />
          </label>
        </div>

        <label style={{display:'grid', gap:6, fontSize:13}}>
          <span style={{opacity:.85}}>Tier (A–F)</span>
          <input
            value={form.tier}
            onChange={e=>setForm({...form, tier:e.target.value.toUpperCase()})}
            style={{background:'#0b1220', border:'1px solid #1f2a44', borderRadius:8, padding:'8px 10px', color:'#fff'}}
          />
        </label>

        <button
          onClick={()=>onSubmit?.(form)}
          style={{marginTop:12, width:'100%', height:42, borderRadius:8, border:'none', background:'#10b981', color:'#06281e', fontWeight:700}}
        >Salvează</button>
      </div>
    </div>
  );
}

/**
 * Navbar3D – mini tools dock
 * Props:
 *  - containers: array pentru căutare
 *  - onSelectContainer(container)
 *  - onToggleFP()  ← pornește/oprește First-Person
 *  - onAdd(form)   ← trimite formularul “Add”
 */
export default function Navbar3D({
  containers = [],
  onSelectContainer,
  onToggleFP,
  onAdd
}) {
  const [dockOpen, setDockOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      {/* bara de căutare – controlată de 🔍 */}
      {searchOpen && (
        <div className={styles.searchContainer}>
          <SearchBox containers={containers} onContainerSelect={onSelectContainer} />
        </div>
      )}

      {/* FAB: Tools */}
      <button
        onClick={() => setDockOpen(v=>!v)}
        title="Tools"
        style={{
          position:'absolute', left:12, bottom:14, zIndex:6,
          width:52, height:52, borderRadius:26, border:'none',
          background:'#111827', color:'#fff', fontSize:24,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 2px 10px rgba(0,0,0,.3)'
        }}
      >🛠️</button>

      {/* Dock cu icon-uri */}
      {dockOpen && (
        <div style={{
          position:'absolute', left:72, bottom:14, zIndex:6,
          background:'rgba(17,24,39,.9)', borderRadius:28, padding:'6px 8px',
          display:'flex', gap:8, alignItems:'center', boxShadow:'0 2px 10px rgba(0,0,0,.35)'
        }}>
          <IconBtn title="Căutare" onClick={() => { setSearchOpen(v=>!v); setDockOpen(false); }}>🔍</IconBtn>
          <IconBtn title="Walk / First-Person" onClick={() => { onToggleFP?.(); setDockOpen(false); }}>👤</IconBtn>
          <IconBtn title="Adaugă" onClick={() => { setAddOpen(true); setDockOpen(false); }}>＋</IconBtn>
        </div>
      )}

      {/* Modal Add */}
      <AddItemModal
        open={addOpen}
        onClose={()=>setAddOpen(false)}
        onSubmit={(data)=>{ onAdd?.(data); }}
      />
    </>
  );
}