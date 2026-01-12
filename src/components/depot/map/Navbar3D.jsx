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

export default function Navbar3D({
  containers = [],
  onSelectContainer,
  onToggleFP,
  onOpenBuild,
  onOpenWorldItems,

  // ✅ NOU (pentru modalele reale din Map3DPage)
  onOpenAddModal,   // + (Entrada)
  onOpenExitModal,  // - (Salida)

  // ✅ pentru burger top-down
  variant = 'fab',     // 'fab' sau 'panel'
  onRequestClose,      // închide burger/topMenu după click (opțional)
}) {
  const isPanel = variant === 'panel';

  const [dockOpen, setDockOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // în panel: dock deschis by default
  useEffect(() => {
    if (isPanel) setDockOpen(true);
  }, [isPanel]);

  const closePanelIfNeeded = () => {
    // În panel, închidem burger-ul
    if (isPanel) onRequestClose?.();
    // În fab, închidem dock-ul
    if (!isPanel) setDockOpen(false);
  };

  return (
    <div className={isPanel ? styles.navPanel : undefined}>
      {/* SEARCH: panel = în flow; fab = overlay */}
      {searchOpen && (
        <div className={isPanel ? styles.searchDockPanel : styles.searchDock}>
          <SearchBox
            containers={containers}
            onContainerSelect={(c) => {
              onSelectContainer?.(c);
              if (isPanel) onRequestClose?.();
            }}
          />
        </div>
      )}

      {/* FAB doar în modul jos */}
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
              closePanelIfNeeded();
            }}
          >
            👤
          </IconBtn>

          <IconBtn
            title="Build"
            className={isPanel ? styles.dockIconBtnPanel : styles.dockIconBtn}
            onClick={() => {
              onOpenBuild?.();
              closePanelIfNeeded();
            }}
          >
            🧱
          </IconBtn>

          <IconBtn
            title="Items"
            className={isPanel ? styles.dockIconBtnPanel : styles.dockIconBtn}
            onClick={() => {
              onOpenWorldItems?.();
              closePanelIfNeeded();
            }}
          >
            📋
          </IconBtn>

          {/* ✅ + = deschide AddContainerModal real (în Map3DPage) */}
          <IconBtn
            title="Entrada (+)"
            className={`${isPanel ? styles.dockIconBtnPanel : styles.dockIconBtn} ${styles.iconSphereGreen}`}
            onClick={() => {
              closePanelIfNeeded();     // ⬅️ închide navbar/burger imediat
              onOpenAddModal?.();       // ⬅️ deschide modalul plutitor real
            }}
          >
            ＋
          </IconBtn>

          {/* ✅ - = deschide modal “Salida” real (în Map3DPage) */}
          <IconBtn
            title="Salida (-)"
            className={`${isPanel ? styles.dockIconBtnPanel : styles.dockIconBtn} ${styles.iconSphereRed}`}
            onClick={() => {
              closePanelIfNeeded();     // ⬅️ închide navbar/burger imediat
              onOpenExitModal?.();      // ⬅️ deschide modalul plutitor real
            }}
          >
            −
          </IconBtn>
        </div>
      )}
    </div>
  );
}