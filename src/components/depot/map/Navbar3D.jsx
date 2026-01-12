// src/components/depot/map/Navbar3D.jsx
import React, { useState, useEffect } from 'react';
import SearchBox from './SearchBox';
import styles from './Map3DStandalone.module.css';

function IconBtn({ title, onClick, children, className }) {
  return (
    <button
      className={className || styles.dockIconBtn}
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

  // ✅ NOU
  variant = 'fab', // 'fab' (cum ai acum) sau 'panel' (pentru burger top-down)
  onRequestClose,  // opțional: ca să închizi burger-ul după click
}) {
  const isPanel = variant === 'panel';

  const [dockOpen, setDockOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // ✅ în panel: dock-ul e deschis by default
  useEffect(() => {
    if (isPanel) setDockOpen(true);
  }, [isPanel]);

  const closeAll = () => {
    setDockOpen(false);
    setSearchOpen(false);
    setAddOpen(false);
    onRequestClose?.();
  };

  return (
    <div className={isPanel ? `${styles.navPanel} ${searchOpen ? styles.navPanelWithSearch : ''}` : undefined}>
      {searchOpen && (
  <div className={isPanel ? styles.searchDockPanel : styles.searchDock}>
    <SearchBox
      containers={containers}
      onContainerSelect={(c) => {
        onSelectContainer?.(c);
        if (isPanel) closeAll();
      }}
    />
  </div>
      )}

      {/* ✅ FAB îl afișăm doar în modul "fab" (jos) */}
      {!isPanel && (
        <button
          onClick={() => setDockOpen(v => !v)}
          className={styles.toolsFab}
          title="Tools"
          type="button"
          aria-label="Tools"
        >
          🛠️
        </button>
      )}

      {/* ✅ Dock: în panel e mereu “în flow” (nu absolute jos) */}
      {(dockOpen || isPanel) && (
        <div className={isPanel ? styles.toolsDockPanel : styles.toolsDock}>
          <IconBtn
            title="Căutare"
            className={isPanel ? styles.dockIconBtnPanel : styles.dockIconBtn}
            onClick={() => setSearchOpen(v => !v)}
          >
            🔍
          </IconBtn>

          <IconBtn
            title="Walk / FP"
            className={isPanel ? styles.dockIconBtnPanel : styles.dockIconBtn}
            onClick={() => { onToggleFP?.(); if (isPanel) closeAll(); else setDockOpen(false); }}
          >
            👤
          </IconBtn>

          <IconBtn
            title="Build"
            className={isPanel ? styles.dockIconBtnPanel : styles.dockIconBtn}
            onClick={() => { onOpenBuild?.(); if (isPanel) closeAll(); else setDockOpen(false); }}
          >
            🧱
          </IconBtn>

          <IconBtn
            title="Items"
            className={isPanel ? styles.dockIconBtnPanel : styles.dockIconBtn}
            onClick={() => { onOpenWorldItems?.(); if (isPanel) closeAll(); else setDockOpen(false); }}
          >
            📋
          </IconBtn>

          <IconBtn
            title="Adaugă"
            className={isPanel ? styles.dockIconBtnPanel : styles.dockIconBtn}
            onClick={() => { setAddOpen(true); if (!isPanel) setDockOpen(false); }}
          >
            ＋
          </IconBtn>
        </div>
      )}

      <AddItemModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={(data) => { onAdd?.(data); setAddOpen(false); if (isPanel) closeAll(); }}
      />
    </div>
  );
}