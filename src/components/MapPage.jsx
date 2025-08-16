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

/* ========== CONFIG (modifici doar aici) ========== */
const DEF_OFFSET_X = 32; // offset pe X pentru blocul DEF (poți pune 31.999 dacă vrei fin)

const ground = createGround({
  width: 90,
  depth: 60,
  color: 0x9aa0a6,
  anchor: 'south',   // sau 'north' în funcție de capăt
  edgePadding: 3.0,  // cât spațiu de la gard/margine
  abcOffsetX: -10,   // mută ABC pe X
  defOffsetX: 32,    // mută DEF pe X (ex. 32)
  abcToDefGap: 16    // distanța ABC↔DEF pe Z
});
scene.add(ground);

  fence: {
    margin: 2.0,      // gardul intră cu X metri față de marginea asfaltului
    postEvery: 10,
    gate: {
      side: 'south',  // latura pe care e poarta
      width: 10,      // lățimea porții
      alignToABC: true
    }
  },

  trees: {
    ring: true,       // copaci pe contur
    offset: 6.0,      // distanța în exterior față de asfalt
    every: 4.0        // un copac la ~4m
  },

  sky: { radius: 800 }
};
/* ================================================== */

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

    // Curtea (asfalt + marcaje integrate în createGround)
    const ground = createGround(CFG.ground);

    // Cer simplu (cupolă)
    const sky = (() => {
      const g = new THREE.Group();
      const s = new THREE.SphereGeometry(CFG.sky.radius, 32, 24);
      const m = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide });
      g.add(new THREE.Mesh(s, m));
      const sun = new THREE.DirectionalLight(0xffffff, 0.35); sun.position.set(80,120,40); g.add(sun);
      return g;
    })();

    // Gard + poartă
    const fence = createFence({
      width: CFG.ground.width - 2 * CFG.fence.margin,
      depth: CFG.ground.depth - 2 * CFG.fence.margin,
      postEvery: CFG.fence.postEvery,
      gate: {
        side: CFG.fence.gate.side,
        width: CFG.fence.gate.width,
        centerX: CFG.fence.gate.alignToABC
          ? CFG.ground.abcOffsetX - ((10 - 0.5) * 6.12) / 2
          : 0
      }
    });

    // Copaci pe contur
    const trees = createTrees({
      width:  CFG.ground.width,
      depth:  CFG.ground.depth,
      mode:   CFG.trees.ring ? 'ring' : 'random',
      offset: CFG.trees.offset,
      every:  CFG.trees.every,
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
      if (renderer.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
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