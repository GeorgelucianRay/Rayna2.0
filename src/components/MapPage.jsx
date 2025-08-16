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

/* ====== TOT CE VREI SĂ AJUSTEZI ESTE AICI ====== */
const CFG = {
  // Dimensiunea ASFALTULUI (lățime pe X, lungime pe Z)
  ground: {
    width: 100,     // ↔ lățime curte
    depth: 65,     // ↕ lungime curte
    color: 0x9aa0a6
  },

  // Gardul: îl facem ușor mai mic decât asfaltul cu o margine (în metri)
  fence: {
    margin: 6,      // cât “intri” gardul față de marginea asfaltului
    postEvery: 15
  },

  // Marcajele de pe asfalt (benzile ABC & DEF)
  markings: {
    abcOffsetX: 50,   // deplasează tot blocul ABC pe axa X
    defOffsetX: 100,   // deplasează tot blocul DEF pe axa X
    abcToDefGap: -10, // distanța pe Z dintre ABC și DEF (culoarul; valori mai NEGATIVE = DEF mai jos)
  },

  // Decor
  sky: { radius: 800 },
  trees: { count: 18 } // plasăm copaci în jurul dimensiunilor ground
};
/* =============================================== */

export default function MapPage() {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const frameRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Renderer
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

    // Scenă + cameră + lumini
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 150, 400);

    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.1,
      2000
    );
    camera.position.set(50, 30, 60);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7280, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(60, 80, 30);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(0, 1.2, 0);
    controlsRef.current = controls;

    // === Curtea (toate iau dimensiuni din CFG) ===
    const { width, depth, color } = CFG.ground;

    const ground = createGround({
      width,
      depth,
      color,
      // dacă ai lăsat opțiuni extra în createGround (showGrid etc.), le poți adăuga aici
    });

    const sky = createSky(CFG.sky);

    // gardul îl facem cu o margine mică față de asfalt, ca să stea “pe interior”
    const fence = createFence({
      width:  width - 2 * CFG.fence.margin,
      depth:  depth - 2 * CFG.fence.margin,
      postEvery: CFG.fence.postEvery
    });

    // copacii “împrejmuiesc” curtea, așa că folosim ground.width/depth
    const trees = createTrees({
      width:  width + 20,
      depth:  depth + 20,
      count:  CFG.trees.count
    });

    // DESENELE pe asfalt — ABC/DEF — toate offset-urile și culoarul
    const markings = createAsphaltMarkings({
      abcOffsetX:  CFG.markings.abcOffsetX,
      defOffsetX:  CFG.markings.defOffsetX,
      abcToDefGap: CFG.markings.abcToDefGap
    });

    scene.add(ground, sky, fence, trees, markings);

    // Containere
    let containersLayer;
    (async () => {
      const data = await fetchContainers(); // { enDeposito, programados, rotos }
      containersLayer = createContainersLayer(data);
      scene.add(containersLayer);
      setLoading(false);
    })();

    // Loop
    const animate = () => {
      containersLayer?.userData?.tick?.();
      controls.update();
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };
    animate();

    // Resize
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Cleanup
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