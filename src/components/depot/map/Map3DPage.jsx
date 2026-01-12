// src/components/depot/map/Map3DPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Map3DStandalone.module.css';

import Navbar3D from './Navbar3D';
import ContainerInfoCard from './ContainerInfoCard';
import { useDepotScene } from './scene/useDepotScene';
import FPControls from './ui/FPControls';
import BuildPalette from './build/BuildPalette';

// ✅ modalul tău REAL pentru +
import AddContainerModal from '../modals/AddContainerModal';

// ✅ dacă ai deja un modal pt salida, îl importăm în locul celui inline (vezi mai jos)

export default function Map3DPage() {
  const navigate = useNavigate();
  const mountRef = useRef(null);

  const [showBuild, setShowBuild] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);

  // ✅ burger/topMenu state (dacă deja îl ai, păstrează-l pe al tău)
  const [menuOpen, setMenuOpen] = useState(false);

  // ✅ modale
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);

  // ✅ salida (temporar, inline)
  const [exitMatricula, setExitMatricula] = useState('');

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

  // ✅ aici conectezi cu logica ta reală de ADD (supabase)
  const handleAddContainer = async (payload /*, isBroken */) => {
    // TODO: înlocuiește cu funcția ta reală (insert în supabase, refresh etc.)
    console.log('[ADD CONTAINER]', payload);
  };

  // ✅ aici conectezi cu logica ta reală de SALIDA
  const handleExitContainer = async () => {
    const m = (exitMatricula || '').trim().toUpperCase();
    if (m.length < 4) return alert('Introduce matrícula válida.');
    console.log('[SALIDA]', { matricula_contenedor: m });
    setExitMatricula('');
    setExitModalOpen(false);
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

          {/* ✅ burger - deschide top menu */}
          <button
            className={styles.appIconBtn}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menu"
            title="Menu"
            type="button"
          >
            ☰
          </button>
        </div>
      </header>

      {/* ✅ TOP MENU care cade (panel) */}
      <div
        className={`${styles.topMenu} ${menuOpen ? styles.topMenuOpen : ''}`}
        data-map-ui="1"
      >
        <Navbar3D
          variant="panel"
          containers={containers}
          onRequestClose={() => setMenuOpen(false)}   // ⬅️ SUPER IMPORTANT
          onSelectContainer={(c) => {
            setSelectedContainer(c);
            showSelectedMarker?.(c);
            if (isOrbitLibre) stopOrbitLibre();
            setFPEnabled(false);
            focusCameraOnContainer?.(c, { smooth: true });
          }}
          onToggleFP={() => setFPEnabled(!isFP)}
          onOpenBuild={() => {
            setShowBuild(true);
            setBuildActive(true);
            setMenuOpen(false);
          }}
          onOpenWorldItems={() => {
            openWorldItems();
            setMenuOpen(false);
          }}
          // ✅ + / − trebuie să închidă meniul și să deschidă modalul
          onOpenAddModal={() => { setMenuOpen(false); setAddModalOpen(true); }}
          onOpenExitModal={() => { setMenuOpen(false); setExitModalOpen(true); }}
        />
      </div>

      <div
        className={styles.zoomControls}
        data-map-ui="1"
        style={{ transform: `translateY(${menuOpen ? 110 : 0}px)` }} // ✅ simplu: împinge zoom în jos
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

      {/* ✅ Dacă vrei să păstrezi și FAB jos, îl poți lăsa (variant="fab") – opțional.
          Dacă NU mai vrei FAB-ul, nu îl mai randa. */}
      {/* <Navbar3D variant="fab" ... /> */}

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

      {/* ✅ MODAL REAL pentru + (Entrada) */}
      <AddContainerModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddContainer}
        validatePosition={null /* <- conectează funcția ta reală dacă o ai */}
        slotMap={null}
      />

      {/* ✅ MODAL temporar pt - (Salida) – fără fișier nou */}
      {exitModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHead}>
              <h3 className={styles.modalTitle}>Salida • Container</h3>
              <button className={styles.modalClose} onClick={() => setExitModalOpen(false)} type="button">✕</button>
            </div>

            <label className={styles.modalField}>
              <span>Matrícula Contenedor</span>
              <input
                className={styles.modalInput}
                value={exitMatricula}
                onChange={(e) => setExitMatricula(e.target.value.toUpperCase())}
                placeholder="ex: MSCU1234567"
                style={{ textTransform: 'uppercase' }}
              />
            </label>

            <button
              onClick={handleExitContainer}
              className={styles.modalPrimary}
              type="button"
            >
              Confirmar salida
            </button>
          </div>
        </div>
      )}
    </div>
  );
}