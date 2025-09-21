// src/components/depot/map/Map3DPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import styles from './Map3DStandalone.module.css';
import createGround from '../../threeWorld/createGround';
import createSky from '../../threeWorld/createSky';

export default function Map3DPage() {
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const controlsRef = useRef(null);
  const skyRef = useRef(null);
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    wrap.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      wrap.clientWidth / wrap.clientHeight,
      0.1,
      1500
    );
    camera.position.set(40, 55, 90);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Sky + lights
    const sky = createSky();
    scene.add(sky.group);
    sky.setMode('day');
    skyRef.current = sky;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    ambient.name = 'ambient';
    scene.add(ambient);

    // Ground (automat încadrat)
    const ground = createGround({
      width: 90,     // lățimea asfaltului (X)
      depth: 95,     // lungimea asfaltului (Z)
      marginX: 1.5,  // margine la stânga/dreapta
      marginZ: 2.0,  // margine sus/jos
      laneGap: 0.10, // spațiul dintre benzi
      color: 0x2b2f33
    });
    ground.name = 'ground';
    scene.add(ground);

    // Floor mare (sub asfalt) doar ca fallback
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.MeshBasicMaterial({ color: 0x111418 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.002;
    scene.add(floor);

    // Resize
    const onResize = () => {
      camera.aspect = wrap.clientWidth / wrap.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Loop
    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    // Cleanup
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      wrap.removeChild(renderer.domElement);
    };
  }, []);

  // Zi / Noapte
  useEffect(() => {
    const sky = skyRef.current;
    const scene = sceneRef.current;
    if (!sky || !scene) return;
    const amb = scene.getObjectByName('ambient');
    if (isNight) {
      sky.setMode('night');
      if (amb) amb.intensity = 0.25;
    } else {
      sky.setMode('day');
      if (amb) amb.intensity = 0.6;
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