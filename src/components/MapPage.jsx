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
const YARD_WIDTH  = 90;   // ↔ lățime (X)
const YARD_DEPTH  = 60;   // ↕ lungime (Z)
const YARD_COLOR  = 0x9aa0a6;

// slot de 20' (metri)
const SLOT_W   = 2.44;
const SLOT_LEN = 6.06;
const SLOT_GAP = 0.06;
const STEP     = SLOT_LEN + SLOT_GAP; // ≈ 6.12m

// ABC centrat pe X (centrul celor 10 celule e la 5*STEP în stânga originii rândului)
const ABC_CENTER_OFFSET_X = 5 * STEP; // ≈ 30.6

// Gard
const FENCE_MARGIN      = 2.0;   // gardul intră cu X m față de marginea asfaltului
const FENCE_POST_EVERY  = 10;

// clearance colț sud-est pentru DEF
const clearanceX = 0.4;
const clearanceZ = 0.4;

// calculează defOffsetX și abcToDefGap ca DEF(F,7) să ajungă în colțul sud-est al gardului
function computeDEFToSouthEastCorner() {
  const innerHalfW = YARD_WIDTH / 2 - FENCE_MARGIN;  // x maxim (interior gard)
  const innerHalfD = YARD_DEPTH / 2 - FENCE_MARGIN;  // z maxim (interior gard)

  // X: marginea EST a F la innerHalfW - clearanceX
  const xF_target_edge = innerHalfW - clearanceX;
  const xF_center      = xF_target_edge - SLOT_W / 2;
  const DEF_BASE_X_target = xF_center - 2 * (SLOT_W + 0.10);
  const defOffsetX = DEF_BASE_X_target - 4.0; // pentru formula din createGround

  // Z: marginea SUD a r=7 la innerHalfD - clearanceZ => START_Z_DEF + 7*STEP = țintă
  const startZ_target = innerHalfD - clearanceZ - 7 * STEP;

  const ABC_BASE_Z = -4.0;
  const ABC_ROW_C  = ABC_BASE_Z - 2 * (SLOT_W + 0.10); // poziția benzii C
  const abcToDefGap = startZ_target - ABC_ROW_C;

  return { defOffsetX, abcToDefGap };
}

const { defOffsetX: DEF_OFFSET_X, abcToDefGap: ABC_TO_DEF_GAP } = computeDEFToSouthEastCorner();

const CFG = {
  ground: {
    width:  YARD_WIDTH,
    depth:  YARD_DEPTH,
    color:  YARD_COLOR,

    // (ancore/margini – ignorate de createGround dacă nu sunt folosite intern)
    anchor: 'south',
    edgePadding: 3.0,

    // ABC centrat; DEF poziționat în colțul SE
    abcOffsetX: ABC_CENTER_OFFSET_X,
    defOffsetX: DEF_OFFSET_X,
    abcToDefGap: ABC_TO_DEF_GAP,
  },

  fence: {
    margin: FENCE_MARGIN,
    postEvery: FENCE_POST_EVERY,
    gate: {
      side: 'west',   // poartă pe VEST (cum ai cerut)
      width: 10,
      // pentru vest/est avem nevoie de centerZ; punem poarta pe banda B (~ -6.54)
      centerZ: -6.54,
      tweakZ: 0
    }
  },

  trees: {
    ring: true,
    offset: 6.0,
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

    // Curtea (asfalt + marcaje interne), gard, copaci, cer
    const ground = createGround(CFG.ground);
    const sky = createSky(CFG.sky);

    const fence = createFence({
      width:  CFG.ground.width - 2 * CFG.fence.margin,
      depth:  CFG.ground.depth - 2 * CFG.fence.margin,
      postEvery: CFG.fence.postEvery,
      gate: {
        side:   CFG.fence.gate.side,    // 'west'
        width:  CFG.fence.gate.width,
        centerZ: CFG.fence.gate.centerZ,
        tweakZ: CFG.fence.gate.tweakZ
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

    // === Containere din Supabase (SAFE) ===
// chiar sub: const controls = new OrbitControls(...)
    let containersLayer; // DECLARAT aici!
    // Containere
(async () => {
  const data = await fetchContainers();

  // dacă ai extins createContainersLayer să accepte offset-urile,
  // îi treci opțiunile aici; dacă nu, lasă doar "data"
  containersLayer = createContainersLayer(data, {
    abcOffsetX:  CFG.ground.abcOffsetX,
    defOffsetX:  CFG.ground.defOffsetX,
    abcToDefGap: CFG.ground.abcToDefGap,
  });

  scene.add(containersLayer);
  setLoading(false);
})();
    const containersLayer = createContainersLayer(data, {
  abcOffsetX:  CFG.ground.abcOffsetX,
  defOffsetX:  CFG.ground.defOffsetX,
  abcToDefGap: CFG.ground.abcToDefGap,
});
scene.add(containersLayer);

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