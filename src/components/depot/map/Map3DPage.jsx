// src/components/depot/map/Map3DPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Map3DStandalone.module.css';

import Navbar3D from './Navbar3D';
import ContainerInfoCard from './ContainerInfoCard';
import { useDepotScene } from './scene/useDepotScene';
import FPControls from './ui/FPControls';
// ⬇️ folosim paleta corectă
import BuildPalette from './build/BuildPalette';

export default function Map3DPage() {
  const navigate = useNavigate();
  const mountRef = useRef(null);

  // UI state
  const [showBuild, setShowBuild] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [flyToTarget, setFlyToTarget] = useState(null); // (Notă: flyToTarget nu este folosit nicăieri)

  // ===== MODIFICARE 1: Extragem noile date din hook =====
  // Hook principal (scena)
  const {
    isFP,
    setFPEnabled,
    setForwardPressed,
    setJoystick,
    buildActive, // <-- ADĂUGAT
    setBuildActive,
    buildApi,
    buildController, // <-- ADĂUGAT
    containers,
    openWorldItems,
    setOnContainerSelected,
  } = useDepotScene({ mountRef });
  // ===== SFÂRȘIT MODIFICARE 1 =====

  // Conectăm selectarea containerului din scenă către cardul de info
  useEffect(() => {
    setOnContainerSelected(selected => setSelectedContainer(selected));
  }, [setOnContainerSelected]);

  return (
    <div className={styles.fullscreenRoot}>
      {/* Navbar principal */}
      <Navbar3D
        containers={containers}
        onSelectContainer={(c) => setFlyToTarget(c)} // (opțional: expune flyTo din hook și apelează-l aici)
        onToggleFP={() => setFPEnabled(prev => !prev)}
        onAdd={(data) => console.log('Add from Navbar3D', data)}
        onOpenBuild={() => { setShowBuild(true); setBuildActive(true); }}
        onOpenWorldItems={() => openWorldItems()}
      />

      {/* Buton ieșire */}
      <div className={styles.topBar}>
        <button className={styles.iconBtn} onClick={() => navigate('/depot')}>✕</button>
      </div>

      {/* Canvas host */}
      <div ref={mountRef} className={styles.canvasHost} />

      {/* Controale mobile (First Person) */}
      {isFP && (
        <FPControls
          ensureFP={() => setFPEnabled(true)}
          setForwardPressed={setForwardPressed}
          setJoystick={setJoystick}
        />
      )}

      {/* ===== MODIFICARE 2: Trimitem props-urile corecte către BuildPalette ===== */}
      {/* Paleta de Build (UI corectă) */}
      {showBuild && (
        <BuildPalette
          open={showBuild}
          onClose={() => { setShowBuild(false); setBuildActive(false); }}
          buildController={buildController}
          buildActive={buildActive}
          setBuildActive={setBuildActive}
          buildMode={buildApi.mode}
          setBuildMode={buildApi.setMode}
        />
      )}
      {/* ===== SFÂRȘIT MODIFICARE 2 ===== */}

      {/* Info container selectat */}
      <ContainerInfoCard
        container={selectedContainer}
        onClose={() => setSelectedContainer(null)}
      />
    </div>
  );
}
