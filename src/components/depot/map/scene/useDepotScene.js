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
import { slotToWorld } from '../threeWorld/slotToWorld';

import createBuildController from '../world/buildController';
import styles from '../Map3DStandalone.module.css';

// ===== Config curte =====
const YARD_WIDTH = 90, YARD_DEPTH = 60, YARD_COLOR = 0x9aa0a6;
const SLOT_LEN = 6.06, SLOT_GAP = 0.06, STEP = SLOT_LEN + SLOT_GAP;
const ABC_CENTER_OFFSET_X = 5 * STEP;

const CFG = {
  ground: {
    width: YARD_WIDTH,
    depth: YARD_DEPTH,
    color: YARD_COLOR,
    abcOffsetX: ABC_CENTER_OFFSET_X,
    defOffsetX: 32.3,
    abcToDefGap: -6.2,
    abcNumbersReversed: true,
  },
  fence: { margin: 2, postEvery: 10, gate: { side: 'west', width: 10, centerZ: -6.54, tweakZ: 0 } },
};

// ===== Helper: colectează mesh-uri (poți exclude după nume) =====
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
  // expus în sus
  const [isFP, setIsFP] = useState(false);
  const [containers, setContainers] = useState([]);
  const [buildActive, setBuildActive] = useState(false);

  // === ORBIT LIBRE ===
  const [orbitLibre, setOrbitLibre] = useState(false);
  const orbitLibreRef = useRef(false);
  useEffect(() => { orbitLibreRef.current = orbitLibre; }, [orbitLibre]);

  // refs interne
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const fpRef = useRef(null);
  const buildRef = useRef(null);
  const containersLayerRef = useRef(null);

  const clockRef = useRef(new THREE.Clock());
  const isFPRef = useRef(false);
  const buildActiveRef = useRef(false);
  useEffect(() => { buildActiveRef.current = buildActive; }, [buildActive]);

  // margini „hard” ale curții (mic pad)
  const yardPad = 0.5;
  const yardMinX = -YARD_WIDTH / 2 + yardPad;
  const yardMaxX =  YARD_WIDTH / 2 - yardPad;
  const yardMinZ = -YARD_DEPTH / 2 + yardPad;
  const yardMaxZ =  YARD_DEPTH / 2 - yardPad;

  // parametri orbit libre
  const autoOrbitRef = useRef({
    angle: 0,
    speed: Math.PI / 28,
    radius: Math.hypot(YARD_WIDTH, YARD_DEPTH) * 0.55,
    height: 10,
    target: new THREE.Vector3(0, 1, 0),
    clockwise: true,
  });

  function clampOrbit(camera, controls) {
    if (!camera || !controls) return;
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, yardMinX, yardMaxX);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, yardMinZ, yardMaxZ);

    if (camera.position.y < 0.5) camera.position.y = 0.5;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, yardMinX, yardMaxX);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, yardMinZ, yardMaxZ);
  }

  // FP bounds
  const bounds = useMemo(() => ({
    minX: -YARD_WIDTH / 2 + 2,
    maxX:  YARD_WIDTH / 2 - 2,
    minZ: -YARD_DEPTH / 2 + 2,
    maxZ:  YARD_DEPTH / 2 - 2,
  }), []);

  // FP on/off
  const setFPEnabled = useCallback((enabled) => {
    const orbit = controlsRef.current;
    if (!orbit || !fpRef.current) return;

    if (enabled) {
      setOrbitLibre(false);
      orbit.enabled = false;
      fpRef.current.enable();
      fpRef.current.addKeyboard();
      isFPRef.current = true;
      setIsFP(true);
    } else {
      fpRef.current.disable();
      fpRef.current.removeKeyboard();
      orbit.enabled = !buildActiveRef.current;
      isFPRef.current = false;
      setIsFP(false);
    }
  }, []);

  const setForwardPressed = useCallback(v => fpRef.current?.setForwardPressed(v), []);
  const setJoystick = useCallback(v => fpRef.current?.setJoystick(v), []);

  // Build API
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

  // select container callback
  const onContainerSelectedRef = useRef(null);
  const setOnContainerSelected = useCallback((fn) => { onContainerSelectedRef.current = fn; }, []);

  // ===== Focus camera on container (smooth) =====
  const focusCameraOnContainer = useCallback((container, opts = {}) => {
    if (!container || !cameraRef.current || !controlsRef.current) return;

    setOrbitLibre(false);
    setFPEnabled(false);

    const slot = container.pos || container.posicion;
    if (!slot || typeof slot !== 'string') return;

    const idx = parseInt(slot.match(/\d+/)?.[0] || '0', 10);
    const lane = slot[0];
    const tier = slot.match(/[A-Z]$/)?.[0] || 'A';

    const wp = slotToWorld(
      { lane, index: idx, tier },
      CFG.ground
    );
    if (!wp?.position) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const target = wp.position.clone(); target.y = 1.5;
    const desiredPos = target.clone().add(new THREE.Vector3(6, 4, 6));

    const duration = opts?.smooth ? 900 : 0;

    if (!duration) {
      controls.target.copy(target);
      camera.position.copy(desiredPos);
      controls.update();
      clampOrbit(camera, controls);
      return;
    }

    const t0 = performance.now();
    const start = {
      x: camera.position.x, y: camera.position.y, z: camera.position.z,
      tx: controls.target.x, ty: controls.target.y, tz: controls.target.z,
    };
    const end = {
      x: desiredPos.x, y: desiredPos.y, z: desiredPos.z,
      tx: target.x, ty: target.y, tz: target.z,
    };

    function step(now) {
      const t = Math.min(1, (now - t0) / duration);
      const e = t * (2 - t); // easeOutQuad

      camera.position.set(
        start.x + (end.x - start.x) * e,
        start.y + (end.y - start.y) * e,
        start.z + (end.z - start.z) * e
      );
      controls.target.set(
        start.tx + (end.tx - start.tx) * e,
        start.ty + (end.ty - start.ty) * e,
        start.tz + (end.tz - start.tz) * e
      );
      controls.update();
      clampOrbit(camera, controls);

      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [setFPEnabled]);

  // ===== Zoom API (OrbitControls) =====
  const zoomBy = useCallback((factor) => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;

    if (isFPRef.current) return;     // nu zoom în FP
    if (buildActiveRef.current) return; // opțional: nu zoom în build

    setOrbitLibre(false);

    // OrbitControls: dollyIn/out
    if (factor > 1) controls.dollyIn(factor);
    else controls.dollyOut(1 / factor);

    controls.update();
    clampOrbit(camera, controls);
  }, []);

  const zoomIn = useCallback(() => zoomBy(1.18), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / 1.18), [zoomBy]);

  const recenter = useCallback(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;

    setOrbitLibre(false);
    setFPEnabled(false);

    controls.target.set(0, 1, 0);
    camera.position.set(20, 8, 20);
    controls.update();
    clampOrbit(camera, controls);
  }, [setFPEnabled]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ===== Renderer =====
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // ===== Scene & Camera =====
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(20, 8, 20);
    cameraRef.current = camera;

    // Orbit
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.minPolarAngle = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 4;
    controls.maxDistance = Math.max(YARD_WIDTH, YARD_DEPTH);
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    // FP
    fpRef.current = createFirstPerson(camera, bounds, {
      eyeHeight: 1.7,
      stepMax: 0.6,
      slopeMax: Math.tan(40 * Math.PI / 180),
    });

    // ===== Lights / Env =====
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 5);
    scene.add(dir);

    scene.add(createSky({
      scene,
      renderer,
      hdrPath: '/textures/lume/golden_gate_hills_1k.hdr',
      exposure: 1.1
    }));

    // ===== Landscape / Base / WorldGroup =====
    const landscape = createLandscape({ ground: CFG.ground });
    scene.add(landscape);

    const baseWorld = createBaseWorld();
    scene.add(baseWorld);

    const worldGroup = new THREE.Group();
    worldGroup.name = 'worldGroup';
    scene.add(worldGroup);

    // ===== Ground + Fence =====
    const depotGroup = new THREE.Group();

    const groundNode = createGround(CFG.ground);
    const groundMesh = groundNode.userData?.groundMesh || groundNode;

    const fence = createFence({
      width: YARD_WIDTH - 4,
      depth: YARD_DEPTH - 4,
      margin: 2,
      postEvery: 10,
      openings: {
        west: [
          { z: -4, width: 4 },
          { z: -7, width: 4 },
          { z: -9, width: 4 },
        ],
        east: [], north: [], south: [],
      }
    });

    depotGroup.add(groundNode, fence);
    scene.add(depotGroup);

    // ===== Build controller =====
    buildRef.current = createBuildController({
      camera,
      domElement: renderer.domElement,
      worldGroup,
      groundMesh,
      raycastTargets: [
        ...(groundNode.userData?.raycastTargets || [groundMesh]),
        baseWorld,
        landscape
      ],
      grid: 1,
    });
    buildRef.current?.setMode(buildMode);
    buildRef.current?.setType?.('road.segment');

    // ===== Containers =====
    (async () => {
      try {
        const data = await fetchContainers();
        setContainers(data?.containers || []);
        const layer = createContainersLayerOptimized(data, CFG.ground);
        containersLayerRef.current = layer;
        depotGroup.add(layer);
      } catch (e) {
        console.warn('fetchContainers', e);
      }
    })();

    // ===== FP walkables & colliders =====
    const walkables = [groundMesh, baseWorld, worldGroup, landscape];
    fpRef.current.setWalkables?.(walkables);

    const landscapeSolids = collectMeshes(landscape, { excludeNameIncludes: ['grass'] });
    const baseWorldSolids = collectMeshes(baseWorld, { excludeNameIncludes: ['grass'] });

    const colliders = [baseWorld, ...baseWorldSolids, worldGroup, fence, ...landscapeSolids];

    const attachCollidersWhenReady = () => {
      const layer = containersLayerRef.current;
      const colGroup = layer?.userData?.colliders;
      if (colGroup) colliders.push(colGroup);
      else setTimeout(attachCollidersWhenReady, 50);
    };
    attachCollidersWhenReady();

    (fpRef.current.setCollisionTargets || fpRef.current.setColliders || fpRef.current.setObstacles)?.(colliders);

    // ===== Pick containers (disabled in build) =====
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (event) => {
      // nu selecta când click e pe search UI
      if (event.target.closest?.(`.${styles.searchContainer}`)) return;
      if (buildActiveRef.current) return;

      const rect = mount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(depotGroup.children, true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const obj = hit.object;

        if (obj.isInstancedMesh && obj.userData?.records && hit.instanceId != null) {
          const rec = obj.userData.records[hit.instanceId];
          onContainerSelectedRef.current?.(rec || null);
          return;
        }

        if (obj.userData?.__record) {
          onContainerSelectedRef.current?.(obj.userData.__record);
          return;
        }
      }

      onContainerSelectedRef.current?.(null);
    };
    mount.addEventListener('click', onClick);

    // ===== Build inputs =====
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

    const onPointerMove = (e) => handleMove(e.clientX, e.clientY);
    const onPointerDown = (e) => handleClick(e.clientX, e.clientY);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const onTouchMove = (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      handleMove(t.clientX, t.clientY);
    };
    const onTouchStart = (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      handleClick(t.clientX, t.clientY);
    };
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });

    // ===== Loop =====
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();

      if (buildActiveRef.current) buildRef.current?.updatePreview?.();

      const cam = cameraRef.current;
      const ctl = controlsRef.current;

      if (isFPRef.current) {
        fpRef.current?.update(delta);
      } else {
        if (orbitLibreRef.current && cam && ctl) {
          const p = autoOrbitRef.current;
          p.angle += (p.clockwise ? 1 : -1) * p.speed * delta;
          const cx = Math.cos(p.angle) * p.radius;
          const cz = Math.sin(p.angle) * p.radius;

          ctl.target.copy(p.target);
          cam.position.set(cx, p.height, cz);
          cam.lookAt(p.target);
          ctl.update();
        } else {
          ctl?.update();
        }
        clampOrbit(cam, ctl);
      }

      renderer.render(scene, cam);
    };
    animate();

    // ===== Resize =====
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ===== Cleanup =====
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

  // Orbit enabled/disabled în build
  useEffect(() => {
    const orbit = controlsRef.current;
    if (!orbit) return;
    orbit.enabled = !buildActive && !isFPRef.current;
    if (!orbit.enabled) setOrbitLibre(false);
  }, [buildActive]);

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

    focusCameraOnContainer,

    // ✅ Zoom
    zoomIn,
    zoomOut,
    recenter,

    // ✅ Orbit libre
    startOrbitLibre: (opts = {}) => {
      setFPEnabled(false);
      setBuildActive(false);

      const p = autoOrbitRef.current;
      if (opts.speed) p.speed = opts.speed;
      if (opts.radius) p.radius = opts.radius;
      if (opts.height) p.height = opts.height;
      if (opts.clockwise != null) p.clockwise = !!opts.clockwise;

      const controls = controlsRef.current;
      if (controls) controls.target.set(0, 1, 0);

      setOrbitLibre(true);
    },
    stopOrbitLibre: () => setOrbitLibre(false),
    isOrbitLibre: orbitLibre,
  };
}