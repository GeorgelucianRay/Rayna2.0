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

  const appBarRef = useRef(null);

  const [showBuild, setShowBuild] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const MENU_HEIGHT = 110; // ✅ panelul tău e doar dock-ul + puțin padding (ajustezi ușor)

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

  // ✅ setăm top-ul panelului exact sub appBar (fără magic numbers)
  useEffect(() => {
    const el = appBarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      document.documentElement.style.setProperty('--appBarBottom', `${r.bottom}px`);
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    document.documentElement.style.setProperty('--appBarBottom', `${r.bottom}px`);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={styles.root} style={rootStyle}>
      <div ref={mountRef} className={styles.canvasHost} />

      <header ref={appBarRef} className={styles.appBar} data-map-ui="1">
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

          {/* ✅ doar burger */}
          <button
            className={`${styles.appIconBtn} ${menuOpen ? styles.isActive : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menu"
            title={menuOpen ? 'Închide meniul' : 'Deschide meniul'}
            type="button"
          >
            ☰
          </button>
        </div>
      </header>

      {/* ✅ PANEL TOP-DOWN, sub appBar */}
      <div className={`${styles.topMenu} ${menuOpen ? styles.topMenuOpen : ''}`} data-map-ui="1">
        <Navbar3D
          variant="panel"
          containers={containers}
          onRequestClose={() => setMenuOpen(false)}
          onSelectContainer={(c) => {
            setSelectedContainer(c);
            showSelectedMarker?.(c);
            if (isOrbitLibre) stopOrbitLibre();
            setFPEnabled(false);
            focusCameraOnContainer?.(c, { smooth: true });
          }}
          onToggleFP={() => setFPEnabled(!isFP)}
          onAdd={(data) => console.log('Add from Navbar3D', data)}
          onOpenBuild={() => {
            setShowBuild(true);
            setBuildActive(true);
          }}
          onOpenWorldItems={() => openWorldItems()}
        />
      </div>

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

      {/* ✅ păstrezi Navbar3D original jos DOAR dacă vrei, dar acum nu mai e nevoie.
          Dacă îl lași, o să ai două meniuri.
          Eu îl scot pentru că tu vrei să fie în burger.
      */}

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