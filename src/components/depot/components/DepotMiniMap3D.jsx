// src/components/depot/components/DepotMiniMap3D.jsx
import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import Modal from "../../ui/Modal";
import shell from "../../ui/Modal.module.css";
import { slotToWorld } from "../map/threeWorld/slotToWorld.js";

/**
 * Parsează un key de tip "A2A" -> { lane:'A', index:2, tier:'A' }
 */
function parseSlotKey(key) {
  const m = /^([A-F])(10|[1-9])([A-E])$/.exec(String(key || "").toUpperCase());
  if (!m) return null;
  return {
    lane: m[1],
    index: Number(m[2]),
    tier: m[3],
  };
}

/**
 * Cub simplu care reprezintă un container în mini-map
 */
function MiniContainer({ slotKey, tipo }) {
  const parsed = parseSlotKey(slotKey);
  if (!parsed) return null;

  const sizeFt = tipo === "40" || tipo === "45" ? 40 : 20;

  const { position, rotationY, sizeMeters } = slotToWorld(
    {
      lane: parsed.lane,
      index: parsed.index,
      tier: parsed.tier,
      sizeFt,
    },
    {
      abcOffsetX: 0,
      defOffsetX: 0,
      abcToDefGap: -10,
      abcNumbersReversed: false,
    }
  );

  return (
    <mesh position={position} rotation-y={rotationY}>
      <boxGeometry
        args={[
          sizeMeters.len * 0.9, // puțin mai mic decât slotul
          sizeMeters.ht * 0.9,
          sizeMeters.wid * 0.9,
        ]}
      />
      <meshStandardMaterial
        color={sizeFt === 20 ? "#22c55e" : "#3b82f6"}
        metalness={0.2}
        roughness={0.4}
      />
    </mesh>
  );
}

/**
 * Ground simplu pentru referință
 */
function MiniGround() {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial color="#111827" roughness={0.9} />
    </mesh>
  );
}

/**
 * Scena 3D propriu-zisă
 */
function MiniMapScene({ slotMap }) {
  const items = useMemo(
    () =>
      Object.entries(slotMap || {}).map(([key, value]) => ({
        key,
        tipo: value?.tipo || "20",
      })),
    [slotMap]
  );

  return (
    <>
      {/* 💡 LUMINI */}
      <ambientLight intensity={0.55} />
      <directionalLight
        intensity={0.9}
        position={[12, 20, 10]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight
        intensity={0.35}
        skyColor={"#e5e7eb"}
        groundColor={"#020617"}
      />

      <MiniGround />

      {items.map((it) => (
        <MiniContainer key={it.key} slotKey={it.key} tipo={it.tipo} />
      ))}

      <OrbitControls
        enablePan={false}
        maxPolarAngle={Math.PI / 2.15}
        minPolarAngle={0.4}
      />
    </>
  );
}

/**
 * Popup 3D MiniMap
 */
export default function DepotMiniMap3D({ slotMap, onClose }) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      ariaLabel="Mapa rápida 3D del depósito"
      fillOnMobile
    >
      {/* Header identic cu restul modalelor */}
      <div className={shell.slotHeader}>
        <h3 style={{ margin: 0 }}>Mapa rápida 3D</h3>
        <button
          type="button"
          className={shell.closeIcon}
          onClick={onClose}
          aria-label="Cerrar mapa 3D"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className={shell.slotContent}>
        <div
          style={{
            width: "100%",
            maxWidth: "640px",
            height: "360px",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 18px 40px rgba(0,0,0,.55)",
            background: "radial-gradient(circle at top, #111827 0, #020617 60%)",
          }}
        >
          <Canvas
            shadows
            camera={{ position: [18, 20, 24], fov: 45, near: 0.1, far: 200 }}
          >
            {/* Ușor fog pentru profunzime */}
            <fog attach="fog" args={["#020617", 20, 90]} />
            <MiniMapScene slotMap={slotMap} />
          </Canvas>
        </div>

        <p
          style={{
            marginTop: 8,
            fontSize: 12,
            opacity: 0.75,
          }}
        >
          Verde = 20&apos;, Albastru = 40&apos;/45&apos;. Poziții ABC orizontal, DEF
          vertical.
        </p>
      </div>
    </Modal>
  );
}