// src/components/depot/components/DepotMiniMap3D.jsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { slotToWorld } from "../map/threeWorld/slotToWorld.js";

export default function DepotMiniMap3D({ slotMap }) {
  const [open, setOpen] = useState(false);
  const mountRef = useRef(null);

  useEffect(() => {
    if (!open || !mountRef.current) return;

    const mountEl = mountRef.current;
    const width = mountEl.clientWidth || 600;
    const height = mountEl.clientHeight || 400;

    // --- SCENĂ + CAMERĂ + RENDERER ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827); // cer întunecat albastru

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(16, 18, 22);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountEl.appendChild(renderer.domElement);

    // --- LUMINI (cer + direcțională) ---
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x202030, 0.9);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(10, 18, 8);
    dirLight.castShadow = false;
    scene.add(dirLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambient);

    // --- GROUND / PLATFORMĂ ---
    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0b1120,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    // Mic grid discret
    const grid = new THREE.GridHelper(40, 20, 0x4b5563, 0x1f2933);
    grid.position.y = 0.01;
    scene.add(grid);

    // --- GRUP DE CUBURI SLOTURI ---
    const cubesGroup = new THREE.Group();
    scene.add(cubesGroup);

    // Materiale reutilizabile
    const matFree = new THREE.MeshStandardMaterial({
      color: 0x22c55e,        // verde
      transparent: true,
      opacity: 0.35,
      roughness: 0.7,
      metalness: 0.1,
    });

    const matOccupied = new THREE.MeshStandardMaterial({
      color: 0xef4444,        // roșu
      transparent: true,
      opacity: 0.95,
      roughness: 0.5,
      metalness: 0.2,
    });

    const boxGeo = new THREE.BoxGeometry(5.5, 2.8, 2.6); // aproximativ container 20'

    const lanes = ["A", "B", "C", "D", "E", "F"];

    lanes.forEach((lane) => {
      const isABC = ["A", "B", "C"].includes(lane);
      const max = isABC ? 10 : 7;

      for (let index = 1; index <= max; index += 1) {
        const slotKey = `${lane}${index}A`;
        const occupiedInfo = slotMap?.[slotKey] || null;

        // folosim slotToWorld pentru poziție
        let world;
        try {
          world = slotToWorld(
            { lane, index, tier: "A", sizeFt: 20 },
            {
              abcOffsetX: 0,
              defOffsetX: 0,
              abcToDefGap: -6,
              abcNumbersReversed: false,
            }
          );
        } catch (err) {
          // dacă ceva e invalid, sărim slotul
          // console.warn("slotToWorld error", slotKey, err);
          continue;
        }

        const mesh = new THREE.Mesh(
          boxGeo,
          occupiedInfo ? matOccupied.clone() : matFree.clone()
        );

        mesh.position.copy(world.position);
        mesh.rotation.y = world.rotationY;
        mesh.userData.slotKey = slotKey;
        mesh.userData.container = occupiedInfo || null;
        cubesGroup.add(mesh);
      }
    });

    // --- ANIMAȚIE ---
    let frameId;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // ușoară rotație pentru efect 3D mai clar
      cubesGroup.rotation.y = Math.sin(t * 0.25) * 0.2;

      renderer.render(scene, camera);
    };
    animate();

    // --- CLICK PICKING ---
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      pointer.set(x, y);

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(cubesGroup.children, false);

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        const { slotKey, container } = obj.userData;
        if (!slotKey) return;

        if (container) {
          const cid = (container.matricula_contenedor || "").toUpperCase();
          alert(
            `Posición: ${slotKey}\nContenedor: ${cid || "desconocido"}`
          );
        } else {
          alert(`Posición libre: ${slotKey}`);
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);

    // --- HANDLE RESIZE ---
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || width;
      const h = mountRef.current.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // --- CLEANUP ---
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
      mountEl.removeChild(renderer.domElement);

      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose && m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [open, slotMap]);

  // ─────────────────────────────────────────────
  // UI: buton + popup modal
  // ─────────────────────────────────────────────
  return (
    <>
      {/* mic buton sub toolbar */}
      <div style={{ margin: "8px 0 4px" }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.7)",
            background: "rgba(15,23,42,0.85)",
            color: "#e5e7eb",
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <span>🧊 Ver mini-mapa 3D de slots</span>
        </button>
      </div>

      {/* Modal 3D */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 900,
              height: "70vh",
              maxHeight: 620,
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid rgba(148,163,184,0.6)",
              background:
                "radial-gradient(circle at top, #1e293b 0, #020617 55%, #000 100%)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.65)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div
              style={{
                position: "absolute",
                insetInline: 0,
                top: 0,
                padding: "8px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                zIndex: 10,
                background:
                  "linear-gradient(to bottom, rgba(15,23,42,0.95), rgba(15,23,42,0))",
              }}
            >
              <div style={{ fontSize: 13, color: "#e5e7eb" }}>
                Mini-mapa 3D · A-F / nivel A
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "999px",
                  border: "1px solid rgba(148,163,184,0.7)",
                  background: "rgba(15,23,42,0.9)",
                  color: "#e5e7eb",
                  fontSize: 16,
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* legendă */}
            <div
              style={{
                position: "absolute",
                left: 12,
                bottom: 10,
                zIndex: 10,
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.88)",
                border: "1px solid rgba(148,163,184,0.7)",
                display: "flex",
                gap: 10,
                alignItems: "center",
                fontSize: 11,
                color: "#cbd5f5",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: "#22c55e",
                  opacity: 0.6,
                }}
              />{" "}
              Libre
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: "#ef4444",
                  opacity: 0.95,
                  marginLeft: 8,
                }}
              />{" "}
              Ocupado (contenedor)
            </div>

            {/* container canvas */}
            <div
              ref={mountRef}
              style={{
                width: "100%",
                height: "100%",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}