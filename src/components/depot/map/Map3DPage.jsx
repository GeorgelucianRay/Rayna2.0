// src/components/Depot/map3d/Map3DPage.jsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import Layout from '../../Layout';
import styles from './Map3DPage.module.css';

// ====== importă piesele tale ======
import createSky from '../../threeWorld/createSky';
import createMountainWall from '../../threeWorld/createMountainWall';
import fetchContainers from '../../threeWorld/fetchContainers';
import createContainersLayer from '../../threeWorld/createContainersLayer';
// Dacă vrei instanced meshes, schimbă linia de mai sus cu:
// import createContainersLayer from '../../threeWorld/createContainersLayerOptimized';

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export default function Map3DPage() {
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

    // --- Lights ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(60, 110, 40);
    sun.castShadow = true;
    scene.add(sun);

    // --- Cer și „munte” (piesa ta) ---
    const sky = createSky();                 // cupolă + lumini ambient/soare
    scene.add(sky);

    const mountain = createMountainWall({ yardDepth: 140, fenceMargin: 2 });
    scene.add(mountain);

    // --- Ground (simplu, îl poți înlocui cu createGround dacă ai) ---
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x20262e, roughness: 0.95, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // --- Layout pentru slotToWorld (același contract folosit în layer-ul tău) ---
    const layout = {
      abcOffsetX: 0,
      defOffsetX: 0,
      abcToDefGap: -10,
      abcNumbersReversed: true,
      debug: false,
    };

    // --- Container layer (din datele reale) ---
    let containersLayer = null;

    const loadAndBuild = async () => {
      try {
        const data = await fetchContainers(); // { containers: [...] }
        // construiește stratul 3D după datele din supabase
        containersLayer = createContainersLayer(data, layout);
        scene.add(containersLayer);
      } catch (e) {
        console.error('Eroare la încărcarea/constructia stratului de containere:', e);
      }
    };
    loadAndBuild();

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
      // rulează animația layer-ului tău (puls pentru programados)
      containersLayer?.userData?.tick?.();
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      mountEl.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <Layout>
      {/* Canvas full-screen */}
      <div ref={mountRef} className={styles.canvasWrap} />

      {/* HUD peste canvas */}
      <div className={styles.pageContainer}>
        <div className={styles.hudBar}>
          <button className={styles.backButton} onClick={() => navigate('/depot')}>
            <BackIcon /> <span>Volver al Depot</span>
          </button>
          <h1 className={styles.title}>Mapa 3D · Depósito</h1>
        </div>

        <div className={styles.watermark}>Mapa 3D · Depósito</div>
      </div>
    </Layout>
  );
}