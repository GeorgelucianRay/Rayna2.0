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
import createFirstPerson from '../threeWorld/firstPerson';

import createBuildController from '../world/buildController';
import styles from '../Map3DStandalone.module.css';

const YARD_WIDTH = 90, YARD_DEPTH = 60, YARD_COLOR = 0x9aa0a6;
const SLOT_LEN = 6.06, SLOT_GAP = 0.06, STEP = SLOT_LEN + SLOT_GAP;
const ABC_CENTER_OFFSET_X = 5 * STEP;
const CFG = {
  ground: { width: YARD_WIDTH, depth: YARD_DEPTH, color: YARD_COLOR, abcOffsetX: ABC_CENTER_OFFSET_X, defOffsetX: 32.3, abcToDefGap: -6.2 },
  fence:  { margin: 2, postEvery: 10, gate: { side: 'west', width: 10, centerZ: -6.54, tweakZ: 0 } },
};

export function useDepotScene({ mountRef }) {
  const [isFP, setIsFP] = useState(false);
  const [containers, setContainers] = useState([]);
  const [buildActive, setBuildActive] = useState(false);

  // refs interne
  const cameraRef = useRef();
  const controlsRef = useRef();
  const fpRef = useRef(null);
  const buildRef = useRef(null);

  const clockRef = useRef(new THREE.Clock());
  const isFPRef = useRef(false);

  // menținem sincronizat buildActive în closures
  const buildActiveRef = useRef(false);
  useEffect(() => { buildActiveRef.current = buildActive; }, [buildActive]);

  // FP on/off
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

  // Build API expus "în sus"
  const [buildMode, setBuildMode] = useState('place'); // 'place' | 'remove'
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
    // ⬇️ folosite de BuildPalette
    get controller() { return buildRef.current; },
    get active() { return buildActiveRef.current; },
  }), [buildMode]);

  // callback selectare container
  const onContainerSelectedRef = useRef(null);
  const setOnContainerSelected = useCallback((fn) => { onContainerSelectedRef.current = fn; }, []);

  // bounds FP
  const bounds = useMemo(() => ({
    minX: -YARD_WIDTH / 2 + 2,
    maxX:  YARD_WIDTH / 2 - 2,
    minZ: -YARD_DEPTH / 2 + 2,
    maxZ:  YARD_DEPTH / 2 - 2,
  }), []);

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // scene & camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(20, 8, 20);
    cameraRef.current = camera;

    // orbit
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    // FP
    fpRef.current = createFirstPerson(camera, bounds);

    // lume
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 5); scene.add(dir);
    scene.add(createSky({ scene, renderer, hdrPath: '/textures/lume/golden_gate_hills_1k.hdr', exposure: 1.1 }));
    scene.add(createLandscape({ ground: CFG.ground }));

    // world editabil
    const worldGroup = new THREE.Group(); worldGroup.name = 'worldGroup';
    scene.add(worldGroup);

    // curte + gard
    const depotGroup = new THREE.Group();
    const groundNode = createGround(CFG.ground);
    const groundMesh = groundNode.userData?.groundMesh || groundNode; // pentru raycast
    const fence = createFence({ ...CFG.fence, width: YARD_WIDTH - 4, depth: YARD_DEPTH - 4 });
    depotGroup.add(groundNode, fence);
    scene.add(depotGroup);

    // build controller
    buildRef.current = createBuildController({
      camera, domElement: renderer.domElement, worldGroup, groundMesh, grid: 1
    });
    buildRef.current?.setMode(buildMode);

    // containere
    (async () => {
      try {
        const data = await fetchContainers();
        setContainers(data.containers || []);
        depotGroup.add(createContainersLayerOptimized(data, CFG.ground));
      } catch (e) { console.warn('fetchContainers', e); }
    })();

    // pick containere (dezactivat în build)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (event) => {
      if (event.target.closest?.(`.${styles.searchContainer}`)) return;
      if (buildActiveRef.current) return;
      const rect = mount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(depotGroup.children, true);
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

    // ---------- INPUT BUILD: desktop + touch ----------
    const isOverBuildUI = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return !!el?.closest?.('[data-build-ui="true"]');
    };

    const handleMove = (x, y) => {
      if (!buildActiveRef.current || !buildRef.current) return;
      buildRef.current.updatePreviewAt(x, y);
    };

    const handleClick = (x, y) => {
      if (!buildActiveRef.current || !buildRef.current) return;
      if (isOverBuildUI(x, y)) return;
      buildRef.current.clickAt(x, y);
    };

    // desktop
    const onPointerMove = (e) => handleMove(e.clientX, e.clientY);
    const onPointerDown = (e) => handleClick(e.clientX, e.clientY);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // touch
    const onTouchMove = (e) => { const t = e.touches?.[0]; if (t) handleMove(t.clientX, t.clientY); };
    const onTouchStart = (e) => { const t = e.touches?.[0]; if (t) handleClick(t.clientX, t.clientY); };
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    // --------------------------------------------------

    // loop
    const minX = -YARD_WIDTH/2 + 5, maxX = YARD_WIDTH/2 + 5;
    const minZ = -YARD_DEPTH/2 + 5, maxZ = YARD_DEPTH/2 + 5;
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();

      if (buildActiveRef.current) {
        buildRef.current?.updatePreview?.();
      }

      if (isFPRef.current) {
        fpRef.current?.update(delta);
      } else {
        controls.update();
        controls.target.x = THREE.MathUtils.clamp(controls.target.x, minX, maxX);
        controls.target.z = THREE.MathUtils.clamp(controls.target.z, minZ, maxZ);
      }
      renderer.render(scene, camera);
    };
    animate();

    // resize
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w/h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // cleanup
    return () => {
      mount.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      fpRef.current?.removeKeyboard();
      renderer.dispose();
    };
  }, []); // mount once

  // Orbit ON/OFF când intri/ieși din build / FP
  useEffect(() => {
    const orbit = controlsRef.current; if (!orbit) return;
    orbit.enabled = !buildActive && !isFPRef.current;
    // când intri în build, ascute preview-ul dacă avem pointer
    if (buildActive) {
      buildRef.current?.setMode(buildMode);
    } else {
      buildRef.current?.disable(); // curăță preview-ul
    }
  }, [buildActive, buildMode]);

  return {
    isFP,
    setFPEnabled,
    setForwardPressed,
    setJoystick,
    buildActive,
    setBuildActive,
    buildApi,
    containers,
    openWorldItems: () => console.log('[WorldItems] open (TODO Modal)'),
    setOnContainerSelected,
  };
}