// src/components/MapPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useNavigate } from 'react-router-dom';
import styles from './MapStandalone.module.css';

import createGround from './threeWorld/createGround';
import createSky from './threeWorld/createSky';
import createFence from './threeWorld/createFence';
import createTrees from './threeWorld/createTrees';
import createAsphaltMarkings from './threeWorld/createAsphaltMarkings';
import createContainersLayer from './threeWorld/createContainersLayer';
import fetchContainers from './threeWorld/fetchContainers';

/* ==== CONFIG SĂNĂTOASĂ (nu iese nimic din scenă) ==== */
const CFG = {
  ground: { width: 140, depth: 90, color: 0x9aa0a6 },
  fence:  { margin: 6, postEvery: 15 },
  markings: {
    abcOffsetX: 0,      // ABC centrat pe X
    defOffsetX: 40,     // DEF ușor spre dreapta față de centru
    abcToDefGap: -12    // DEF „mai jos” pe Z (culoar între blocuri)
  },
  sky: { radius: 800 },
  trees: { count: 18 }
};
/* =============================================== */

export default function MapPage() {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const frameRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch {
      setError('Tu dispositivo/navegador no soporta WebGL.');
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 150, 400);

    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 2000);
    camera.position.set(55, 32, 70);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7280, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(60, 80, 30);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(0, 1.2, 0);

    // === Curtea ===
    const { width, depth, color } = CFG.ground;

    const ground = createGround({ width, depth, color });
    const sky    = createSky(CFG.sky);

    const fence  = createFence({
      width:  width - 2 * CFG.fence.margin,
      depth:  depth - 2 * CFG.fence.margin,
      postEvery: CFG.fence.postEvery
    });

    const trees  = createTrees({
      width: width + 20,
      depth: depth + 20,
      count: CFG.trees.count
    });

    // IMPORTANT: trimitem și width/depth la marcaje (dacă funcția le primește)
    const markings = createAsphaltMarkings({
      width,
      depth,
      abcOffsetX:  CFG.markings.abcOffsetX,
      defOffsetX:  CFG.markings.defOffsetX,
      abcToDefGap: CFG.markings.abcToDefGap
    });

    scene.add(ground, sky, fence, trees, markings);

    // === Containere ===
    let containersLayer;
    (async () => {
      const data = await fetchContainers();
      containersLayer = createContainersLayer(data); // are aceleași reguli A1..F7
      scene.add(containersLayer);
      setLoading(false);
    })();

    const animate = () => {
      containersLayer?.userData?.tick?.();
      controls.update();
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
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
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement?.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.());
          else obj.material.dispose?.();
        }
      });
    };
  }, []);

  return (
    <div className={styles.fullscreenRoot}>
      <div className={styles.topBar}>
        <button className={styles.iconBtn} onClick={() => navigate('/depot')}>✕</button>
      </div>

      {error ? (
        <div className={styles.fallback}>
          <h2>Rayna 3D Depot</h2>
          <p>{error}</p>
          <button className={styles.primary} onClick={() => navigate('/depot')}>Volver al Depot</button>
        </div>
      ) : (
        <>
          {loading && <div className={styles.loader}>Cargando mapa 3D…</div>}
          <div ref={mountRef} className={styles.canvasHost} />
        </>
      )}
    </div>
  );
}