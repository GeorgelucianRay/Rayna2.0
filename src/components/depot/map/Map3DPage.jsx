import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Map3DStandalone.module.css";

import Navbar3D from "./Navbar3D";
import ContainerInfoCard from "./ContainerInfoCard";
import { useDepotScene } from "./scene/useDepotScene";
import FPControls from "./ui/FPControls";
import BuildPalette from "./build/BuildPalette";

import AddContainerWizardModal from "../modals/AddContainerWizardModal";
import SalidaContainerWizardModal from "../modals/SalidaContainerWizardModal";

import { supabase } from "../../../supabaseClient";

// încearcă întâi contenedores, apoi containers (fallback)
const TABLES_TRY = ["contenedores", "containers"];

// helper: rulează o operație supabase pe primul tabel care merge
async function tryTables(run) {
  let lastErr = null;
  for (const table of TABLES_TRY) {
    const res = await run(table);
    if (!res?.error) return { table, ...res };
    lastErr = res.error;
  }
  return { data: null, error: lastErr };
}

export default function Map3DPage() {
  const navigate = useNavigate();
  const mountRef = useRef(null);

  const [showBuild, setShowBuild] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);

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

    // ✅ NOU (din patch-ul de mai sus)
    refreshContainers,
  } = useDepotScene({ mountRef });

  useEffect(() => {
    setOnContainerSelected((selected) => {
      setSelectedContainer(selected);
      if (selected) showSelectedMarker?.(selected);
    });
  }, [setOnContainerSelected, showSelectedMarker]);

  /**
   * ✅ validatePosition pentru wizard
   */
  const validatePosition = useCallback(
    async (pos, tipo, ignoreId = null) => {
      const P = String(pos || "").trim().toUpperCase();
      if (!P || P === "PENDIENTE") return { ok: true };

      const conflict = (containers || []).find((c) => {
        const cpos = String(c?.posicion ?? c?.pos ?? "").trim().toUpperCase();
        if (!cpos) return false;
        if (ignoreId != null && c?.id === ignoreId) return false;
        return cpos === P;
      });

      if (conflict) {
        return {
          ok: false,
          conflict: {
            matricula_contenedor:
              conflict.matricula_contenedor || conflict.matricula || "—",
            posicion: conflict.posicion || conflict.pos || P,
          },
        };
      }

      return { ok: true };
    },
    [containers]
  );

  // ✅ ADD (Entrada) — insert în Supabase + refresh layer
  const handleAddContainer = useCallback(
    async (payload /*, isBroken */) => {
      try {
        // insert
        const ins = await tryTables((table) =>
          supabase.from(table).insert(payload).select().single()
        );

        if (ins.error) {
          console.error(ins.error);
          alert("Eroare Supabase la ADD (insert). Verifică numele tabelului/coloanelor.");
          return;
        }

        // refresh map
        await refreshContainers?.();

        // închide modal
        setAddModalOpen(false);
      } catch (e) {
        console.error(e);
        alert("Eroare la ADD.");
      }
    },
    [refreshContainers]
  );

  // ✅ SALIDA — delete din Supabase + refresh layer
  // payload vine din SalidaContainerWizardModal:
  // { camion, containers:[{id, matricula_contenedor, tipo, posicion}, ...], multi }
  const handleSalida = useCallback(
    async (payload) => {
      try {
        const mats = (payload?.containers || [])
          .map((x) => String(x?.matricula_contenedor || "").trim().toUpperCase())
          .filter(Boolean);

        if (!mats.length) {
          alert("Nu ai selectat containere.");
          return;
        }

        // cel mai simplu și sigur (fără să știm schema ta): le scoatem din tabel -> dispar din hartă
        const del = await tryTables((table) =>
          supabase.from(table).delete().in("matricula_contenedor", mats)
        );

        if (del.error) {
          console.error(del.error);
          alert("Eroare Supabase la SALIDA (delete). Verifică numele tabelului/coloanelor.");
          return;
        }

        await refreshContainers?.();
        setExitModalOpen(false);
      } catch (e) {
        console.error(e);
        alert("Eroare la SALIDA.");
      }
    },
    [refreshContainers]
  );

  return (
    <div className={styles.root}>
      <div ref={mountRef} className={styles.canvasHost} />

      <header className={styles.appBar} data-map-ui="1">
        <div className={styles.appBarLeft}>
          <button
            className={styles.appIconBtn}
            onClick={() => navigate("/depot")}
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
            className={`${styles.appIconBtn} ${
              isOrbitLibre ? styles.isActive : ""
            }`}
            onClick={() =>
              isOrbitLibre
                ? stopOrbitLibre()
                : startOrbitLibre({ speed: Math.PI / 32, height: 9 })
            }
            aria-label="Orbit libre"
            title={isOrbitLibre ? "Oprește orbit" : "Pornește orbit"}
            type="button"
          >
            ⟳
          </button>

          <button
            className={styles.appIconBtn}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            title="Menu"
            type="button"
          >
            ☰
          </button>
        </div>
      </header>

      {/* TOP MENU */}
      <div
        className={`${styles.topMenu} ${menuOpen ? styles.topMenuOpen : ""}`}
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
          // + / −
          onOpenAddModal={() => {
            setMenuOpen(false);
            setAddModalOpen(true);
          }}
          onOpenExitModal={() => {
            setMenuOpen(false);
            setExitModalOpen(true);
          }}
        />
      </div>

      {/* ZOOM */}
      <div
        className={styles.zoomControls}
        data-map-ui="1"
        style={{ transform: `translateY(${menuOpen ? 110 : 0}px)` }}
      >
        <button
          className={styles.zoomBtn}
          type="button"
          onClick={zoomIn}
          aria-label="Zoom in"
        >
          ＋
        </button>
        <button
          className={styles.zoomBtn}
          type="button"
          onClick={zoomOut}
          aria-label="Zoom out"
        >
          －
        </button>
        <button
          className={styles.zoomBtn}
          type="button"
          onClick={recenter}
          aria-label="Recenter"
        >
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

      <ContainerInfoCard
        container={selectedContainer}
        onClose={() => setSelectedContainer(null)}
      />

      {/* ADD Wizard */}
      <AddContainerWizardModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddContainer}
        validatePosition={validatePosition}
        slotMap={null}
      />

      {/* SALIDA Wizard */}
      <SalidaContainerWizardModal
        isOpen={exitModalOpen}
        onClose={() => setExitModalOpen(false)}
        containers={containers}
        onExit={handleSalida}
      />
    </div>
  );
}