// src/components/depot/map/Map3DPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import styles from './Map3DStandalone.module.css';

// helpers 3D
import createGround from '../../threeWorld/createGround';
import createSky from '../../threeWorld/createSky';

export default function Map3DPage() {
  const navigate = useNavigate();

  const wrapRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rafRef = useRef(0);
  const skyRef = useRef(null);

  // ui: zi / noapte
  const [mode, setMode] = useState('day'); // 'day' | 'night'

  useEffect(() => {
    // ----- init renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    // canvas sizing
    const resize = () => {
      if (!wrapRef.current) return;
      const w = wrapRef.current.clientWidth;
      const h = wrapRef.current.clientHeight;
      renderer.setSize(w, h);
      if (cameraRef.current) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
      }
    };

    // ----- scene + camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
    camera.position.set(70, 55, 95);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // ----- orbit
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controls.maxPolarAngle = Math.PI * 0.49;
    controlsRef.current = controls;

    // ----- sky + lights
    const sky = createSky({ mode: 'day' });
    scene.add(sky.group);
    skyRef.current = sky;

    // ----- ground (asfalt + marcaje)
    // Parametrii de poziționare pot fi reglați rapid aici:
    const ground = createGround({
      width: 120,     // lățimea totală a asfaltului (X)
      depth: 95,      // lungimea totală (Z)
      color: 0x2b2f33,

      // bloc ABC (orizontal), 10 sloturi
      abc: {
        // poziționare relativă: start la stânga, la 12 unități de margine
        marginLeft: 12,
        centerZ: -8,        // coboră/urcă benzile pe Z
        reverseNumbers: true, // numerotare 10→1 la A/C
      },

      // bloc DEF (vertical), 7 sloturi
      def: {
        marginRight: 10, // cât spațiu lăsăm până la marginea din dreapta a asfaltului
        startZ: -2,      // punctul de plecare pe Z
        gapToABC: 18,    // distanța vizuală față de ABC
      },
    });
    scene.add(ground);

    // ----- mount
    wrapRef.current.appendChild(renderer.domElement);
    resize();
    window.addEventListener('resize', resize);

    // ----- animate
    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    // cleanup
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      controls.dispose();
      renderer.dispose();
      if (wrapRef.current && renderer.domElement.parentNode === wrapRef.current) {
        wrapRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // aplică mod zi/noapte asupra cerului
  useEffect(() => {
    if (!skyRef.current) return;
    skyRef.current.setMode(mode);
  }, [mode]);

  return (
    <div className={styles.page}>
      <header className={styles.hud}>
        <button className={styles.back} onClick={() => navigate('/depot')}>← Volver al Depot</button>
        <h1 className={styles.title}>Mapa 3D · Depósito</h1>
        <button
          className={styles.mode}
          onClick={() => setMode(m => (m === 'day' ? 'night' : 'day'))}
          title="Cambiar modo"
        >
          {mode === 'day' ? '🌙 Noche' : '🌞 Día'}
        </button>
      </header>

      <div className={styles.canvasWrap} ref={wrapRef} />
    </div>
  );
}