// src/components/Depot/scheduler/Map3DPage.jsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import Layout from '../../Layout';
import styles from './Map3DPage.module.css';

// helper-ele tale
import createSky from '../../threeWorld/createSky';
import createMountainWall from '../../threeWorld/createMountainWall';
import createContainersLayer from '../../threeWorld/createContainersLayer'; // poți comuta pe versiunea optimized dacă vrei
import fetchContainers from '../../threeWorld/fetchContainers';

// — un „asfalt” minimalist (ca să nu depindem de alt fișier)
function createGround({ width = 280, depth = 140 } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(width, depth);
  const mat = new THREE.MeshStandardMaterial({ color: 0x20252b, roughness: 1 });
  const plane = new THREE.Mesh(geo, mat);
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  g.add(plane);
  return g;
}

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export default function Map3DPage() {
  const navigate = useNavigate();
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // scene & camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101418);

    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(60, 40, 80);

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 5, 0);

    // ambient ușor (complementar la lumina din createSky)
    scene.add(new THREE.AmbientLight(0xffffff, 0.08));

    // compunem curtea
    const ground = createGround({ width: 280, depth: 140 });
    scene.add(ground);

    const sky = createSky({});
    scene.add(sky);

    const mountains = createMountainWall({ yardDepth: 140, fenceMargin: 2 });
    scene.add(mountains);

    // layout consistent cu slotToWorld (vezi parametrii folosiți acolo)
    const layout = {
      abcOffsetX: 0,
      defOffsetX: 0,
      abcToDefGap: -10,
      debug: false, // pune true ca să vezi markerele sloturilor
    };

    let containersLayer = null;
    let disposed = false;

    // încărcăm datele din Supabase și construim stratul de containere
    (async () => {
      const data = await fetchContainers(); // { containers: [...] }
      if (disposed) return;
      containersLayer = createContainersLayer(data, layout);
      scene.add(containersLayer);
    })();

    // animație
    let rafId;
    const tick = () => {
      controls.update();
      // animație puls pt. „programados”
      containersLayer?.userData?.tick?.();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };
    tick();

    // resize
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // cleanup
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);

      // eliberăm geometrie/materiale
      scene.traverse(obj => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m?.dispose?.());
          else obj.material?.dispose?.();
        }
      });
    };
  }, []);

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.headerRow}>
          <button className={styles.backButton} onClick={() => navigate('/depot')}>
            <BackIcon />
            <span>Volver al Depot</span>
          </button>
          <h1 className={styles.title}>Mapa 3D · Depósito</h1>
        </div>

        <div className={styles.canvasWrap} ref={mountRef} />
      </div>
    </Layout>
  );
}