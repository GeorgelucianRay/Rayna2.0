// src/components/depot/map/Map3DPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Map3DStandalone.module.css';

import Navbar3D from './Navbar3D';
import ContainerInfoCard from './ContainerInfoCard';
import { useDepotScene } from './scene/useDepotScene';
import FPControls from './ui/FPControls';
import BuildHUD from './ui/BuildHUD';

export default function Map3DPage() {
  const navigate = useNavigate();
  const mountRef = useRef(null);

  // UI state
  const [showBuild, setShowBuild] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [flyToTarget, setFlyToTarget] = useState(null);

  // Hook principal (scena)
  const {
    isFP,
    setFPEnabled,
    setForwardPressed,
    setJoystick,
    setBuildActive,
    buildApi,           // { mode, setMode, rotateStep, setType, finalizeJSON }
    containers,         // lista pentru search
    openWorldItems,     // deschide lista de obiecte
    setOnContainerSelected,
  } = useDepotScene({ mountRef });

  // Conectăm selectarea containerului
  useEffect(() => {
    setOnContainerSelected(selected => setSelectedContainer(selected));
  }, [setOnContainerSelected]);

  return (
    <div className={styles.fullscreenRoot}>
      {/* Navbar principal */}
      <Navbar3D
        containers={containers}
        onSelectContainer={(c) => setFlyToTarget(c)}
        onToggleFP={() => setFPEnabled(prev => !prev)}
        onAdd={(data) => console.log('Add from Navbar3D', data)}
        onOpenBuild={() => { setShowBuild(true); setBuildActive(true); }}  // ← FIX
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

      {/* HUD pentru modul Build */}
      {showBuild && (
        <BuildHUD
          mode={buildApi.mode}
          setMode={buildApi.setMode}
          onClose={() => { setShowBuild(false); setBuildActive(false); }}
          onRotateLeft={() => buildApi.rotateStep(-1)}
          onRotateRight={() => buildApi.rotateStep(+1)}
          onPickType={(t) => buildApi.setType(t)}
          onFinalize={() => {
            const json = buildApi.finalizeJSON();
            console.log('WORLD JSON:', json);
            setShowBuild(false);
            setBuildActive(false);
          }}
        />
      )}

      {/* Info container selectat */}
      <ContainerInfoCard
        container={selectedContainer}
        onClose={() => setSelectedContainer(null)}
      />
    </div>
  );
}