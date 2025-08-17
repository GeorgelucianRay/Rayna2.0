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
import createRoad from './threeWorld/createRoad'; // <-- MODIFICARE: Import adăugat
import createContainersLayer from './threeWorld/createContainersLayer';
import fetchContainers from './threeWorld/fetchContainers';

/* ===================== CONFIG – modifici DOAR aici ===================== */
const YARD_WIDTH  = 90;   // ↔ X
const YARD_DEPTH  = 60;   // ↕ Z
const YARD_COLOR  = 0x9aa0a6;

const STEP = 6.06 + 0.06;               // 20' + spațiul de vopsea ≈ 6.12m
const ABC_CENTER_OFFSET_X = 5 * STEP;   // centrează ABC pe axa X (≈ 30.6)

const CFG = {
  ground: {
    width:  YARD_WIDTH,
    depth:  YARD_DEPTH,
    color:  YARD_COLOR,

    // ABC pe mijloc; DEF împins în colțul sud-est (dreapta-jos)
    abcOffsetX: ABC_CENTER_OFFSET_X,
    defOffsetX: 32.3,   // stânga-dreapta (X) – ajustezi fin ±0.2 dacă vrei
    abcToDefGap: -6.2,  // sus-jos (Z) – valori mai negative = mai jos
  },

  fence: {
    margin: 2,          // gardul intră cu 2m față de marginea asfaltului
    postEvery: 10,
    gate: {
      side: 'west',     // poarta pe vest (stânga)
      width: 10,
      centerZ: -6.54,   // aliniată pe banda B (A:-4.00, B:-6.54, C:-9.08)
      tweakZ: 0
    }
  },

  trees: { ring: true, offset: 6, every: 4 },
  sky:   { radius: 800 },
};
/* ====================================================================== */

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

    // Lumea
    const ground = createGround(CFG.ground);
    const sky    = createSky(CFG.sky);

    // MODIFICARE: Crearea drumului
    const road = createRoad({
      yardWidth: CFG.ground.width,
      gateConfig: CFG.fence.gate
    });

    const fence = createFence({
      width:  CFG.ground.width - 2 * CFG.fence.margin,
      depth:  CFG.ground.depth - 2 * CFG.fence.margin,
      postEvery: CFG.fence.postEvery,
      gate: {
        side:   CFG.fence.gate.side,
        width:  CFG.fence.gate.width,
        centerZ: CFG.fence.gate.centerZ + (CFG.fence.gate.tweakZ || 0),
      }
    });

    const trees = createTrees({
      width:  CFG.ground.width,
      depth:  CFG.ground.depth,
      mode:   CFG.trees.ring ? 'ring' : 'random',
      offset: CFG.trees.offset,
      every:  CFG.trees.every
    });

    // MODIFICARE: Adăugarea drumului la scenă
    scene.add(ground, sky, road, fence, trees);

    // Containere (din Supabase)
    let containersLayer;
    (async () => {
      try {
        const data = await fetchContainers();
        containersLayer = createContainersLayer(data, {
          abcOffsetX:  CFG.ground.abcOffsetX,
          defOffsetX:  CFG.ground.defOffsetX,
          abcToDefGap: CFG.ground.abcToDefGap,
        });
        scene.add(containersLayer);
      } catch (e) {
        console.warn(e);
        setError('Nu am putut încărca containerele.');
      } finally {
        setLoading(false);
      }
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
      if (renderer.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose?.();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(m => m.dispose?.());
          else o.material.dispose?.();
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
