// Independent, fără Layout
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import styles from './Map3DStandalone.module.css';

// utilități 3D existente în proiectul tău
import createGround from '../../threeWorld/createGround';
import fetchContainers from '../../threeWorld/fetchContainers';
import createContainersLayer from '../../threeWorld/createContainersLayer'; // sau Optimized, dacă preferi

export default function Map3DPage() {
  const navigate = useNavigate();
  const mountRef = useRef(null);
  const threeRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    layers: [],
    raf: 0,
  });

  useEffect(() => {
    const mount = mountRef.current;

    // — renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x000000, 0); // transparent (fondul vine din css)
    mount.appendChild(renderer.domElement);

    // — scenă & cameră
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(32, 34, 52);

    // — lumini
    const hemi = new THREE.HemisphereLight(0xffffff, 0x2a2a2a, 0.7);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 100, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    // — orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.update();

    // — asfalt + marcaje
    const ground = createGround({
      width: 90,
      depth: 60,
      color: 0x2b2f36,
      abcOffsetX: -10,
      defOffsetX: 32,
      abcToDefGap: 16,
    });
    ground.receiveShadow = true;
    scene.add(ground);

    // — încărcare containere din Supabase și plasare în scenă
    let disposed = false;
    (async () => {
      try {
        const data = await fetchContainers(); // { containers: [...] }
        if (disposed) return;

        const layout = {
          abcOffsetX: -10,
          defOffsetX: 32,
          abcToDefGap: 16,
          abcNumbersReversed: true, // sincron cu slotToWorld
          debug: false,
        };

        const layer = createContainersLayer(data, layout);
        scene.add(layer);
        threeRef.current.layers.push(layer);
      } catch (err) {
        console.error('Eroare încărcare containere:', err);
      }
    })();

    // — animare
    const clock = new THREE.Clock();
    const tick = () => {
      const _ = clock.getDelta(); // dacă ai nevoie de timp
      threeRef.current.layers.forEach((L) => {
        if (L?.userData?.tick) L.userData.tick();
      });
      controls.update();
      renderer.render(scene, camera);
      threeRef.current.raf = requestAnimationFrame(tick);
    };
    tick();

    // — resize
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // stochează pentru cleanup
    threeRef.current.scene = scene;
    threeRef.current.camera = camera;
    threeRef.current.renderer = renderer;
    threeRef.current.controls = controls;

    return () => {
      disposed = true;
      cancelAnimationFrame(threeRef.current.raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      // eliberăm geometrii/materiale
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
        if (obj.texture) obj.texture.dispose?.();
      });
    };
  }, []);

  return (
    <div className={styles.wrap}>
      {/* Header propriu (înlocuiește hamburgerul) */}
      <div className={styles.topbar}>
        <button className={styles.backBtn} onClick={() => navigate('/depot')}>
          <span className={styles.backIcon}>←</span>
          Volver al Depot
        </button>
        <h1 className={styles.title}>Mapa 3D · Depósito</h1>
      </div>

      {/* Canvas container */}
      <div ref={mountRef} className={styles.canvasMount} />
    </div>
  );
}