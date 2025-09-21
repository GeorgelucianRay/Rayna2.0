// src/components/Depot/map3d/Map3DPage.jsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// componentele tale „lume 3D”
import createSky from '../../threeWorld/createSky';
import createMountainWall from '../../threeWorld/createMountainWall';
import fetchContainers from '../../threeWorld/fetchContainers';
import createContainersLayer from '../../threeWorld/createContainersLayer';
// (poți schimba cu varianta optimizată dacă vrei):
// import createContainersLayer from '../../threeWorld/createContainersLayerOptimized';

import Layout from '../../Layout';
import styles from './Map3DPage.module.css';

export default function Map3DPage() {
  const navigate = useNavigate();
  const mountRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    // --- Scene/Camera/Renderer ---
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      3000
    );
    camera.position.set(30, 22, 38);
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
    controls.maxDistance = 150;
    controls.maxPolarAngle = Math.PI * 0.49; // nu lăsa să intre „sub pământ”
    controls.target.set(0, 3, 0);

    // --- Lumină + cer + „munte” ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(60, 110, 40);
    sun.castShadow = true;
    scene.add(sun);

    const sky = createSky();
    scene.add(sky);

    const mountain = createMountainWall({ yardDepth: 140, fenceMargin: 2 });
    scene.add(mountain);

    // --- Sol simplu (poți înlocui cu createGround dacă ai) ---
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x20262e, roughness: 0.95, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // --- Config pentru slotToWorld (strict numeric, nu e „Layout.jsx”) ---
    const slotsConfig = {
      abcOffsetX: 0,
      defOffsetX: 0,
      abcToDefGap: -10,
      abcNumbersReversed: true,
      debug: false,
    };

    // --- Layer de containere din Supabase ---
    let containersLayer = null;
    (async () => {
      try {
        const data = await fetchContainers(); // { containers: [...] }
        containersLayer = createContainersLayer(data, slotsConfig);
        scene.add(containersLayer);
      } catch (e) {
        console.error('Eroare layer containere:', e);
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
      controls.update();                          // inerție
      containersLayer?.userData?.tick?.();        // puls „programados”
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
    // vezi secțiunea 2 de mai jos pentru „buton în header”
    <Layout
      headerLeft={{ type: 'back', label: 'Volver al Depot', onClick: () => navigate('/depot') }}
      hideMenuButton
    >
      {/* Canvas 3D pe tot ecranul */}
      <div ref={mountRef} className={styles.canvasWrap} />

      {/* HUD peste canvas (titlu) */}
      <div className={styles.hudTop}>
        <h1 className={styles.title}>Mapa 3D · Depósito</h1>
      </div>

      {/* watermark subtil (opțional) */}
      <div className={styles.watermark}>Mapa 3D · Depósito</div>
    </Layout>
  );
}