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

/* ===================== CONFIG – modifici DOAR aici ===================== */
// Dimensiunea curții (asfalt)
const YARD_WIDTH  = 90;   // ↔ lățime (X)
const YARD_DEPTH  = 60;   // ↕ lungime (Z)
const YARD_COLOR  = 0x9aa0a6;

// un slot de 20' (m) + mic spațiu de vopsea
const SLOT_STEP = 6.06 + 0.06;

// ABC centrat pe X (centrul celor 10 celule este la 5*STEP în stânga originii rândului)
const ABC_CENTER_OFFSET_X = 5 * SLOT_STEP; // ≈ 30.6

const CFG = {
  ground: {
    width:  YARD_WIDTH,
    depth:  YARD_DEPTH,
    color:  YARD_COLOR,

    // unde ancorăm marcajele față de marginea curții
    anchor: 'south',      // 'south' | 'north'
    edgePadding: 3.0,     // margine față de gard/asfalt (m)

    // poziții laterale
    abcOffsetX: ABC_CENTER_OFFSET_X, // ABC pe mijloc
    defOffsetX: 32,                  // împinge DEF spre colțul din dreapta

    // distanța pe Z între ABC și DEF (culoarul)
    abcToDefGap: 16,
  },

  fence: {
    margin: 2.0,     // gardul intră cu X m față de marginea asfaltului
    postEvery: 10,
    gate: {
      side: 'south', // poarta pe latura de sud
      width: 10,
      alignToABC: true // centrează poarta pe blocul ABC
    }
  },

  trees: {
    ring: true,   // copaci pe contur
    offset: 6.0,  // în afara gardului
    every: 4.0
  },

  sky: { radius: 800 }
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

    // === Curtea (asfalt + marcaje integrate), gard, copaci, cer ===
    const ground = createGround(CFG.ground);
    const sky = createSky(CFG.sky);

    // gard interior cu poartă aliniată pe ABC
    const fence = createFence({
      width:  CFG.ground.width - 2 * CFG.fence.margin,
      depth:  CFG.ground.depth - 2 * CFG.fence.margin,
      postEvery: CFG.fence.postEvery,
      gate: {
        side: CFG.fence.gate.side,
        width: CFG.fence.gate.width,
        // centrăm poarta pe centrul blocului ABC:
        // centrul ABC este la (abcOffsetX - 5*STEP)
        centerX: CFG.fence.gate.alignToABC ? CFG.ground.abcOffsetX - (5 * SLOT_STEP) : 0
      }
    });

    const trees = createTrees({
      width:  CFG.ground.width,
      depth:  CFG.ground.depth,
      mode:   CFG.trees.ring ? 'ring' : 'random',
      offset: CFG.trees.offset,
      every:  CFG.trees.every
    });

    scene.add(ground, sky, fence, trees);

    // Containere
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