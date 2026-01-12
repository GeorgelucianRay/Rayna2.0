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

// ✅ refolosit pt + și - (entrada/salida)
function AddItemModal({ open, onClose, onSubmit, title = 'Adaugă', mode = 'entrada' }) {
  const [form, setForm] = useState({ name: '' });
  if (!open) return null;

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.modalClose} onClick={onClose} type="button">✕</button>
        </div>

        <label className={styles.modalField}>
          <span>Container</span>
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className={styles.modalInput}
            placeholder="ex: MSCU1234567"
          />
        </label>

        <button
          onClick={() => onSubmit?.({ ...form, mode })}
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
  variant = 'fab', // 'fab' (jos) sau 'panel' (în burger top-down)
  onRequestClose,  // opțional: închide burger-ul după click
}) {
  const isPanel = variant === 'panel';

  const [dockOpen, setDockOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // ✅ + / - modals
  const [addOpen, setAddOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  // ✅ în panel: dock-ul e deschis by default
  useEffect(() => {
    if (isPanel) setDockOpen(true);
  }, [isPanel]);

  const closeAll = () => {
    setDockOpen(false);
    setSearchOpen(false);
    setAddOpen(false);
    setExitOpen(false);
    onRequestClose?.();
  };

  const closeDockIfFab = () => {
    if (!isPanel) setDockOpen(false);
  };

  return (
    <div className={isPanel ? styles.navPanel : undefined}>
      {/* ✅ SEARCH: în panel -> în flow (sub dock), în fab -> overlay (cum era) */}
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

      {/* ✅ FAB doar în modul jos */}
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

      {/* ✅ Dock: în panel e în flow, în fab e ca înainte */}
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
            onClick={() => {
              onToggleFP?.();
              if (isPanel) closeAll();
              else closeDockIfFab();
            }}
          >
            👤
          </IconBtn>

          <IconBtn
            title="Build"
            className={isPanel ? styles.dockIconBtnPanel : styles.dockIconBtn}
            onClick={() => {
              onOpenBuild?.();
              if (isPanel) closeAll();
              else closeDockIfFab();
            }}
          >
            🧱
          </IconBtn>

          <IconBtn
            title="Items"
            className={isPanel ? styles.dockIconBtnPanel : styles.dockIconBtn}
            onClick={() => {
              onOpenWorldItems?.();
              if (isPanel) closeAll();
              else closeDockIfFab();
            }}
          >
            📋
          </IconBtn>

          {/* ✅ + Entrada (verde) */}
          <IconBtn
            title="Entrada (+)"
            className={`${isPanel ? styles.dockIconBtnPanel : styles.dockIconBtn} ${styles.iconSphereGreen}`}
            onClick={() => {
              setAddOpen(true);
              closeDockIfFab();
            }}
          >
            ＋
          </IconBtn>

          {/* ✅ - Salida (roșu) */}
          <IconBtn
            title="Salida (-)"
            className={`${isPanel ? styles.dockIconBtnPanel : styles.dockIconBtn} ${styles.iconSphereRed}`}
            onClick={() => {
              setExitOpen(true);
              closeDockIfFab();
            }}
          >
            −
          </IconBtn>
        </div>
      )}

      {/* ✅ Modal + (entrada) */}
      <AddItemModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Entrada • Container"
        mode="entrada"
        onSubmit={(data) => {
          onAdd?.(data);     // data = { name, mode:"entrada" }
          setAddOpen(false);
          if (isPanel) closeAll();
        }}
      />

      {/* ✅ Modal - (salida) */}
      <AddItemModal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Salida • Container"
        mode="salida"
        onSubmit={(data) => {
          onAdd?.(data);     // data = { name, mode:"salida" }
          setExitOpen(false);
          if (isPanel) closeAll();
        }}
      />
    </div>
  );
}