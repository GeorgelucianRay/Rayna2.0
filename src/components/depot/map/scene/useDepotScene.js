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
  // expunem către “casă”
  const [isFP, setIsFP] = useState(false);
  const [containers, setContainers] = useState([]);
  const [buildActive, setBuildActive] = useState(false);

  // controllere interne
  const cameraRef = useRef();
  const controlsRef = useRef();
  const fpRef = useRef(null);
  const buildRef = useRef(null);

  const clockRef = useRef(new THREE.Clock());
  const isFPRef = useRef(false);
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
      orbit.enabled = !buildActive;
      isFPRef.current = false; setIsFP(false);
    }
  }, [buildActive]);

  const setForwardPressed = useCallback(v => fpRef.current?.setForwardPressed(v), []);
  const setJoystick = useCallback(v => fpRef.current?.setJoystick(v), []);

  const [buildMode, setBuildMode] = useState('place'); // 'place'|'remove'
  const buildApi = useMemo(() => ({
    get mode() { return buildMode; },
    setMode: (m) => { setBuildMode(m); buildRef.current?.setMode(m); },
    rotateStep: (dir) => buildRef.current?.rotateStep(dir),
    setType: (t) => buildRef.current?.setType(t),
    finalizeJSON: () => {
      try { return JSON.stringify(JSON.parse(localStorage.getItem('rayna.world.edits')||'{}'), null, 2); }
      catch { return '{}'; }
    }
  }), [buildMode]);

  // handler selectare container (setezi din Map3DPage)
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
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth/mount.clientHeight, 0.1, 1000);
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
    dir.position.set(5,10,5); scene.add(dir);
    scene.add(createSky({ scene, renderer, hdrPath: '/textures/lume/golden_gate_hills_1k.hdr', exposure: 1.1 }));
    scene.add(createLandscape({ ground: CFG.ground }));

    // world editabil
    const worldGroup = new THREE.Group(); worldGroup.name = 'worldGroup';
    scene.add(worldGroup);

    // curte + gard
    const depotGroup = new THREE.Group();
    const groundNode = createGround(CFG.ground);
    const groundMesh = groundNode.userData?.groundMesh || groundNode;
    const fence  = createFence({ ...CFG.fence, width: YARD_WIDTH - 4, depth: YARD_DEPTH - 4 });
    depotGroup.add(groundNode, fence);
    scene.add(depotGroup);

    // build
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
      if (buildActive) return;
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

    // ===== MODIFICARE: BUILD INPUT =====
    
    // Funcția 'onPointerDown' este modificată pentru logica FP
    function onPointerDown(e) {
      if (!buildActive || !buildRef.current) return;

      // IMPORTANT: Verifică dacă click-ul a fost pe UI-ul de Build
      // Asigură-te că ai o clasă pe componenta BuildPalette, ex: className="build-palette"
      // SAU un alt identificator
      if (e.target.closest('[class*="BuildPalette_"]')) { // O variantă mai robustă dacă folosești CSS Modules
        return; // Nu plasa obiecte dacă dăm click pe butoane
      }
      
      // Apelăm noua funcție FĂRĂ coordonate
      buildRef.current.placeOrRemoveObject();
    }
    
    // Eliminăm 'pointermove' și păstrăm 'pointerdown'
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    // ===== SFÂRȘIT MODIFICARE =====

    // loop
    const minX = -YARD_WIDTH/2 + 5, maxX = YARD_WIDTH/2 + 5;
    const minZ = -YARD_DEPTH/2 + 5, maxZ = YARD_DEPTH/2 + 5;
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();

      // ===== MODIFICARE: ACTUALIZARE FANTOMĂ =====
      if (buildActive) {
        buildRef.current?.updatePreview();
      }
      // ===== SFÂRȘIT MODIFICARE =====

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
      camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      mount.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      
      // ===== MODIFICARE: CLEANUP =====
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      // ===== SFÂRȘIT MODIFICARE =====

      fpRef.current?.removeKeyboard();
      renderer.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // orbit enable/disable când intrăm/ieșim din build / FP
  useEffect(() => {
    const orbit = controlsRef.current; if (!orbit) return;
    orbit.enabled = !buildActive && !isFPRef.current;
  }, [buildActive]);

  // API expus “în sus”
  return {
    isFP,
    setFPEnabled,
    setForwardPressed,
    setJoystick,
    setBuildActive,
    buildApi,
    containers,
    openWorldItems: () => console.log('[WorldItems] open (TODO Modal)'),
    setOnContainerSelected,
  };
}
