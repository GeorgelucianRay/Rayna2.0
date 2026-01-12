// src/components/depot/map/Map3DPage.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
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

  // ✅ burger menu open
  const [menuOpen, setMenuOpen] = useState(false);

  // ✅ înălțime meniu (px) — o poți ajusta
  const MENU_HEIGHT = 260;

  // ✅ folosit ca CSS var pentru a împinge zoomControls
  const rootStyle = useMemo(
    () => ({ '--menuOffset': menuOpen ? `${MENU_HEIGHT}px` : '0px' }),
    [menuOpen]
  );

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

  return (
    <div className={styles.root} style={rootStyle}>
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

          {/* ✅ burger: deschide Navbar3D-ul tău (top-down) */}
          <button
            className={`${styles.appIconBtn} ${menuOpen ? styles.isActive : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            title={menuOpen ? 'Închide meniul' : 'Deschide meniul'}
            type="button"
          >
            ☰
          </button>

          {/* păstrez butonul Items dacă încă îl vrei separat (NU stric ce aveai)
              Dacă nu-l mai vrei, îl poți scoate după ce confirmi.
          */}
          <button
            className={styles.appIconBtn}
            onClick={() => openWorldItems()}
            aria-label="Items"
            title="Items"
            type="button"
          >
            ⋯
          </button>
        </div>
      </header>

      {/* ✅ PANEL TOP-DOWN: AICI este Navbar3D-ul tău, nu se mai afișează jos */}
      <div
        className={`${styles.topMenu} ${menuOpen ? styles.topMenuOpen : ''}`}
        data-map-ui="1"
      >
        <Navbar3D
          containers={containers}
          onSelectContainer={(c) => {
            setSelectedContainer(c);
            showSelectedMarker?.(c);
            if (isOrbitLibre) stopOrbitLibre();
            setFPEnabled(false);
            focusCameraOnContainer?.(c, { smooth: true });
            setMenuOpen(false);
          }}
          onToggleFP={() => {
            setFPEnabled(!isFP);
            setMenuOpen(false);
          }}
          onAdd={(data) => console.log('Add from Navbar3D', data)}
          onOpenBuild={() => {
            setShowBuild(true);
            setBuildActive(true);
            setMenuOpen(false);
          }}
          onOpenWorldItems={() => {
            openWorldItems();
            setMenuOpen(false);
          }}
        />
      </div>

      {/* ✅ Zoom controls: se mută în jos automat via CSS var --menuOffset */}
      <div className={styles.zoomControls} data-map-ui="1">
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

      {/* ❌ NU mai randez Navbar3D jos (asta era problema ta) */}
      {/* <Navbar3D ... /> */}

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