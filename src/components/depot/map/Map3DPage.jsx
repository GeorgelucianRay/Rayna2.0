// src/components/depot/map/Map3DPage.jsx
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

    // ✅ trebuie să existe în useDepotScene (patch-ul tău)
    refreshContainers,
  } = useDepotScene({ mountRef });

  useEffect(() => {
    setOnContainerSelected((selected) => {
      setSelectedContainer(selected);
      if (selected) showSelectedMarker?.(selected);
    });
  }, [setOnContainerSelected, showSelectedMarker]);

  /**
   * ✅ validatePosition pentru wizard (+)
   * Verifică dacă poziția există deja în lista curentă de pe hartă (din DB).
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

  // ✅ ADD (Entrada) — insert în contenedores / contenedores_rotos + refresh map
  const handleAddContainer = useCallback(
    async (payload, isBroken) => {
      try {
        const table = isBroken ? "contenedores_rotos" : "contenedores";

        const { error } = await supabase.from(table).insert(payload);
        if (error) {
          console.error(error);
          alert("Eroare la ADD (insert). Verifică tabela/coloanele.");
          return;
        }

        await refreshContainers?.();
        setAddModalOpen(false);
      } catch (e) {
        console.error(e);
        alert("Eroare la ADD.");
      }
    },
    [refreshContainers]
  );

  // ✅ SALIDA — MUTĂ din contenedores/rotos -> contenedores_salidos (apoi șterge din sursă)
  const handleSalida = useCallback(
    async (payload) => {
      try {
        const truck = String(payload?.camion || "")
          .trim()
          .toUpperCase();

        const list = payload?.containers || [];

        if (!truck || truck.length < 4) {
          alert("Introduce matrícula camion válida.");
          return;
        }
        if (!list.length) {
          alert("Nu ai selectat containere.");
          return;
        }

        // preferă source_table din wizard; fallback: dacă are "detalles" => rotos
        const detectTable = (c) => {
          const st = c?.source_table || c?.__table || c?.tabla || null;
          if (st === "contenedores" || st === "contenedores_rotos") return st;

          const hasDetalles = String(c?.detalles || "").trim().length > 0;
          return hasDetalles ? "contenedores_rotos" : "contenedores";
        };

        for (const it of list) {
          const sourceTable = detectTable(it);

          // 1) Citește rândul complet din sursă (după id dacă există, altfel după matricula)
          let row = null;

          if (it?.id != null) {
            const { data, error } = await supabase
              .from(sourceTable)
              .select("*")
              .eq("id", it.id)
              .maybeSingle();

            if (error) {
              console.error(error);
              alert(`Eroare citire din ${sourceTable}.`);
              return;
            }
            row = data;
          } else {
            const mat = String(it?.matricula_contenedor || "")
              .trim()
              .toUpperCase();

            const { data, error } = await supabase
              .from(sourceTable)
              .select("*")
              .eq("matricula_contenedor", mat)
              .maybeSingle();

            if (error) {
              console.error(error);
              alert(`Eroare citire din ${sourceTable}.`);
              return;
            }
            row = data;
          }

          if (!row) {
            alert(`Containerul nu a fost găsit în ${sourceTable}.`);
            return;
          }

          // 2) Insert în contenedores_salidos (coloane reale din schema ta)
          const insertSalida = {
            matricula_contenedor: row.matricula_contenedor,
            naviera: row.naviera ?? null,
            tipo: row.tipo ?? null,
            posicion: row.posicion ?? null,
            matricula_camion: truck,
            detalles: row.detalles ?? null,
            estado: row.estado ?? null,

            empresa_descarga: row.empresa_descarga ?? null,
            fecha: row.fecha ?? null,
            hora: row.hora ?? null,

            // specifice salidos
            desde_programados: false,
            fecha_programada: null,
            hora_programada: null,
            fecha_salida: new Date().toISOString(),
          };

          const { error: insErr } = await supabase
            .from("contenedores_salidos")
            .insert(insertSalida);

          if (insErr) {
            console.error(insErr);
            alert("Eroare insert în contenedores_salidos.");
            return;
          }

          // 3) Delete din sursă
          const { error: delErr } = await supabase
            .from(sourceTable)
            .delete()
            .eq("id", row.id);

          if (delErr) {
            console.error(delErr);
            alert(
              `Eroare delete din ${sourceTable}. (salida a fost inserată deja)`
            );
            return;
          }
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