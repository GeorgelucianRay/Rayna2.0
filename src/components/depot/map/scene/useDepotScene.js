// src/components/depot/map/scene/useDepotScene.js
import * as THREE from 'three';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import createGround from '../threeWorld/createGround';
import createFence from '../threeWorld/createFence';
import createContainersLayerOptimized from '../threeWorld/createContainersLayerOptimized';
import fetchContainers from '../threeWorld/fetchContainers';
import createSky from '../threeWorld/createSky';
import createLandscape from '../threeWorld/createLandscape';
import createBaseWorld from '../threeWorld/createBaseWorld';
import createFirstPerson from '../threeWorld/firstPerson';

import createBuildController from '../world/buildController';
import styles from '../Map3DStandalone.module.css';

// ===== Config curte =====
const YARD_WIDTH = 90, YARD_DEPTH = 60, YARD_COLOR = 0x9aa0a6;
const SLOT_LEN = 6.06, SLOT_GAP = 0.06, STEP = SLOT_LEN + SLOT_GAP;
const ABC_CENTER_OFFSET_X = 5 * STEP;
const CFG = {
  ground: { width: YARD_WIDTH, depth: YARD_DEPTH, color: YARD_COLOR, abcOffsetX: ABC_CENTER_OFFSET_X, defOffsetX: 32.3, abcToDefGap: -6.2 },
  fence:  { margin: 2, postEvery: 10, gate: { side: 'west', width: 10, centerZ: -6.54, tweakZ: 0 } },
};

// ===== Helper =====
function collectMeshes(root, { excludeNameIncludes = [] } = {}) {
  const out = [];
  if (!root) return out;
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const nm = (obj.name || '').toLowerCase();
    for (const frag of excludeNameIncludes) {
      if (nm.includes(frag.toLowerCase())) return;
    }
    out.push(obj);
  });
  return out;
}

export function useDepotScene({ mountRef }) {
  const [isFP, setIsFP] = useState(false);
  const [containers, setContainers] = useState([]);
  const [buildActive, setBuildActive] = useState(false);

  const cameraRef = useRef();
  const controlsRef = useRef();
  const fpRef = useRef(null);
  const buildRef = useRef(null);
  const containersLayerRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());

  const isFPRef = useRef(false);
  const buildActiveRef = useRef(false);
  useEffect(() => { buildActiveRef.current = buildActive; }, [buildActive]);

  // FP toggles
  const setFPEnabled = useCallback((enabled) => {
    const orbit = controlsRef.current;
    if (!orbit || !fpRef.current) return;
    if (enabled) {
      orbit.enabled = false;
      fpRef.current.enable();
      fpRef.current.addKeyboard();
      isFPRef.current = true; setIsFP(true);
    } else {
      fpRef.current.disable();
      fpRef.current.removeKeyboard();
      orbit.enabled = !buildActiveRef.current;
      isFPRef.current = false; setIsFP(false);
    }
  }, []);
  const setForwardPressed = useCallback(v => fpRef.current?.setForwardPressed(v), []);
  const setJoystick = useCallback(v => fpRef.current?.setJoystick(v), []);

  const [buildMode, setBuildMode] = useState('place');
  const buildApi = useMemo(() => ({
    get mode() { return buildMode; },
    setMode: (m) => { setBuildMode(m); buildRef.current?.setMode(m); },
    rotateStep: (dir) => buildRef.current?.rotateStep(dir),
    setType: (t) => buildRef.current?.setType(t),
    finalizeJSON: () => {
      try {
        const raw = localStorage.getItem('rayna.world.edits') || '{"props":[]}';
        return JSON.stringify(JSON.parse(raw), null, 2);
      } catch { return '{"props":[]}'; }
    },
    get controller() { return buildRef.current; },
    get active() { return buildActiveRef.current; },
  }), [buildMode]);

  const onContainerSelectedRef = useRef(null);
  const setOnContainerSelected = useCallback((fn) => { onContainerSelectedRef.current = fn; }, []);

  const bounds = useMemo(() => ({
    minX: -YARD_WIDTH / 2 + 2,
    maxX:  YARD_WIDTH / 2 - 2,
    minZ: -YARD_DEPTH / 2 + 2,
    maxZ:  YARD_DEPTH / 2 - 2,
  }), []);

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;

    // ===== Renderer (OPTIMIZAT) =====
    const renderer = new THREE.WebGLRenderer({
      antialias: false, alpha: true, powerPreference: 'high-performance'
    });
    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(DPR);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false; // fără umbre globale
    mount.appendChild(renderer.domElement);

    // ===== Scene & Camera =====
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth/mount.clientHeight, 0.1, 1000);
    camera.position.set(20, 8, 20);
    cameraRef.current = camera;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    // First Person
    fpRef.current = createFirstPerson(camera, bounds, {
      eyeHeight: 1.7,
      stepMax: 0.6,
      slopeMax: Math.tan(40 * Math.PI/180),
    });

    // ===== Lumină =====
    const hemi = new THREE.HemisphereLight(0xffffff, 0x666666, 0.9);
    const dir = new THREE.DirectionalLight(0xffffff, 0.5);
    dir.position.set(5,10,5);
    scene.add(hemi, dir);
    scene.add(createSky({ scene, renderer, hdrPath: '/textures/lume/golden_gate_hills_1k.hdr', exposure: 1.0 }));

    // ===== Static Scene =====
    const landscape = createLandscape({ ground: CFG.ground });
    const baseWorld = createBaseWorld();
    const worldGroup = new THREE.Group(); worldGroup.name = 'worldGroup';
    scene.add(landscape, baseWorld, worldGroup);

    // ===== Ground + Fence =====
    const depotGroup = new THREE.Group();
    const groundNode = createGround(CFG.ground);
    const groundMesh = groundNode.userData?.groundMesh || groundNode;

    const fence = createFence({
      width: YARD_WIDTH - 4,
      depth: YARD_DEPTH - 4,
      margin: 2,
      postEvery: 10,
      openings: { west: [{ z: -4, width: 4 }, { z: -7, width: 4 }, { z: -9, width: 4 }], east: [], north: [], south: [] }
    });
    depotGroup.add(groundNode, fence);
    scene.add(depotGroup);

    // ===== Build Controller =====
    buildRef.current = createBuildController({
      camera, domElement: renderer.domElement, worldGroup,
      groundMesh, raycastTargets: [
        ...(groundNode.userData?.raycastTargets || [groundMesh]),
        baseWorld, landscape
      ], grid: 1
    });
    buildRef.current?.setMode(buildMode);
    buildRef.current?.setType?.('road.segment');

    // ===== Containere =====
    (async () => {
      try {
        const data = await fetchContainers();
        setContainers(data.containers || []);
        const layer = createContainersLayerOptimized(data, CFG.ground);
        containersLayerRef.current = layer;
        depotGroup.add(layer);
      } catch (e) { console.warn('fetchContainers', e); }
    })();

    // ===== Walkables + Colliders =====
    const walkables = [groundMesh, baseWorld, worldGroup, landscape];
    fpRef.current.setWalkables?.(walkables);

    const colliders = [baseWorld, worldGroup, fence];
    const solids = [
      ...collectMeshes(landscape, { excludeNameIncludes: ['grass'] }),
      ...collectMeshes(baseWorld, { excludeNameIncludes: ['grass'] })
    ];
    colliders.push(...solids);

    const attachCollidersWhenReady = () => {
      const layer = containersLayerRef.current;
      const colGroup = layer?.userData?.colliders;
      if (colGroup) colliders.push(colGroup);
      else setTimeout(attachCollidersWhenReady, 50);
    };
    attachCollidersWhenReady();
    fpRef.current.setCollisionTargets?.(colliders);

    // ===== Raycast simplificat =====
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (event) => {
      if (event.target.closest?.(`.${styles.searchContainer}`)) return;
      if (buildActiveRef.current) return;
      const rect = mount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects([containersLayerRef.current].filter(Boolean), true);
      if (intersects.length > 0) {
        const hit = intersects[0], obj = hit.object;
        if (obj.isInstancedMesh && obj.userData?.records && hit.instanceId != null) {
          const rec = obj.userData.records[hit.instanceId];
          onContainerSelectedRef.current?.(rec || null);
          return;
        }
        if (obj.userData?.__record) { onContainerSelectedRef.current?.(obj.userData.__record); return; }
      }
      onContainerSelectedRef.current?.(null);
    };
    mount.addEventListener('click', onClick);

    // ===== Input build =====
    const isOverBuildUI = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return !!el?.closest?.('[data-build-ui="true"]');
    };
    const handleMove = (x, y) => { if (!buildActiveRef.current) return; buildRef.current?.updatePreviewAt(x, y); };
    const handleClick = (x, y) => { if (!buildActiveRef.current || isOverBuildUI(x, y)) return; buildRef.current?.clickAt(x, y); };

    renderer.domElement.addEventListener('pointermove', e => handleMove(e.clientX, e.clientY));
    renderer.domElement.addEventListener('pointerdown', e => handleClick(e.clientX, e.clientY));

    renderer.domElement.addEventListener('touchmove', e => {
      const t = e.touches?.[0]; if (!t) return; handleMove(t.clientX, t.clientY);
    }, { passive: true });
    renderer.domElement.addEventListener('touchstart', e => {
      const t = e.touches?.[0]; if (!t) return; handleClick(t.clientX, t.clientY);
    }, { passive: true });

    // ===== Render Loop (cu skip idle) =====
    let last = 0;
    const TARGET = 1000 / 45; // ~45fps
    const animate = (now = 0) => {
      requestAnimationFrame(animate);
      if (!isFPRef.current && !buildActiveRef.current) {
        if (now - last < TARGET) return;
        last = now;
      }
      const delta = clockRef.current.getDelta();
      if (buildActiveRef.current) buildRef.current?.updatePreview?.();
      if (isFPRef.current) fpRef.current?.update(delta);
      else controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // ===== Resize =====
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ===== Visibility Pause =====
    const onVis = () => renderer.setAnimationLoop(document.hidden ? null : animate);
    document.addEventListener('visibilitychange', onVis);

    // ===== Cleanup =====
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      mount.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      fpRef.current?.removeKeyboard();
      renderer.dispose();
    };
  }, []);

  // Orbit ON/OFF toggle
  useEffect(() => {
    const orbit = controlsRef.current; if (!orbit) return;
    orbit.enabled = !buildActive && !isFPRef.current;
  }, [buildActive]);

  return {
    isFP, setFPEnabled, setForwardPressed, setJoystick,
    buildActive, setBuildActive, buildApi, containers,
    openWorldItems: () => console.log('[WorldItems] open (TODO Modal)'),
    setOnContainerSelected,
  };
}