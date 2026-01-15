// src/components/depot/map/scene/useWorldBase.js
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import createGround from "../threeWorld/createGround";
import createFence from "../threeWorld/createFence";
import createSky from "../threeWorld/createSky";
import createLandscape from "../threeWorld/createLandscape";
import createBaseWorld from "../threeWorld/createBaseWorld";

function collectMeshes(root, { excludeNameIncludes = [] } = {}) {
  const out = [];
  if (!root) return out;
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const nm = (obj.name || "").toLowerCase();
    for (const frag of excludeNameIncludes) {
      if (nm.includes(String(frag).toLowerCase())) return;
    }
    out.push(obj);
  });
  return out;
}

/**
 * Creează baza scenei (renderer/scene/camera/orbit + ground/fence + baseWorld/landscape/sky + groups).
 * Nu conține containere, build, selection, FP logic (astea vin în pașii următori).
 */
export function useWorldBase({ mountRef, cfg, yard }) {
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);

  const depotGroupRef = useRef(null);
  const worldGroupRef = useRef(null);

  const groundNodeRef = useRef(null);
  const groundMeshRef = useRef(null);
  const fenceRef = useRef(null);

  const landscapeRef = useRef(null);
  const baseWorldRef = useRef(null);

  const baseCollidersRef = useRef([]);

  useEffect(() => {
    const mount = mountRef?.current;
    if (!mount) return;

    // --- renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // --- scene ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // --- camera ---
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(20, 8, 20);
    cameraRef.current = camera;

    // --- orbit ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.minPolarAngle = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 4;
    controls.maxDistance = Math.max(yard.width, yard.depth);
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    // --- lights ---
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 5);
    scene.add(dir);

    // --- sky / landscape / baseWorld ---
    // sky
    scene.add(
      createSky({
        scene,
        renderer,
        hdrPath: "/textures/lume/golden_gate_hills_1k.hdr",
        exposure: 1.1,
      })
    );

    // landscape
    const landscape = createLandscape({ ground: cfg.ground });
    landscapeRef.current = landscape;
    scene.add(landscape);

    // baseWorld
    const baseWorld = createBaseWorld();
    baseWorldRef.current = baseWorld;
    scene.add(baseWorld);

    // --- groups ---
    const worldGroup = new THREE.Group();
    worldGroup.name = "worldGroup";
    worldGroupRef.current = worldGroup;
    scene.add(worldGroup);

    const depotGroup = new THREE.Group();
    depotGroup.name = "depotGroup";
    depotGroupRef.current = depotGroup;
    scene.add(depotGroup);

    // --- ground + fence ---
    const groundNode = createGround(cfg.ground);
    const groundMesh = groundNode.userData?.groundMesh || groundNode;
    groundNodeRef.current = groundNode;
    groundMeshRef.current = groundMesh;

    const fence = createFence({
      width: yard.width - 4,
      depth: yard.depth - 4,
      margin: 2,
      postEvery: 10,
      openings: {
        west: [
          { z: -4, width: 4 },
          { z: -7, width: 4 },
          { z: -9, width: 4 },
        ],
        east: [],
        north: [],
        south: [],
      },
    });
    fenceRef.current = fence;

    depotGroup.add(groundNode, fence);

    // --- base colliders (fără containere; fără build props încă) ---
    const landscapeSolids = collectMeshes(landscape, { excludeNameIncludes: ["grass"] });
    const baseWorldSolids = collectMeshes(baseWorld, { excludeNameIncludes: ["grass"] });
    baseCollidersRef.current = [baseWorld, ...baseWorldSolids, worldGroup, fence, ...landscapeSolids];

    // --- loop (doar orbit update + render; pașii următori vor “injecta” FP/build logic în orchestrator) ---
    let raf = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      clock.getDelta(); // păstrăm pentru consistență (FP/build vor folosi delta ulterior)
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);

      controls.dispose?.();
      renderer.dispose();

      // detach canvas
      try {
        mount.removeChild(renderer.domElement);
      } catch {}

      // clear refs
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      depotGroupRef.current = null;
      worldGroupRef.current = null;
      groundNodeRef.current = null;
      groundMeshRef.current = null;
      fenceRef.current = null;
      landscapeRef.current = null;
      baseWorldRef.current = null;
      baseCollidersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // core
    rendererRef,
    sceneRef,
    cameraRef,
    controlsRef,

    // groups
    depotGroupRef,
    worldGroupRef,

    // ground/fence
    groundNodeRef,
    groundMeshRef,
    fenceRef,

    // environment
    landscapeRef,
    baseWorldRef,

    // colliders
    baseCollidersRef,
  };
}