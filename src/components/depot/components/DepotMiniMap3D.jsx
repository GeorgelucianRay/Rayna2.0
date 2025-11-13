// src/components/depot/components/DepotMiniMap3D.jsx
import React, { useState, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import { slotToWorld } from "../map/threeWorld/slotToWorld";
import styles from "./DepotMiniMap3D.module.css";

/* ---- helper: parse key "A10B" -> { lane:'A', index:10, tier:'B' } ---- */
function parseSlotKey(key) {
  const m = /^([A-F])(10|[1-9])([A-E])$/.exec(String(key || "").toUpperCase());
  if (!m) return null;
  return {
    lane: m[1],
    index: Number(m[2]),
    tier: m[3],
  };
}

/* ---- Scene cu toate sloturile A-F, nivele A-E ---- */
function MiniMapScene({ slotMap }) {
  const lanes = ["A", "B", "C", "D", "E", "F"];
  const tiers = ["A", "B", "C", "D", "E"];

  // pregătim o listă cu toate sloturile posibile + dacă sunt ocupate
  const slots = useMemo(() => {
    const out = [];
    lanes.forEach((lane) => {
      const max = ["A", "B", "C"].includes(lane) ? 10 : 7;
      tiers.forEach((tier) => {
        for (let index = 1; index <= max; index++) {
          const key = `${lane}${index}${tier}`;
          const occ = slotMap[key] || null;
          out.push({
            key,
            lane,
            index,
            tier,
            occupied: !!occ,
            container: occ,
          });
        }
      });
    });
    return out;
  }, [slotMap]);

  const lastClickRef = useRef(0);

  const handleSlotPointerDown = (slotKey, occ) => (e) => {
    const now = performance.now();
    const delta = now - lastClickRef.current;
    lastClickRef.current = now;

    // dublu-click / dublu-tap ≈ 320ms
    if (delta < 320) {
      e.stopPropagation();
      const cid = occ?.matricula_contenedor
        ? String(occ.matricula_contenedor).toUpperCase()
        : null;
      const msg = cid
        ? `Posición: ${slotKey}\nContenedor: ${cid}`
        : `Posición: ${slotKey}\nLibre`;
      alert(msg);
    }
  };

  return (
    <>
      {/* cer + lumini */}
      <color attach="background" args={["#020617"]} />
      <hemisphereLight
        skyColor={new THREE.Color("#1f2937")}
        groundColor={new THREE.Color("#020617")}
        intensity={0.8}
      />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1.1} />

      {/* grid pe sol */}
      <gridHelper args={[80, 40, "#1f2937", "#111827"]} position={[0, 0, 0]} />

      {/* camera orbită */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={15}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.1}
      />

      {/* cuburi pentru fiecare slot */}
      {slots.map((slot) => {
        const { lane, index, tier, key, occupied, container } = slot;

        const { position } = slotToWorld(
          {
            lane,
            index,
            tier,
            sizeFt: 20, // 🔹 slot standard; nu desenăm containerul real aici
          },
          {
            abcOffsetX: 0,
            defOffsetX: 0,
            abcToDefGap: -12,
            abcNumbersReversed: false,
          }
        );

        const color = occupied ? "#ef4444" : "#22c55e";
        const opacity = occupied ? 0.9 : 0.35;

        return (
          <mesh
            key={key}
            position={position}
            onPointerDown={handleSlotPointerDown(key, container)}
          >
            {/* cub ușor „întins” ca să semene cu un slot */}
            <boxGeometry args={[5.6, 2, 2.6]} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={opacity}
            />
          </mesh>
        );
      })}
    </>
  );
}

/* ---- Componentă principală: buton + popup cu Canvas ---- */
export default function DepotMiniMap3D({ slotMap }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* butonul de deschidere – îl păstrăm (îl poți scoate mai târziu) */}
      <div className={styles.openBtnWrap}>
        <button
          type="button"
          className={styles.openBtn}
          onClick={() => setOpen(true)}
        >
          Mini-mapa 3D
        </button>
      </div>

      {!open ? null : (
        <div
          className={styles.overlay}
          onClick={() => setOpen(false)}
        >
          <div
            className={styles.sheet}
            onClick={(e) => e.stopPropagation()}
          >
            <header className={styles.sheetHeader}>
              <h3 className={styles.sheetTitle}>Mini-mapa 3D · A-F / niveles A-E</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </header>

            <div className={styles.canvasWrap}>
              <Canvas
                camera={{ position: [25, 25, 25], fov: 45 }}
                style={{ width: "100%", height: "100%" }}
              >
                <MiniMapScene slotMap={slotMap || {}} />
              </Canvas>
            </div>

            <footer className={styles.legend}>
              <div className={styles.legendItem}>
                <span className={`${styles.dot} ${styles.dotFree}`} />
                Libre
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.dot} ${styles.dotBusy}`} />
                Ocupado (contenedor)
              </div>
              <span className={styles.hint}>
                Doble clic / tap pe un cub pentru a vedea poziția.
              </span>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}