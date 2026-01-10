// src/components/depot/map/Navbar3D.jsx
import React, { useState } from 'react';
import SearchBox from './SearchBox';
import styles from './Map3DStandalone.module.css';

function IconBtn({ title, onClick, children }) {
  return (
    <button
      className={styles.dockIconBtn}
      title={title}
      onClick={onClick}
      type="button"
      aria-label={title}
    >
      {children}
    </button>
  );
}

function AddItemModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '' });
  if (!open) return null;

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>Adaugă</h3>
          <button className={styles.modalClose} onClick={onClose} type="button">✕</button>
        </div>

        <label className={styles.modalField}>
          <span>Nume exemplu</span>
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className={styles.modalInput}
          />
        </label>

        <button
          onClick={() => onSubmit?.(form)}
          className={styles.modalPrimary}
          type="button"
        >
          Salvează
        </button>
      </div>
    </div>
  );
}

export default function Navbar3D({
  containers = [],
  onSelectContainer,
  onToggleFP,
  onAdd,
  onOpenBuild,
  onOpenWorldItems,
}) {
  const [dockOpen, setDockOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      {searchOpen && (
        <div className={styles.searchDock}>
          <SearchBox containers={containers} onContainerSelect={onSelectContainer} />
        </div>
      )}

      <button
        onClick={() => setDockOpen(v => !v)}
        className={styles.toolsFab}
        title="Tools"
        type="button"
        aria-label="Tools"
      >
        🛠️
      </button>

      {dockOpen && (
        <div className={styles.toolsDock}>
          <IconBtn title="Căutare" onClick={() => { setSearchOpen(v => !v); setDockOpen(false); }}>🔍</IconBtn>
          <IconBtn title="Walk / FP" onClick={() => { onToggleFP?.(); setDockOpen(false); }}>👤</IconBtn>
          <IconBtn title="Build" onClick={() => { onOpenBuild?.(); setDockOpen(false); }}>🧱</IconBtn>
          <IconBtn title="Items" onClick={() => { onOpenWorldItems?.(); setDockOpen(false); }}>📋</IconBtn>
          <IconBtn title="Adaugă" onClick={() => { setAddOpen(true); setDockOpen(false); }}>＋</IconBtn>
        </div>
      )}

      <AddItemModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={(data) => { onAdd?.(data); setAddOpen(false); }}
      />
    </>
  );
}