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
const STEP = 6.06 + 0.06, ABC_CENTER_OFFSET_X = 5 * STEP;
const CFG = {
  ground: { width: YARD_WIDTH, depth: YARD_DEPTH, color: YARD_COLOR, abcOffsetX: ABC_CENTER_OFFSET_X, defOffsetX: 32.3, abcToDefGap: -6.2 },
  fence:  { margin: 2, postEvery: 10, gate: { side: 'west', width: 10, centerZ: -6.54, tweakZ: 0 } },
};

export function useDepotScene({ mountRef }) {
  const [isFP, setIsFP] = useState(false);
  const [containers, setContainers] = useState([]);
  const [buildActive, setBuildActive] = useState(false);

  const cameraRef = useRef();
  const controlsRef = useRef();
  const fpRef = useRef(null);
  const buildRef = useRef(null);

  const isFPRef = useRef(false);
  const buildActiveRef = useRef(false);
  useEffect(() => { buildActiveRef.current = buildActive; }, [buildActive]);

  const clockRef = useRef(new THREE.Clock());

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
        return JSON.stringify(JSON.parse(localStorage.getItem('rayna.world.edits') || '{"props":[]}'), null, 2);
      } catch { return '{"props":[]}'; }
    }
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

    // FIX typo: antialias (nu antiasia)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth/mount.clientHeight, 0.1, 1000);
    camera.position.set(20, 8, 20);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    fpRef.current = createFirstPerson(camera, bounds);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(5,10,5); scene.add(dir);
    scene.add(createSky({ scene, renderer, hdrPath: '/textures/lume/golden_gate_hills_1k.hdr', exposure: 1.1 }));
    scene.add(createLandscape({ ground: CFG.ground }));

    const worldGroup = new THREE.Group(); worldGroup.name = 'worldGroup';
    scene.add(worldGroup);

    const depotGroup = new THREE.Group();
    const groundNode = createGround(CFG.ground);
    const groundMesh = groundNode.userData?.groundMesh || groundNode; // <- IMPORTANT pt raycast
    const fence  = createFence({ ...CFG.fence, width: YARD_WIDTH - 4, depth: YARD_DEPTH - 4 });
    depotGroup.add(groundNode, fence);
    scene.add(depotGroup);

    buildRef.current = createBuildController({
      camera, domElement: renderer.domElement, worldGroup, groundMesh, grid: 1
    });
    buildRef.current?.setMode(buildMode);

    (async () => {
      try {
        const data = await fetchContainers();
        setContainers(data.containers || []);
        depotGroup.add(createContainersLayerOptimized(data, CFG.ground));
      } catch (e) { console.warn('fetchContainers', e); }
    })();

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

    // === Build input corect (folosește metodele reale din controller) ===
    function onPointerMove(e) {
      if (!buildActiveRef.current || !buildRef.current) return;
      if (e.target.closest?.('.build-palette-ui')) return; // ignoră UI
      buildRef.current.updatePreviewAt(e.clientX, e.clientY);
    }
    function onPointerDown(e) {
      if (!buildActiveRef.current || !buildRef.current) return;
      if (e.target.closest?.('.build-palette-ui')) return; // ignoră UI
      buildRef.current.clickAt(e.clientX, e.clientY);
    }
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const minX = -YARD_WIDTH/2 + 5, maxX = YARD_WIDTH/2 + 5;
    const minZ = -YARD_DEPTH/2 + 5, maxZ = YARD_DEPTH/2 + 5;
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();

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

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      mount.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      fpRef.current?.removeKeyboard();
      renderer.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const orbit = controlsRef.current; if (!orbit) return;
    orbit.enabled = !buildActive && !isFPRef.current;
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

    // IMPORTANT: îl expunem pentru BuildPalette
    buildController: buildRef.current,
  };
}