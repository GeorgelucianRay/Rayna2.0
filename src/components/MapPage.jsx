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
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const controlsRef = useRef(null);
  const worldRefs = useRef({}); // ținem grupurile pentru cleanup
  const frameRef = useRef(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // renderer sigur
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (e) {
      setError('Tu dispositivo/navegador no soporta WebGL.');
      return;
    }

    // scenă + cameră
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f1a);
    scene.fog = new THREE.Fog(0x0b0f1a, 180, 420);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.1,
      2000
    );
    camera.position.set(58, 34, 72);
    cameraRef.current = camera;

    // controale
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(0, 1.2, 0);
    controlsRef.current = controls;

    // ——— Lumea (asfalt, cer, gard, copaci)
    const ground = createGround({ width: 600, depth: 300 });
    const sky = createSky({ radius: 800 });
    const fence = createFence({ width: 560, depth: 260, postEvery: 18 });
    const trees = createTrees({ width: 620, depth: 320, count: 28 });

    scene.add(ground, sky, fence, trees);
    worldRefs.current = { ground, sky, fence, trees };

    // containere din supabase
    (async () => {
      const data = await fetchContainers(); // {enDeposito, programados, rotos}
      const containersLayer = createContainersLayer(data);
      scene.add(containersLayer);
      worldRefs.current.containersLayer = containersLayer;
      setLoading(false);
    })();

    // loop
    const animate = () => {
      // pulse pentru programados (este intern la containersLayer)
      if (worldRefs.current.containersLayer?.userData?.tick) {
        worldRefs.current.containersLayer.userData.tick();
      }
      controls.update();
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };
    animate();

    // resize
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // cleanup
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
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
        <button className={styles.iconBtn} onClick={() => navigate('/depot')}>＋</button>
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