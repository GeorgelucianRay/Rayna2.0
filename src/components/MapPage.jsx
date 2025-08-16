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
import createContainersLayer from './threeWorld/createContainersLayer';
import fetchContainers from './threeWorld/fetchContainers';

/* —— CONFIG (modifici doar aici) —— */
const CFG = {
  ground: {
    width: 90,         // ↔ lățimea curții (X)
    depth: 60,         // ↕ lungimea curții (Z)
    color: 0x9aa0a6,
    // marcajele la CAPĂTUL curții: ancorați ABC la “south” (marginea de jos)
    anchor: 'south',   // 'south' | 'north'
    edgePadding: 3.0,  // cât de aproape de marginea asfaltului e banda A
    abcOffsetX: -20,    // mută ABC stânga/dreapta
    defOffsetX:  20,    // mută DEF stânga/dreapta
    abcToDefGap: 60,   // distanța pe Z între ABC și DEF (mai negativ => DEF mai jos, culoar mai lat)
  },

  fence: {
    margin: 2.0,       // gardul intră cu X metri față de marginea asfaltului
    postEvery: 10,
    gate: {
      side: 'south',   // pe ce latură e poarta: 'south'|'north'|'west'|'east'
      width: 10,       // lățimea porții (metri)
      alignToABC: true // aliniază poarta la centrul blocului ABC
    }
  },

  trees: {
    ring: true,        // copaci pe contur (inel)
    offset: 6.0,       // cât de departe de asfalt (în exterior)
    every: 4.0         // un copac la fiecare ~4m (aprox)
  },

  sky: { radius: 800 },
};

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
    scene.fog = new THREE.Fog(0x87ceeb, 120, 360);

    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 2000);
    camera.position.set(30, 20, 38);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7280, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(60, 80, 30);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(0, 1.2, 0);
    controlsRef.current = controls;

    // === Curtea ===
    const ground = createGround(CFG.ground);
    const sky = (() => {
      const g = new THREE.Group();
      const s = new THREE.SphereGeometry(CFG.sky.radius, 32, 24);
      const m = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide });
      g.add(new THREE.Mesh(s, m));
      const sun = new THREE.DirectionalLight(0xffffff, 0.35); sun.position.set(80,120,40); g.add(sun);
      return g;
    })();

    // gard cu poartă în fața ABC
    const fence = createFence({
      width: CFG.ground.width - 2 * CFG.fence.margin,
      depth: CFG.ground.depth - 2 * CFG.fence.margin,
      postEvery: CFG.fence.postEvery,
      gate: {
        side: CFG.fence.gate.side,
        width: CFG.fence.gate.width,
        // centrăm poarta pe centrul blocului ABC (în funcție de offset-ul ABC)
        centerX: CFG.fence.gate.alignToABC ? CFG.ground.abcOffsetX - ((10 - 0.5) * 6.12) / 2 : 0
      }
    });

    // copaci pe contur (inel)
    const trees = createTrees({
      width: CFG.ground.width,
      depth: CFG.ground.depth,
      mode: CFG.trees.ring ? 'ring' : 'random',
      offset: CFG.trees.offset,
      every: CFG.trees.every,
    });

    scene.add(ground, sky, fence, trees);

    // Containere (se vor așeza pe marcaje conform pozițiilor)
    let containersLayer;
    (async () => {
      const data = await fetchContainers();
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