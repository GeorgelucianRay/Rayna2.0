// src/components/depot/map/Map3DPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Map3DStandalone.module.css';

import Navbar3D from './Navbar3D';
import ContainerInfoCard from './ContainerInfoCard';
import { useDepotScene } from './scene/useDepotScene';
import FPControls from './ui/FPControls';
import BuildPalette from './build/BuildPalette';

export default function Map3DPage() {
  const navigate = useNavigate();
  const mountRef = useRef(null);

  const [showBuild, setShowBuild] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);

  const {
    isFP,
    setFPEnabled,
    setForwardPressed,
    setJoystick,
    setBuildActive,
    buildApi,
    containers,
    openWorldItems,
    setOnContainerSelected,
    focusCameraOnContainer,

    zoomIn,
    zoomOut,
    recenter,

    isOrbitLibre,
    startOrbitLibre,
    stopOrbitLibre,
  } = useDepotScene({ mountRef });

  useEffect(() => {
    setOnContainerSelected((selected) => setSelectedContainer(selected));
  }, [setOnContainerSelected]);

  return (
    <div className={styles.fullscreenRoot}>
      {/* ✅ Navbar3D rămâne (dock + search + FP + build + items) */}
      <Navbar3D
        containers={containers}
        onSelectContainer={(c) => {
          setSelectedContainer(c);
          if (isOrbitLibre) stopOrbitLibre();
          setFPEnabled(false);
          focusCameraOnContainer?.(c, { smooth: true });
        }}
        onToggleFP={() => setFPEnabled((prev) => !prev)}
        onAdd={(data) => console.log('Add from Navbar3D', data)}
        onOpenBuild={() => { setShowBuild(true); setBuildActive(true); }}
        onOpenWorldItems={() => openWorldItems()}
      />

      {/* ✅ Top bar (zoom/orbit/close) – NU afectează Navbar3D */}
      <div className={styles.topBar}>
        <div className={styles.topBarRight}>
          <button className={styles.iconBtn} onClick={zoomIn} title="Zoom +" aria-label="Zoom in">＋</button>
          <button className={styles.iconBtn} onClick={zoomOut} title="Zoom -" aria-label="Zoom out">−</button>
          <button className={styles.iconBtn} onClick={recenter} title="Recenter" aria-label="Recenter">⦿</button>

          <button
            className={`${styles.iconBtn} ${styles.iconBtnSmall} ${isOrbitLibre ? styles.active : ''}`}
            onClick={() =>
              isOrbitLibre
                ? stopOrbitLibre()
                : startOrbitLibre({ speed: Math.PI / 32, height: 9 })
            }
            title={isOrbitLibre ? 'Oprește orbit libre' : 'Pornește orbit libre'}
            aria-label="Orbit libre"
          >
            ⟳
          </button>

          <button className={styles.iconBtn} onClick={() => navigate('/depot')} aria-label="Close" title="Înapoi">
            ✕
          </button>
        </div>
      </div>

      {/* Canvas host */}
      <div ref={mountRef} className={styles.canvasHost} />

      {/* FP Controls */}
      {isFP && (
        <FPControls
          ensureFP={() => setFPEnabled(true)}
          setForwardPressed={setForwardPressed}
          setJoystick={setJoystick}
        />
      )}

      {/* Build Palette */}
      {showBuild && (
        <BuildPalette
          open={showBuild}
          onClose={() => { setShowBuild(false); setBuildActive(false); }}
          buildController={buildApi.controller}
          buildActive={buildApi.active}
          setBuildActive={setBuildActive}
          buildMode={buildApi.mode}
          setBuildMode={buildApi.setMode}
        />
      )}

      {/* Container Info Card (tap pe container în scenă) */}
      <ContainerInfoCard container={selectedContainer} onClose={() => setSelectedContainer(null)} />
    </div>
  );
}