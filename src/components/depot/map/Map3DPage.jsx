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

  // ✅ ADĂUGAT
  showSelectedMarker,
  zoomIn,
  zoomOut,
  recenter,

  isOrbitLibre,
  startOrbitLibre,
  stopOrbitLibre,
} = useDepotScene({ mountRef });

  useEffect(() => {
    setOnContainerSelected(selected => setSelectedContainer(selected));
  }, [setOnContainerSelected]);

  return (
    <div className={styles.root}>
      {/* Canvas host */}
      <div ref={mountRef} className={styles.canvasHost} />

      {/* TOP APP BAR (Stich style) */}
      <header className={styles.appBar}>
        <div className={styles.appBarLeft}>
          <button
            className={styles.appIconBtn}
            onClick={() => navigate('/depot')}
            aria-label="Volver a Depósito"
            title="Volver"
          >
            ←
          </button>

          <div className={styles.appTitles}>
            <div className={styles.appTitle}>Rayna 2.0</div>
            <div className={styles.appSubtitle}>Mapa 3D • Depósito</div>
          </div>
        </div>

        <div className={styles.appBarRight}>
          <button
            className={`${styles.appIconBtn} ${isOrbitLibre ? styles.isActive : ''}`}
            onClick={() =>
              isOrbitLibre
                ? stopOrbitLibre()
                : startOrbitLibre({ speed: Math.PI / 32, height: 9 })
            }
            aria-label="Orbit libre"
            title={isOrbitLibre ? 'Oprește orbit' : 'Pornește orbit'}
          >
            ⟳
          </button>

          <button
            className={styles.appIconBtn}
            onClick={() => openWorldItems()}
            aria-label="Items"
            title="Items"
          >
            ☰
          </button>
        </div>
      </header>

      {/* Navbar tools dock (FAB + dock + search) */}
      <Navbar3D
        containers={containers}
        onSelectContainer={(c) => {
          setSelectedContainer(c);
          if (isOrbitLibre) stopOrbitLibre();
          setFPEnabled(false);
          focusCameraOnContainer?.(c, { smooth: true });
        }}
        onToggleFP={() => setFPEnabled(prev => !prev)}
        onAdd={(data) => console.log('Add from Navbar3D', data)}
        onOpenBuild={() => { setShowBuild(true); setBuildActive(true); }}
        onOpenWorldItems={() => openWorldItems()}
      />

      {/* Controls mobile FP */}
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

      {/* Card info container */}
      <ContainerInfoCard
        container={selectedContainer}
        onClose={() => setSelectedContainer(null)}
      />
    </div>
  );
}