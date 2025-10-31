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

  // UI State
  const [showBuild, setShowBuild] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);

  // Hook principal al scenei 3D
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

    // teleport camera la containerul selectat din search
    focusCameraOnContainer,

    // orbit libre
    isOrbitLibre,
    startOrbitLibre,
    stopOrbitLibre,
  } = useDepotScene({ mountRef });

  // Card info container selectat când dai click în scenă
  useEffect(() => {
    setOnContainerSelected(selected => setSelectedContainer(selected));
  }, [setOnContainerSelected]);

  return (
    <div className={styles.fullscreenRoot}>
      {/* Navbar */}
      <Navbar3D
        containers={containers}
        onSelectContainer={(c) => {
          // 1) afișează cardul
          setSelectedContainer(c);
          // 2) oprește auto-orbit (ca să nu-ți mute camera)
          if (isOrbitLibre) stopOrbitLibre();
          // 3) ieși din FP dacă e activ (ca să poți pilota cu Orbit spre țintă)
          setFPEnabled(false);
          // 4) focusează camera lin către container
          //    Poți ajusta durata/înălțimea dacă vrei (depinde de implementarea hook-ului tău)
          focusCameraOnContainer?.(c, { smooth: true });
        }}
        onToggleFP={() => setFPEnabled(prev => !prev)}
        onAdd={(data) => console.log('Add from Navbar3D', data)}
        onOpenBuild={() => { setShowBuild(true); setBuildActive(true); }}
        onOpenWorldItems={() => openWorldItems()}
      />

      {/* Top bar: Orbit libre + Exit (dreapta sus, paralel) */}
      <div className={styles.topBar}>
        <div className={styles.topBarRight}>
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

          <button
            className={styles.iconBtn}
            onClick={() => navigate('/depot')}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Canvas host */}
      <div ref={mountRef} className={styles.canvasHost} />

      {/* Controls mobile FP */}
      {isFP && (
        <FPControls
          ensureFP={() => setFPEnabled(true)}
          setForwardPressed={setForwardPressed}
          setJoystick={setJoystick}
        />
      )}

      {/* Build Palette (UI) */}
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

      {/* Card info container selectat */}
      <ContainerInfoCard
        container={selectedContainer}
        onClose={() => setSelectedContainer(null)}
      />
    </div>
  );
}