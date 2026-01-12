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

  // ✅ Drawer state pentru burger (NU schimbă logica existentă)
  const [navOpen, setNavOpen] = useState(false);

  const {
    isFP,
    setFPEnabled,
    setForwardPressed,
    setJoystick,
    setLookJoystick,
    selectFromCrosshair,

    setBuildActive,
    buildApi,
    containers,
    openWorldItems,
    setOnContainerSelected,
    focusCameraOnContainer,

    showSelectedMarker,
    zoomIn,
    zoomOut,
    recenter,

    isOrbitLibre,
    startOrbitLibre,
    stopOrbitLibre,
  } = useDepotScene({ mountRef });

  useEffect(() => {
    setOnContainerSelected((selected) => {
      setSelectedContainer(selected);
      if (selected) showSelectedMarker?.(selected);
    });
  }, [setOnContainerSelected, showSelectedMarker]);

  // ✅ helper: deschide ce aveai înainte la burger (openWorldItems) fără să strice nimic
  const onBurger = () => {
    // dacă vrei burger-ul să fie DOAR drawer, comentează linia de jos
    openWorldItems?.();
    setNavOpen(true);
  };

  return (
    <div className={styles.root}>
      <div ref={mountRef} className={styles.canvasHost} />

      <header className={styles.appBar} data-map-ui="1">
        <div className={styles.appBarLeft}>
          <button
            className={styles.appIconBtn}
            onClick={() => navigate('/depot')}
            aria-label="Volver a Depósito"
            title="Volver"
            type="button"
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
            type="button"
          >
            ⟳
          </button>

          {/* ✅ Burger: acum deschide drawer cu Navbar3D */}
          <button
            className={styles.appIconBtn}
            onClick={onBurger}
            aria-label="Menu"
            title="Menu"
            type="button"
          >
            ☰
          </button>
        </div>
      </header>

      {/* ✅ Zoom controls: când drawer e deschis, îl “împingem” (CSS: zoomShiftDown) */}
      <div
        className={`${styles.zoomControls} ${navOpen ? styles.zoomShiftDown : ''}`}
        data-map-ui="1"
      >
        <button className={styles.zoomBtn} type="button" onClick={zoomIn} aria-label="Zoom in">
          ＋
        </button>
        <button className={styles.zoomBtn} type="button" onClick={zoomOut} aria-label="Zoom out">
          －
        </button>
        <button className={styles.zoomBtn} type="button" onClick={recenter} aria-label="Recenter">
          ⌖
        </button>
      </div>

      {/* ✅ Overlay drawer */}
      <div
        className={`${styles.drawerOverlay} ${navOpen ? styles.drawerOverlayOpen : ''}`}
        onClick={() => setNavOpen(false)}
        data-map-ui="1"
      />

      {/* ✅ Drawer panel cu Navbar3D (Navbarul tău, neschimbat) */}
      <aside className={`${styles.drawer} ${navOpen ? styles.drawerOpen : ''}`} data-map-ui="1">
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitle}>Meniu</div>
          <button
            className={styles.drawerClose}
            type="button"
            onClick={() => setNavOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className={styles.drawerBody}>
          <Navbar3D
            containers={containers}
            onSelectContainer={(c) => {
              setSelectedContainer(c);
              showSelectedMarker?.(c);
              if (isOrbitLibre) stopOrbitLibre();
              setFPEnabled(false);
              focusCameraOnContainer?.(c, { smooth: true });
              setNavOpen(false); // ✅ închide drawer după select
            }}
            onToggleFP={() => {
              setFPEnabled(!isFP);
              setNavOpen(false);
            }}
            onAdd={(data) => console.log('Add from Navbar3D', data)}
            onOpenBuild={() => {
              setShowBuild(true);
              setBuildActive(true);
              setNavOpen(false);
            }}
            onOpenWorldItems={() => {
              openWorldItems();
              setNavOpen(false);
            }}
          />
        </div>
      </aside>

      {isFP && (
        <FPControls
          ensureFP={() => setFPEnabled(true)}
          setForwardPressed={setForwardPressed}
          setJoystick={setJoystick}
          setLookJoystick={setLookJoystick}
          onSelect={selectFromCrosshair}
        />
      )}

      {showBuild && (
        <BuildPalette
          open={showBuild}
          onClose={() => {
            setShowBuild(false);
            setBuildActive(false);
          }}
          buildController={buildApi.controller}
          buildActive={buildApi.active}
          setBuildActive={setBuildActive}
          buildMode={buildApi.mode}
          setBuildMode={buildApi.setMode}
        />
      )}

      <ContainerInfoCard container={selectedContainer} onClose={() => setSelectedContainer(null)} />
    </div>
  );
}