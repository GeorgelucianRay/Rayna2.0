import React, { useState, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import styles from "./DepotMiniMap3D.module.css";

// mic helper: poziție simplă în mini-hartă (NU afectează Map3D real)
function slotToMiniPos(lane, index, tier) {
  const lanes = "ABCDEF";
  const tiers = "ABCDE";

  const laneIdx = Math.max(0, lanes.indexOf(lane.toUpperCase()));
  const tierIdx = Math.max(0, tiers.indexOf(tier.toUpperCase()));

  const STEP_X = 3.2;  // distanța între numere (1–10)
  const STEP_Z = 3.2;  // distanța între rânduri (A–F)
  const STEP_Y = 1.4;  // distanța între nivele (A–E)

  const x = -(index - 1) * STEP_X;
  const z = laneIdx * STEP_Z;
  const y = 0.7 + tierIdx * STEP_Y; // puțin deasupra solului

  return new THREE.Vector3(x, y, z);
}

function MiniMapScene({ slotMap }) {
  const lanes = ["A", "B", "C", "D", "E", "F"];
  const tiers = ["A", "B", "C", "D", "E"];

  const lastTapRef = useRef(0);

  // pregătim toate sloturile posibile
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

  const showInfo = (slotKey, occ) => {
    const cid = occ?.matricula_contenedor
      ? String(occ.matricula_contenedor).toUpperCase()
      : null;
    const msg = cid
      ? `Posición: ${slotKey}\nContenedor: ${cid}`
      : `Posición: ${slotKey}\nLibre`;
    alert(msg);
  };

  const handleTouchDown = (slotKey, occ) => (e) => {
    if (e.pointerType !== "touch") return;
    const now = performance.now();
    const delta = now - lastTapRef.current;
    lastTapRef.current = now;
    if (delta < 320) {
      // double-tap
      showInfo(slotKey, occ);
    }
    // NU oprim propagarea → OrbitControls continuă să funcționeze
  };

  const handleDoubleClick = (slotKey, occ) => (e) => {
    e.stopPropagation(); // doar pentru evenimentul de dublu click
    showInfo(slotKey, occ);
  };

  return (
    <>
      {/* cer + lumini ca să nu fie întunecat */}
      <color attach="background" args={["#020617"]} />
      <hemisphereLight
        skyColor={new THREE.Color("#1f2937")}
        groundColor={new THREE.Color("#020617")}
        intensity={0.9}
      />
      <ambientLight intensity={0.5} />
      <directionalLight position={[15, 25, 10]} intensity={1.1} />

      {/* grid pe sol */}
      <gridHelper args={[80, 40, "#1f2937", "#111827"]} position={[0, 0, 0]} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={18}
        maxDistance={70}
        maxPolarAngle={Math.PI / 2.1}
      />

      {slots.map((slot) => {
        const { lane, index, tier, key, occupied, container } = slot;
        const position = slotToMiniPos(lane, index, tier);

        const color = occupied ? "#ef4444" : "#22c55e";
        const opacity = occupied ? 0.9 : 0.35;

        return (
          <mesh
            key={key}
            position={position}
            onPointerDown={handleTouchDown(key, container)}  // dublu tap mobil
            onDoubleClick={handleDoubleClick(key, container)} // dublu click desktop
          >
            {/* un cub 20' generic; nu contează exact dimensiunea */}
            <boxGeometry args={[3.0, 1.2, 1.8]} />
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

export default function DepotMiniMap3D({ slotMap }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={styles.openBtnWrap}>
        <button
          type="button"
          className={styles.openBtn}
          onClick={() => setOpen(true)}
        >
          Mini-mapa 3D
        </button>
      </div>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div
            className={styles.sheet}
            onClick={(e) => e.stopPropagation()}
          >
            <header className={styles.sheetHeader}>
              <h3 className={styles.sheetTitle}>
                Mini-mapa 3D · A–F / niveles A–E
              </h3>
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
                camera={{ position: [25, 30, 25], fov: 45 }}
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
                Doble clic / doble tap pe un cub pentru poziție.
              </span>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}