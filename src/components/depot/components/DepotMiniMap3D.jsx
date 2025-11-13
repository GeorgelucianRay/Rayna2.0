// src/components/depot/components/DepotMiniMap3D.jsx
import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import styles from "../DepotPage.module.css";

// aceleași rânduri ca în minimap 2D
const FILAS = ["A", "B", "C", "D", "E", "F"];
const maxForFila = (f) => (["A", "B", "C"].includes(f) ? 10 : 7);

// mic helper coordonate grilă
function getSlotPosition(fila, num) {
  const filaIndex = FILAS.indexOf(fila); // 0..5
  const x = filaIndex * 1.2;            // distanță între rânduri
  const z = (num - 1) * 1.2;            // distanță între coloane
  return [x, 0, z];
}

function SlotCube({ fila, num, slotMap }) {
  const key = `${fila}${num}A`;
  const occ = slotMap[key];

  const [color, height] = useMemo(() => {
    if (!occ) return ["#1f2933", 0.18];             // liber
    if (occ.__from === "contenedores_rotos") return ["#f97373", 0.35]; // roșu – defect
    if (occ.__from === "programados") return ["#facc15", 0.32];        // galben – programat
    return ["#22c55e", 0.32];                       // verde – în depozit
  }, [occ]);

  const [x, y, z] = getSlotPosition(fila, num);

  return (
    <mesh position={[x, y + height / 2, z]}>
      {/* bază container-slot */}
      <boxGeometry args={[1.0, height, 1.0]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.4} />
    </mesh>
  );
}

function MiniMapScene({ slotMap }) {
  return (
    <>
      {/* lumină */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[6, 10, 8]}
        intensity={0.9}
        castShadow
      />

      {/* “platformă” */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 14]} />
        <meshStandardMaterial color="#020617" />
      </mesh>

      {/* grila de sloturi */}
      {FILAS.map((fila) => {
        const max = maxForFila(fila);
        return Array.from({ length: max }, (_, i) => i + 1).map((num) => (
          <SlotCube key={`${fila}${num}`} fila={fila} num={num} slotMap={slotMap} />
        ));
      })}
    </>
  );
}

export default function DepotMiniMap3D({ slotMap }) {
  return (
    <div className={styles.mini3dWrap}>
      <div className={styles.mini3dHeader}>
        Mapa 3D rápido (A–F · nivel A)
      </div>
      <Canvas
        camera={{ position: [6, 8, 10], fov: 45 }}
        shadows
      >
        <MiniMapScene slotMap={slotMap} />
        <OrbitControls
          enablePan={false}
          maxPolarAngle={Math.PI / 2.1}
          minPolarAngle={0.3}
          minDistance={6}
          maxDistance={18}
        />
      </Canvas>
    </div>
  );
}