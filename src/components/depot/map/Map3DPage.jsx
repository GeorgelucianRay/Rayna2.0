import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

import styles from './Map3DStandalone.module.css';

// Importuri scene
import createGround from './threeWorld/createGround';
import createFence from './threeWorld/createFence';
// IMPORTANT: folosim varianta optimizată (cu texturi)
import createContainersLayerOptimized from './threeWorld/createContainersLayerOptimized';
import fetchContainers from './threeWorld/fetchContainers';
import createSky from './threeWorld/createSky';
import createLandscape from './threeWorld/createLandscape';
import ContainerInfoCard from './ContainerInfoCard';
import SearchBox from './SearchBox';
import { slotToWorld } from './threeWorld/slotToWorld';

/* ===================== CONFIG DEPOZIT ===================== */
const YARD_WIDTH = 90, YARD_DEPTH = 60, YARD_COLOR = 0x9aa0a6;
const STEP = 6.06 + 0.06, ABC_CENTER_OFFSET_X = 5 * STEP;
const CFG = {
  ground: { width: YARD_WIDTH, depth: YARD_DEPTH, color: YARD_COLOR, abcOffsetX: ABC_CENTER_OFFSET_X, defOffsetX: 32.3, abcToDefGap: -6.2 },
  fence: { margin: 2, postEvery: 10, gate: { side: 'west', width: 10, centerZ: -6.54, tweakZ: 0 } },
};
/* ====================================================================== */

export default function MapPage() {
  const mountRef = useRef(null);
  const cameraRef = useRef();
  const controlsRef = useRef();
  const isAnimatingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [selectedContainer, setSelectedContainer] = useState(null);
  const [allContainers, setAllContainers] = useState([]);
  const [flyToTarget, setFlyToTarget] = useState(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(20, 8, 20);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let depotGroup = null;
    let containersLayer = null;

    function onClick(event) {
      if (event.target.closest(`.${styles.searchContainer}`)) return;

      const rect = mount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      if (depotGroup) {
        const intersects = raycaster.intersectObjects(depotGroup.children, true);
        if (intersects.length > 0) {
          const hit = intersects[0];
          const obj = hit.object;

          // a) InstancedMesh: record prin instanceId
          if (obj.isInstancedMesh && obj.userData?.records && hit.instanceId != null) {
            const rec = obj.userData.records[hit.instanceId];
            if (rec) { setSelectedContainer(rec); return; }
          }

          // b) fallback: obiect simplu cu __record
          if (obj.userData?.__record) {
            setSelectedContainer(obj.userData.__record);
            return;
          }
        }
      }
      setSelectedContainer(null);
    }

    mount.addEventListener('click', onClick);

    // lights, sky, landscape, ground
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 5);
    scene.add(dir);

    scene.add(createSky());
    scene.add(createLandscape());

    const earthGeo = new THREE.PlaneGeometry(1000, 1000);
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x78904c });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.rotation.x = -Math.PI / 2;
    earth.position.y = -0.5;
    scene.add(earth);

    depotGroup = new THREE.Group();
    const ground = createGround(CFG.ground);
    const fence = createFence({ ...CFG.fence, width: YARD_WIDTH - 4, depth: YARD_DEPTH - 4 });
    depotGroup.add(ground, fence);
    scene.add(depotGroup);

    (async () => {
      try {
        const data = await fetchContainers();
        setAllContainers(data.containers);
        containersLayer = createContainersLayerOptimized(data, CFG.ground);
        depotGroup.add(containersLayer);
      } catch (e) {
        console.warn(e);
        setError('Nu am putut încărca containerele.');
      } finally {
        setLoading(false);
      }
    })();

    const minX = -YARD_WIDTH / 2 + 5, maxX = YARD_WIDTH / 2 + 5;
    const minZ = -YARD_DEPTH / 2 + 5, maxZ = YARD_DEPTH / 2 + 5;

    const animate = () => {
      requestAnimationFrame(animate);
      containersLayer?.userData?.tick?.();
      controls.update();
      if (!isAnimatingRef.current) {
        controls.target.x = THREE.MathUtils.clamp(controls.target.x, minX, maxX);
        controls.target.z = THREE.MathUtils.clamp(controls.target.z, minZ, maxZ);
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      mount.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  // Fly-to
  useEffect(() => {
    if (!flyToTarget) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const pos = flyToTarget.posicion?.trim().toUpperCase();
    const match = pos?.match?.(/^([A-F])(\d{1,2})([A-Z])?$/);
    if (!match) return;

    const worldPos = slotToWorld(
      { lane: match[1], index: Number(match[2]), tier: match[3] || 'A' },
      { ...CFG.ground, abcNumbersReversed: true }
    );

    const targetPosition = worldPos.position;
    const offset = new THREE.Vector3(10, 8, 10);
    const cameraPosition = new THREE.Vector3().copy(targetPosition).add(offset);

    gsap.to(controls.target, {
      x: targetPosition.x, y: targetPosition.y, z: targetPosition.z,
      duration: 1.5, ease: 'power3.out',
      onStart: () => { isAnimatingRef.current = true; },
      onComplete: () => { isAnimatingRef.current = false; }
    });

    gsap.to(camera.position, {
      x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z,
      duration: 1.5, ease: 'power3.out',
    });

    setSelectedContainer(flyToTarget);
    setFlyToTarget(null);
  }, [flyToTarget]);

  return (
    <div className={styles.fullscreenRoot}>
      <div className={styles.searchContainer}>
        <SearchBox
          containers={allContainers}
          onContainerSelect={setFlyToTarget}
        />
      </div>

      <div className={styles.topBar}>
        <button className={styles.iconBtn} onClick={() => navigate('/depot')}>✕</button>
      </div>

      <div ref={mountRef} className={styles.canvasHost} />

      <ContainerInfoCard
        container={selectedContainer}
        onClose={() => setSelectedContainer(null)}
      />
    </div>
  );
}