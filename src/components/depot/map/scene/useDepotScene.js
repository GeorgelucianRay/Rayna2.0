// src/components/depot/map/scene/useDepotScene.js
import * as THREE from 'three';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
[span_0](start_span)import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';[span_0](end_span)

[span_1](start_span)import createGround from '../threeWorld/createGround';[span_1](end_span)
[span_2](start_span)import createFence from '../threeWorld/createFence';[span_2](end_span)
[span_3](start_span)import createContainersLayerOptimized from '../threeWorld/createContainersLayerOptimized';[span_3](end_span)
[span_4](start_span)import fetchContainers from '../threeWorld/fetchContainers';[span_4](end_span)
[span_5](start_span)import createSky from '../threeWorld/createSky';[span_5](end_span)
[span_6](start_span)import createLandscape from '../threeWorld/createLandscape';[span_6](end_span)
[span_7](start_span)import createFirstPerson from '../threeWorld/firstPerson';[span_7](end_span)

[span_8](start_span)import createBuildController from '../world/buildController';[span_8](end_span)
[span_9](start_span)import styles from '../Map3DStandalone.module.css';[span_9](end_span)

[span_10](start_span)const YARD_WIDTH = 90, YARD_DEPTH = 60, YARD_COLOR = 0x9aa0a6;[span_10](end_span)
[span_11](start_span)const STEP = 6.06 + 0.06, ABC_CENTER_OFFSET_X = 5 * STEP;[span_11](end_span)
[span_12](start_span)const CFG = {[span_12](end_span)
  [span_13](start_span)ground: { width: YARD_WIDTH, depth: YARD_DEPTH, color: YARD_COLOR, abcOffsetX: ABC_CENTER_OFFSET_X, defOffsetX: 32.3, abcToDefGap: -6.2 },[span_13](end_span)
  [span_14](start_span)fence:  { margin: 2, postEvery: 10, gate: { side: 'west', width: 10, centerZ: -6.54, tweakZ: 0 } },[span_14](end_span)
};

[span_15](start_span)export function useDepotScene({ mountRef }) {[span_15](end_span)
  // expunem către “casă”
  [span_16](start_span)const [isFP, setIsFP] = useState(false);[span_16](end_span)
  [span_17](start_span)const [containers, setContainers] = useState([]);[span_17](end_span)
  [span_18](start_span)const [buildActive, setBuildActive] = useState(false);[span_18](end_span)

  // controllere interne
  [span_19](start_span)const cameraRef = useRef();[span_19](end_span)
  [span_20](start_span)const controlsRef = useRef();[span_20](end_span)
  [span_21](start_span)const fpRef = useRef(null);[span_21](end_span)
  [span_22](start_span)const buildRef = useRef(null);[span_22](end_span)

  [span_23](start_span)const clockRef = useRef(new THREE.Clock());[span_23](end_span)
  [span_24](start_span)const isFPRef = useRef(false);[span_24](end_span)
  [span_25](start_span)const setFPEnabled = useCallback((enabled) => {[span_25](end_span)
    [span_26](start_span)const orbit = controlsRef.current;[span_26](end_span)
    [span_27](start_span)if (!orbit || !fpRef.current) return;[span_27](end_span)
    [span_28](start_span)if (enabled) {[span_28](end_span)
      [span_29](start_span)orbit.enabled = false;[span_29](end_span)
      [span_30](start_span)fpRef.current.enable();[span_30](end_span)
      [span_31](start_span)fpRef.current.addKeyboard();[span_31](end_span)
      [span_32](start_span)isFPRef.current = true; setIsFP(true);[span_32](end_span)
    [span_33](start_span)} else {[span_33](end_span)
      [span_34](start_span)fpRef.current.disable();[span_34](end_span)
      [span_35](start_span)fpRef.current.removeKeyboard();[span_35](end_span)
      [span_36](start_span)orbit.enabled = !buildActive;[span_36](end_span)
      [span_37](start_span)isFPRef.current = false; setIsFP(false);[span_37](end_span)
    }
  [span_38](start_span)}, [buildActive]);[span_38](end_span)

  [span_39](start_span)const setForwardPressed = useCallback(v => fpRef.current?.setForwardPressed(v), []);[span_39](end_span)
  [span_40](start_span)const setJoystick = useCallback(v => fpRef.current?.setJoystick(v), []);[span_40](end_span)

  const [buildMode, setBuildMode] = useState('place'); [span_41](start_span)// 'place'|'remove'[span_41](end_span)
  [span_42](start_span)const buildApi = useMemo(() => ({[span_42](end_span)
    get mode() { return buildMode; [span_43](start_span)},[span_43](end_span)
    setMode: (m) => { setBuildMode(m); buildRef.current?.setMode(m); [span_44](start_span)},[span_44](end_span)
    [span_45](start_span)rotateStep: (dir) => buildRef.current?.rotateStep(dir),[span_45](end_span)
    [span_46](start_span)setType: (t) => buildRef.current?.setType(t),[span_46](end_span)
    [span_47](start_span)finalizeJSON: () => {[span_47](end_span)
      try { return JSON.stringify(JSON.parse(localStorage.getItem('rayna.world.edits')||'{}'), null, 2); [span_48](start_span)}
      catch { return '{}'; }[span_48](end_span)
    }
  [span_49](start_span)}), [buildMode]);[span_49](end_span)

  // handler selectare container (setezi din Map3DPage)
  [span_50](start_span)const onContainerSelectedRef = useRef(null);[span_50](end_span)
  [span_51](start_span)const setOnContainerSelected = useCallback((fn) => { onContainerSelectedRef.current = fn; }, []);[span_51](end_span)

  // bounds FP
  [span_52](start_span)const bounds = useMemo(() => ({[span_52](end_span)
    [span_53](start_span)minX: -YARD_WIDTH / 2 + 2,[span_53](end_span)
    [span_54](start_span)maxX:  YARD_WIDTH / 2 - 2,[span_54](end_span)
    [span_55](start_span)minZ: -YARD_DEPTH / 2 + 2,[span_55](end_span)
    [span_56](start_span)maxZ:  YARD_DEPTH / 2 - 2,[span_56](end_span)
  [span_57](start_span)}), []);[span_57](end_span)

  [span_58](start_span)useEffect(() => {[span_58](end_span)
    [span_59](start_span)const mount = mountRef.current; if (!mount) return;[span_59](end_span)

    // renderer
    [span_60](start_span)const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });[span_60](end_span)
    [span_61](start_span)renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));[span_61](end_span)
    [span_62](start_span)renderer.setSize(mount.clientWidth, mount.clientHeight);[span_62](end_span)
    [span_63](start_span)renderer.outputColorSpace = THREE.SRGBColorSpace;[span_63](end_span)
    [span_64](start_span)mount.appendChild(renderer.domElement);[span_64](end_span)

    // scene & camera
    [span_65](start_span)const scene = new THREE.Scene();[span_65](end_span)
    [span_66](start_span)const camera = new THREE.PerspectiveCamera(60, mount.clientWidth/mount.clientHeight, 0.1, 1000);[span_66](end_span)
    [span_67](start_span)camera.position.set(20, 8, 20);[span_67](end_span)
    [span_68](start_span)cameraRef.current = camera;[span_68](end_span)

    // orbit
    [span_69](start_span)const controls = new OrbitControls(camera, renderer.domElement);[span_69](end_span)
    [span_70](start_span)controls.enableDamping = true;[span_70](end_span)
    [span_71](start_span)controls.target.set(0, 1, 0);[span_71](end_span)
    [span_72](start_span)controlsRef.current = controls;[span_72](end_span)

    // FP
    [span_73](start_span)fpRef.current = createFirstPerson(camera, bounds);[span_73](end_span)

    // lume
    [span_74](start_span)scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));[span_74](end_span)
    [span_75](start_span)const dir = new THREE.DirectionalLight(0xffffff, 0.8);[span_75](end_span)
    [span_76](start_span)dir.position.set(5,10,5); scene.add(dir);[span_76](end_span)
    [span_77](start_span)scene.add(createSky({ scene, renderer, hdrPath: '/textures/lume/golden_gate_hills_1k.hdr', exposure: 1.1 }));[span_77](end_span)
    [span_78](start_span)scene.add(createLandscape({ ground: CFG.ground }));[span_78](end_span)

    // world editabil
    [span_79](start_span)const worldGroup = new THREE.Group(); worldGroup.name = 'worldGroup';[span_79](end_span)
    [span_80](start_span)scene.add(worldGroup);[span_80](end_span)

    // curte + gard
    [span_81](start_span)const depotGroup = new THREE.Group();[span_81](end_span)
    [span_82](start_span)const groundNode = createGround(CFG.ground);[span_82](end_span)
    [span_83](start_span)const groundMesh = groundNode.userData?.groundMesh || groundNode;[span_83](end_span)
    [span_84](start_span)const fence  = createFence({ ...CFG.fence, width: YARD_WIDTH - 4, depth: YARD_DEPTH - 4 });[span_84](end_span)
    [span_85](start_span)depotGroup.add(groundNode, fence);[span_85](end_span)
    [span_86](start_span)scene.add(depotGroup);[span_86](end_span)

    // build
    [span_87](start_span)buildRef.current = createBuildController({[span_87](end_span)
      camera, domElement: renderer.domElement, worldGroup, groundMesh, grid: 1
    });
    [span_88](start_span)buildRef.current?.setMode(buildMode);[span_88](end_span)

    // containere
    (async () [span_89](start_span)=> {[span_89](end_span)
      try {
        [span_90](start_span)const data = await fetchContainers();[span_90](end_span)
        [span_91](start_span)setContainers(data.containers || []);[span_91](end_span)
        [span_92](start_span)depotGroup.add(createContainersLayerOptimized(data, CFG.ground));[span_92](end_span)
      } catch (e) { console.warn('fetchContainers', e); [span_93](start_span)}
    })();

    // pick containere (dezactivat în build)
    const raycaster = new THREE.Raycaster();[span_93](end_span)
    [span_94](start_span)const mouse = new THREE.Vector2();[span_94](end_span)
    [span_95](start_span)const onClick = (event) => {[span_95](end_span)
      [span_96](start_span)if (event.target.closest?.(`.${styles.searchContainer}`)) return;[span_96](end_span)
      [span_97](start_span)if (buildActive) return;[span_97](end_span)
      [span_98](start_span)const rect = mount.getBoundingClientRect();[span_98](end_span)
      [span_99](start_span)mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;[span_99](end_span)
      [span_100](start_span)mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;[span_100](end_span)
      [span_101](start_span)raycaster.setFromCamera(mouse, camera);[span_101](end_span)
      [span_102](start_span)const intersects = raycaster.intersectObjects(depotGroup.children, true);[span_102](end_span)
      [span_103](start_span)if (intersects.length > 0) {[span_103](end_span)
        [span_104](start_span)const hit = intersects[0], obj = hit.object;[span_104](end_span)
        [span_105](start_span)if (obj.isInstancedMesh && obj.userData?.records && hit.instanceId != null) {[span_105](end_span)
          [span_106](start_span)const rec = obj.userData.records[hit.instanceId];[span_106](end_span)
          [span_107](start_span)onContainerSelectedRef.current?.(rec || null);[span_107](end_span)
          [span_108](start_span)return;[span_108](end_span)
        }
        if (obj.userData?.__record) { onContainerSelectedRef.current?.(obj.userData.__record); return; [span_109](start_span)}
      }
      onContainerSelectedRef.current?.(null);[span_109](end_span)
    };
    [span_110](start_span)mount.addEventListener('click', onClick);[span_110](end_span)

    // ===== MODIFICARE: BUILD INPUT =====
    
    [span_111](start_span)// Funcția 'onPointerMove'[span_111](end_span) a fost eliminată.

    [span_112](start_span)// Funcția 'onPointerDown'[span_112](end_span) este modificată pentru logica FP
    function onPointerDown(e) {
      if (!buildActive || !buildRef.current) return;

      // IMPORTANT: Verifică dacă click-ul a fost pe UI-ul de Build
      // Asigură-te că ai o clasă pe componenta BuildPalette, ex: className="build-palette"
      if (e.target.closest('.build-palette')) {
        return; // Nu plasa obiecte dacă dăm click pe butoane
      }
      
      // Apelăm noua funcție FĂRĂ coordonate
      buildRef.current.placeOrRemoveObject();
    }
    
    // Eliminăm 'pointermove' și păstrăm 'pointerdown'
    // renderer.domElement.addEventListener('pointermove', onPointerMove); [span_113](start_span)// ELIMINAT[span_113](end_span)
    [span_114](start_span)renderer.domElement.addEventListener('pointerdown', onPointerDown);[span_114](end_span)
    // ===== SFÂRȘIT MODIFICARE =====

    // loop
    [span_115](start_span)const minX = -YARD_WIDTH/2 + 5, maxX = YARD_WIDTH/2 + 5;[span_115](end_span)
    [span_116](start_span)const minZ = -YARD_DEPTH/2 + 5, maxZ = YARD_DEPTH/2 + 5;[span_116](end_span)
    [span_117](start_span)const animate = () => {[span_117](end_span)
      [span_118](start_span)requestAnimationFrame(animate);[span_118](end_span)
      [span_119](start_span)const delta = clockRef.current.getDelta();[span_119](end_span)

      // ===== MODIFICARE: ACTUALIZARE FANTOMĂ =====
      if (buildActive) {
        buildRef.current?.updatePreview();
      }
      // ===== SFÂRȘIT MODIFICARE =====

      [span_120](start_span)if (isFPRef.current) {[span_120](end_span)
        [span_121](start_span)fpRef.current?.update(delta);[span_121](end_span)
      [span_122](start_span)} else {[span_122](end_span)
        [span_123](start_span)controls.update();[span_123](end_span)
        [span_124](start_span)controls.target.x = THREE.MathUtils.clamp(controls.target.x, minX, maxX);[span_124](end_span)
        [span_125](start_span)controls.target.z = THREE.MathUtils.clamp(controls.target.z, minZ, maxZ);[span_125](end_span)
      }
      [span_126](start_span)renderer.render(scene, camera);[span_126](end_span)
    };
    [span_127](start_span)animate();[span_127](end_span)

    // resize
    [span_128](start_span)const onResize = () => {[span_128](end_span)
      [span_129](start_span)const w = mount.clientWidth, h = mount.clientHeight;[span_129](end_span)
      [span_130](start_span)camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w, h);[span_130](end_span)
    };
    [span_131](start_span)window.addEventListener('resize', onResize);[span_131](end_span)

    return () => {
      [span_132](start_span)mount.removeEventListener('click', onClick);[span_132](end_span)
      [span_133](start_span)window.removeEventListener('resize', onResize);[span_133](end_span)
      
      // ===== MODIFICARE: CLEANUP =====
      // renderer.domElement.removeEventListener('pointermove', onPointerMove); [span_134](start_span)// ELIMINAT[span_134](end_span)
      [span_135](start_span)renderer.domElement.removeEventListener('pointerdown', onPointerDown);[span_135](end_span)
      // ===== SFÂRȘIT MODIFICARE =====

      [span_136](start_span)fpRef.current?.removeKeyboard();[span_136](end_span)
      [span_137](start_span)renderer.dispose();[span_137](end_span)
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [span_138](start_span)}, []);[span_138](end_span)

  // orbit enable/disable când intrăm/ieșim din build / FP
  [span_139](start_span)useEffect(() => {[span_139](end_span)
    [span_140](start_span)const orbit = controlsRef.current; if (!orbit) return;[span_140](end_span)
    [span_141](start_span)orbit.enabled = !buildActive && !isFPRef.current;[span_141](end_span)
  [span_142](start_span)}, [buildActive]);[span_142](end_span)

  // API expus “în sus”
  [span_143](start_span)return {[span_143](end_span)
    [span_144](start_span)isFP,[span_144](end_span)
    [span_145](start_span)setFPEnabled,[span_145](end_span)
    [span_146](start_span)setForwardPressed,[span_146](end_span)
    [span_147](start_span)setJoystick,[span_147](end_span)
    [span_148](start_span)setBuildActive,[span_148](end_span)
    [span_149](start_span)buildApi,[span_149](end_span)
    [span_150](start_span)containers,[span_150](end_span)
    [span_151](start_span)openWorldItems: () => console.log('[WorldItems] open (TODO Modal)'),[span_151](end_span)
    [span_152](start_span)setOnContainerSelected,[span_152](end_span)
  };
[span_153](start_span)}[span_153](end_span)
