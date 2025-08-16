// src/components/MapPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import styles from './MapStandalone.module.css';
import { useNavigate } from 'react-router-dom';

import createGround from './threeWorld/createGround';
import createSky from './threeWorld/createSky';
import createFence from './threeWorld/createFence';
import createTrees from './threeWorld/createTrees';
import createContainersLayer from './threeWorld/createContainersLayer';
import fetchContainers from './threeWorld/fetchContainers';

export default function MapPage() {
  const mountRef = useRef(null);
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
    } catch {
      setError('Tu dispositivo/navegador no soporta WebGL.');
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // cer albastru
    scene.fog = new THREE.Fog(0x87ceeb, 150, 400);

    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 2000);
    camera.position.set(50, 30, 60);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(0, 1.2, 0);

    // dimensiuni reduse la curte
    const ground = createGround({ width: 300, depth: 180, color: 0x999999 }); // gri mai curat
    const sky = createSky({ radius: 800 });
    const fence = createFence({ width: 280, depth: 160, postEvery: 15 });
    const trees = createTrees({ width: 320, depth: 200, count: 18 });

    scene.add(ground, sky, fence, trees);

    (async () => {
      const data = await fetchContainers();
      const containersLayer = createContainersLayer(data);
      scene.add(containersLayer);
      setLoading(false);
    })();

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    window.addEventListener('resize', () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    return () => {
      mount.removeChild(renderer.domElement);
      renderer.dispose();
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