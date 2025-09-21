import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import createGround from '../../threeWorld/createGround';
import createSky from '../../threeWorld/createSky';

import styles from './Map3DStandalone.module.css'; // full-screen, fără Layout
// butonul “Volver al Depot” este sus, în overlay-ul propriu

export default function Map3DPage() {
  const mountRef = useRef(null);
  const [night, setNight] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // --- Scene ---
    const scene = new THREE.Scene();

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    camera.position.set(40, 55, 80);

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 12);

    // --- Sky + lights (zi/noapte) ---
    const sky = createSky({ radius: 800 });
    scene.add(sky);

    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(120, 180, 80);
    sun.castShadow = false;
    scene.add(sun);

    const amb = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(amb);

    const applyMode = (isNight) => {
      if (isNight) {
        renderer.setClearColor(0x0b1220, 1); // noapte
        amb.color.set(0xbcd0ff);
        amb.intensity = 0.35;
        sun.color.set(0xaec8ff);
        sun.intensity = 0.6;
        sky.userData.setNight?.(true);
      } else {
        renderer.setClearColor(0xd9edf7, 1); // zi
        amb.color.set(0xffffff);
        amb.intensity = 0.7;
        sun.color.set(0xffffff);
        sun.intensity = 0.9;
        sky.userData.setNight?.(false);
      }
    };
    applyMode(night);

    // --- Ground auto-sizing (ABC + DEF) ---
    // Apropiem ABC de DEF cu gapBetween; “margin” = cât asfalt liber în jur
    const ground = createGround({
      gapBetween: 5.5,
      margin: 6,
      color: 0x2b2f33,
      abcNumbersReversed: true
    });
    scene.add(ground);

    // --- Animate ---
    let rafId;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };
    tick();

    // --- Resize ---
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []); // init o singură dată

  // aplică vizual zi/noapte imediat ce se schimbă state-ul
  useEffect(() => {
    const ev = new CustomEvent('map3d-mode-toggle', { detail: { night } });
    window.dispatchEvent(ev);
  }, [night]);

  return (
    <div className={styles.wrap}>
      <div className={styles.headerBar}>
        <button className={styles.backBtn} onClick={() => history.back()}>
          ← Volver al Depot
        </button>

        <h1 className={styles.title}>Mapa 3D · Depósito</h1>

        <button
          className={styles.modeBtn}
          onClick={() => setNight((v) => !v)}
          title={night ? 'Día' : 'Noche'}
        >
          {night ? '☀️ Día' : '🌙 Noche'}
        </button>
      </div>

      <div ref={mountRef} className={styles.canvasHost} />
    </div>
  );
}