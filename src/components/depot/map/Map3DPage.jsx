// src/components/Depot/map3d/Map3DStandalone.jsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// folosește utilitățile tale existente:
import fetchContainers from '../../threeWorld/fetchContainers';
import createContainersLayer from '../../threeWorld/createContainersLayer';
// dacă vrei varianta cu instancing: import createContainersLayer from '../../threeWorld/createContainersLayerOptimized';
import createSky from '../../threeWorld/createSky'; // doar cer + lumină ușoară (păstrăm, dar poți șterge)

import styles from './Map3DStandalone.module.css';

export default function Map3DStandalone() {
  const navigate = useNavigate();
  const mountRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    // --- Scene / Camera / Renderer ---
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      3000
    );
    camera.position.set(28, 20, 36);
    camera.lookAt(0, 3, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountEl.appendChild(renderer.domElement);

    // --- Controls (mișcare liberă) ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 8;
    controls.maxDistance = 180;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 3, 0);

    // --- Lumină + cer (fără „munte”) ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(60, 110, 40);
    sun.castShadow = true;
    scene.add(sun);

    // Cer discret (poți comenta dacă vrei chiar „nimic”)
    const sky = createSky({ topColor: 0x66b6ff, bottomColor: 0x1f2937, radius: 800 });
    scene.add(sky);

    // Sol simplu (îl poți înlocui cu createGround-ul tău)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x1f242b, roughness: 0.95, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // --- Config pentru poziționare (slotToWorld) ---
    const slotsConfig = {
      abcOffsetX: 0,
      defOffsetX: 0,
      abcToDefGap: -10,
      abcNumbersReversed: true,
      debug: false,
    };

    // --- Încărcare containere din Supabase ---
    let containersLayer = null;
    (async () => {
      const data = await fetchContainers(); // { containers: [...] }
      if (!data?.containers?.length) {
        console.warn('⚠️ Nu s-au găsit containere cu poziție validă.');
      }
      try {
        containersLayer = createContainersLayer(data, slotsConfig);
        scene.add(containersLayer);
      } catch (e) {
        console.error('Eroare creare strat containere:', e);
      }
    })();

    // --- Resize ---
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // --- Loop ---
    const tick = () => {
      controls.update();
      containersLayer?.userData?.tick?.(); // puls pentru programados
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={styles.root}>
      {/* Buton back în colț (fără Layout) */}
      <button className={styles.backBtn} onClick={() => navigate('/depot')}>
        ← Volver al Depot
      </button>

      {/* Titlu HUD */}
      <div className={styles.hudTop}>
        <h1 className={styles.title}>Mapa 3D · Depósito</h1>
      </div>

      {/* Canvas 3D */}
      <div ref={mountRef} className={styles.canvasWrap} />

      {/* Watermark subtil (opțional) */}
      <div className={styles.watermark}>Mapa 3D · Depósito</div>
    </div>
  );
}