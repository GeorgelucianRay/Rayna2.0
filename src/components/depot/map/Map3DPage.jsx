// src/components/depot/map/Map3DPage.jsx
import React, { useState, useRef } from 'react';
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

  // stări UI “de sus”
  const [showBuild, setShowBuild] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [flyToTarget, setFlyToTarget] = useState(null);

  // Hook-ul care montează scena + îți dă controllerele (FP, build, flyTo, etc.)
  const {
    isFP,
    setFPEnabled,
    setForwardPressed,
    setJoystick,
    setBuildActive,
    buildApi,           // {mode,setMode,rotateStep,setType,finalizeJSON}
    containers,         // array pt. search
    openWorldItems,     // fn (placeholder) – poți să-l legi la un modal separat
    setOnContainerSelected, // îți setezi handler-ul tău
  } = useDepotScene({ mountRef });

  // conectăm selectarea containerului
  React.useEffect(() => {
    setOnContainerSelected(selected => setSelectedContainer(selected));
  }, [setOnContainerSelected]);

  // când flyToTarget se schimbă, anunțăm scena prin setarea unei stări interne (hook-ul are grijă)
  React.useEffect(() => {
    if (!flyToTarget) return;
    // hook-ul ascultă modificarea lui flyToTarget din Map3DPage? Nu.
    // Soluție: expune o funcție din hook – dar ca să păstrăm simplu, doar
    // păstrăm aici starea și faci flyTo direct din Navbar prin onSelectContainer -> hook.flyTo(container).
    // Pentru varianta minimală, nu facem nimic aici.
  }, [flyToTarget]);

  return (
    <div className={styles.fullscreenRoot}>
      <Navbar3D
        containers={containers}
        onSelectContainer={(c) => {
          // ex: poți apela o metodă din hook (de expus ulterior) sau doar setezi un highlight
          setFlyToTarget(c);
        }}
        onToggleFP={() => setFPEnabled(prev => !prev)}
        onAdd={(data) => console.log('Add from Navbar3D', data)}
        onOpenBuild={() => { setShowBuild(true); setBuildActive(true); }}
        onOpenWorldItems={() => openWorldItems()}
      />

      <div className={styles.topBar}>
        <button className={styles.iconBtn} onClick={() => navigate('/depot')}>✕</button>
      </div>

      {/* Canvas host */}
      <div ref={mountRef} className={styles.canvasHost} />

      {/* Controls mobile pt FP */}
      {isFP && (
        <FPControls
          ensureFP={() => setFPEnabled(true)}
          setForwardPressed={setForwardPressed}
          setJoystick={setJoystick}
        />
      )}

      {/* HUD mic pentru Build */}
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
            console.log('WORLD JSON', json);
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