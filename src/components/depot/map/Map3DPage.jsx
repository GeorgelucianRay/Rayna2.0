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
  const [flyToTarget, setFlyToTarget] = useState(null);

  // Hook principal al scenei 3D
  const {
    isFP,
    setFPEnabled,
    setForwardPressed,
    setJoystick,
    setBuildActive,
    buildApi,           // <- avem deja tot ce trebuie aici
    containers,
    openWorldItems,
    setOnContainerSelected,
  } = useDepotScene({ mountRef });

  // Conectăm selectarea containerului din scenă către cardul de info
  useEffect(() => {
    setOnContainerSelected(selected => setSelectedContainer(selected));
  }, [setOnContainerSelected]);

  return (
    <div className={styles.fullscreenRoot}>
      {/* Navbar */}
      <Navbar3D
        containers={containers}
        onSelectContainer={(c) => setFlyToTarget(c)}
        onToggleFP={() => setFPEnabled(prev => !prev)}
        onAdd={(data) => console.log('Add from Navbar3D', data)}
        onOpenBuild={() => { setShowBuild(true); setBuildActive(true); }}
        onOpenWorldItems={() => openWorldItems()}
      />

      {/* Buton de ieșire */}
      <div className={styles.topBar}>
        <button
          className={styles.iconBtn}
          onClick={() => navigate('/depot')}
        >
          ✕
        </button>
      </div>

      {/* Canvas host */}
      <div ref={mountRef} className={styles.canvasHost} />

      {/* Controale mobile pentru modul First Person */}
      {isFP && (
        <FPControls
          ensureFP={() => setFPEnabled(true)}
          setForwardPressed={setForwardPressed}
          setJoystick={setJoystick}
        />
      )}

      {/* === Build Palette === */}
      {showBuild && (
        <BuildPalette
          onClose={() => { setShowBuild(false); setBuildActive(false); }}
          onPickType={(t) => buildApi.setType(t)}          // alegi obiectul (drum, gard, munte etc.)
          mode={buildApi.mode}                             // 'place' | 'remove'
          setMode={(m) => buildApi.setMode(m)}             // schimbi modul
          onRotateStep={(dir) => buildApi.rotateStep(dir)} // rotești ±90°
          onFinalize={() => {
            const json = buildApi.finalizeJSON();          // exportă ce-ai creat
            console.log('WORLD JSON:', json);
            setShowBuild(false);
            setBuildActive(false);
          }}
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