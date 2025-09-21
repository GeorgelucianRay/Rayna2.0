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
  const skyRef = useRef(null);

  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    // — Renderer —
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    wrap.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // — Scene —
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbad7ff); // va fi ascuns de cupola "sky"
    sceneRef.current = scene;

    // — Camera —
    const camera = new THREE.PerspectiveCamera(
      60,
      wrap.clientWidth / wrap.clientHeight,
      0.1,
      1200
    );
    camera.position.set(40, 55, 80);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    cameraRef.current = camera;

    // — Controls —
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0, 0);
    controls.maxPolarAngle = Math.PI * 0.49; // nu permite să intri sub plan
    controlsRef.current = controls;

    // — Lumină —
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(60, 120, 40);
    dir.castShadow = false;
    scene.add(dir);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    ambient.name = 'ambient';
    scene.add(ambient);

    // — Sky (cupolă gradient) —
    const sky = createSky(); // are setMode('day' | 'night')
    scene.add(sky.group);
    sky.setMode('day');
    skyRef.current = sky;

    // — Ground cu marcaje —
    const ground = createGround({
      width: 90,          // X total asfalt
      depth: 95,          // Z total asfalt
      color: 0x2b2f33,

      // încadrări exacte (explicate în mesajul anterior)
      abcOffsetX: 43.5,   // capătul din dreapta al lui ABC ≈ marginea asfaltului - 1.5m
      defOffsetX: 34.42,  // face ca F ≈ marginea asfaltului - 1.5m
      abcToDefGap: 2.0,   // spațiu pe Z între C și D (poți regla 1.5–3)
    });
    ground.name = 'ground';
    scene.add(ground);

    // — Floor foarte mare (capturare umbre / navigare plăcută) —
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.MeshBasicMaterial({ color: 0x111418 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.001;
    scene.add(floor);

    // — Resize —
    const onResize = () => {
      if (!wrap) return;
      camera.aspect = wrap.clientWidth / wrap.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // — Loop —
    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    // — Cleanup —
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      wrap.removeChild(renderer.domElement);
    };
  }, []);

  // toggle zi/noapte
  useEffect(() => {
    const sky = skyRef.current;
    const scene = sceneRef.current;
    if (!sky || !scene) return;

    const ambient = scene.getObjectByName('ambient');
    if (isNight) {
      sky.setMode('night');
      if (ambient) ambient.intensity = 0.25;
    } else {
      sky.setMode('day');
      if (ambient) ambient.intensity = 0.6;
    }
  }, [isNight]);

  return (
    <div className={styles.root}>
      <header className={styles.hud}>
        <button className={styles.backBtn} onClick={() => navigate('/depot')}>
          <span className={styles.backIcon}>←</span> Volver al Depot
        </button>

        <h1 className={styles.title}>Mapa 3D · Depósito</h1>

        <button
          className={styles.modeBtn}
          onClick={() => setIsNight(v => !v)}
          aria-label="Cambiar modo día/noche"
        >
          {isNight ? '🌙 Noche' : '🌞 Día'}
        </button>
      </header>

      <div ref={wrapRef} className={styles.canvasWrap} />
    </div>
  );
}