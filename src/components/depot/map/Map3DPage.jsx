// src/components/depot/map/Map3DPage.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Map3DStandalone.module.css';

import Navbar3D from './Navbar3D';
import ContainerInfoCard from './ContainerInfoCard';
import { useDepotScene } from './scene/useDepotScene';
import FPControls from './ui/FPControls';
import BuildPalette from './build/BuildPalette';

// ✅ modal wizard pentru +
import AddContainerWizardModal from '../modals/AddContainerWizardModal';

export default function Map3DPage() {
  const navigate = useNavigate();
  const mountRef = useRef(null);

  const [showBuild, setShowBuild] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);

  // ✅ burger/topMenu
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

  /**
   * ✅ validatePosition pentru wizard
   * Verifică dacă poziția există deja în `containers` (din Supabase).
   * Returnează formatul așteptat de AddContainerModal/AddContainerWizardModal:
   * { ok: boolean, conflict?: { matricula_contenedor, posicion } }
   */
  const validatePosition = useCallback(async (pos, tipo, ignoreId = null) => {
    const P = String(pos || '').trim().toUpperCase();
    if (!P || P === 'PENDIENTE') return { ok: true };

    const conflict = (containers || []).find((c) => {
      const cpos = String(c?.posicion ?? c?.pos ?? '').trim().toUpperCase();
      if (!cpos) return false;
      if (ignoreId != null && (c?.id === ignoreId)) return false;
      return cpos === P;
    });

    if (conflict) {
      return {
        ok: false,
        conflict: {
          matricula_contenedor: conflict.matricula_contenedor || conflict.matricula || '—',
          posicion: conflict.posicion || conflict.pos || P,
        },
      };
    }

    return { ok: true };
  }, [containers]);

  // ✅ aici conectezi cu logica ta reală de ADD (supabase insert + refresh)
  const handleAddContainer = async (payload /*, isBroken */) => {
    // TODO: aici pui insert în supabase + refresh lista
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

          {/* ✅ burger */}
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

      {/* ✅ TOP MENU */}
      <div
        className={`${styles.topMenu} ${menuOpen ? styles.topMenuOpen : ''}`}
        data-map-ui="1"
      >
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
          onOpenBuild={() => {
            setShowBuild(true);
            setBuildActive(true);
            setMenuOpen(false);
          }}
          onOpenWorldItems={() => {
            openWorldItems();
            setMenuOpen(false);
          }}
          // ✅ + / −: închide meniul + deschide modal
          onOpenAddModal={() => { setMenuOpen(false); setAddModalOpen(true); }}
          onOpenExitModal={() => { setMenuOpen(false); setExitModalOpen(true); }}
        />
      </div>

      {/* ✅ ZOOM – împins când meniul e deschis */}
      <div
        className={styles.zoomControls}
        data-map-ui="1"
        style={{ transform: `translateY(${menuOpen ? 110 : 0}px)` }}
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

      {/* ✅ MODAL WIZARD pentru + */}
      <AddContainerWizardModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddContainer}
        validatePosition={validatePosition}
        slotMap={null}
      />

      {/* ✅ MODAL temporar pt - */}
      {exitModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHead}>
              <h3 className={styles.modalTitle}>Salida • Container</h3>
              <button
                className={styles.modalClose}
                onClick={() => setExitModalOpen(false)}
                type="button"
              >
                ✕
              </button>
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