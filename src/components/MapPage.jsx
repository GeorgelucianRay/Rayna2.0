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
const YARD_WIDTH  = 90;  // ↔ lățime (X)
const YARD_DEPTH  = 60;  // ↕ lungime (Z)
const YARD_COLOR  = 0x9aa0a6;

// Slot de 20' + mic spațiu de vopsea (metri)
const SLOT_W   = 2.44;
const SLOT_LEN = 6.06;
const SLOT_GAP = 0.06;
const STEP     = SLOT_LEN + SLOT_GAP; // 6.12 m

// ABC centrat pe X (centrul celor 10 celule e la 5*STEP în stânga originii rândului)
const ABC_CENTER_OFFSET_X = 5 * STEP; // ≈ 30.6

// Gard
const FENCE_MARGIN   = 2.0;   // gardul intră cu X m față de marginea asfaltului
const FENCE_POST_EVERY = 10;

// Cât spațiu să lăsăm între DEF și gard (în colț)
const clearanceX = 0.4;   // spre gardul din est (dreapta)
const clearanceZ = 0.4;   // spre gardul din sud (jos)

/** Calculează offset-urile ca F (cea mai din dreapta coloană) & r=7 (cel mai de jos slot)
 *  să ajungă în colțul interior al gardului, lăsând un mic clearance. */
function computeDEFToSouthEastCorner() {
  // limitele interioare ale gardului
  const innerHalfW = YARD_WIDTH / 2 - FENCE_MARGIN;
  const innerHalfD = YARD_DEPTH / 2 - FENCE_MARGIN;

  // vrem ca marginea EST a coloanei F să fie aproape de gard:
  // centrul lui F pe X:
  //   xF = DEF_BASE_X + 2*(SLOT_W+0.10)   (E și F sunt lipite la +0.10 m)
  // marginea estică a lui F = xF + SLOT_W/2
  // țintă: innerHalfW - clearanceX
  const xF_target_edge = innerHalfW - clearanceX;
  const xF_center      = xF_target_edge - SLOT_W / 2;
  const DEF_BASE_X_target = xF_center - 2 * (SLOT_W + 0.10);
  // formula din createGround: DEF_BASE_X = 4.0 + defOffsetX
  const defOffsetX = DEF_BASE_X_target - 4.0;

  // pe Z: vrem ca marginea SUD a ultimului slot (r=7) să fie la innerHalfD - clearanceZ
  // START_Z_DEF este poziția de la începutul coloanei, iar sudul ultimului slot e:
  //   START_Z_DEF + 7 * STEP
  const startZ_target = innerHalfD - clearanceZ - 7 * STEP;

  // iar în createGround: START_Z_DEF = ABC_ROW_Z.C + abcToDefGap
  // unde ABC_ROW_Z.C = ABC_BASE_Z - 2*(SLOT_W + 0.10), iar ABC_BASE_Z = -4.0
  const ABC_BASE_Z = -4.0;
  const ABC_ROW_C  = ABC_BASE_Z - 2 * (SLOT_W + 0.10); // ≈ -9.08
  const abcToDefGap = startZ_target - ABC_ROW_C;

  return { defOffsetX, abcToDefGap };
}

const { defOffsetX: DEF_OFFSET_X, abcToDefGap: ABC_TO_DEF_GAP } = computeDEFToSouthEastCorner();

const CFG = {
  ground: {
    width:  YARD_WIDTH,
    depth:  YARD_DEPTH,
    color:  YARD_COLOR,

    // ancorăm marcajele la capătul „sud” (spre noi) și lăsăm 3 m margine vizuală
    anchor: 'south',
    edgePadding: 3.0,

    // ABC centrat pe X; DEF calculat să fie în colțul sud-est
    abcOffsetX: ABC_CENTER_OFFSET_X,
    defOffsetX: DEF_OFFSET_X,

    // culoarul pe Z dintre ABC și DEF – calculat ca DEF să atingă sudul
    abcToDefGap: ABC_TO_DEF_GAP,
  },

  fence: {
    margin: FENCE_MARGIN,
    postEvery: FENCE_POST_EVERY,
    gate: {
      side: 'south',     // poarta pe latura de sud
      width: 10,
      alignToABC: true   // centrează poarta pe blocul ABC
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

    // Curtea (asfalt + marcaje), gard, copaci, cer
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
        centerX: CFG.fence.gate.alignToABC ? CFG.ground.abcOffsetX - (5 * STEP) : 0
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