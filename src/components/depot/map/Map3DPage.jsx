import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import createGround from '../../threeWorld/createGround';
import createSky from '../../threeWorld/createSky';
import styles from './Map3DStandalone.module.css';

export default function Map3DPage() {
  const mountRef = useRef(null);
  const [night, setNight] = useState(false);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    // scene
    const scene = new THREE.Scene();

    // camera
    const camera = new THREE.PerspectiveCamera(
      55,
      host.clientWidth / host.clientHeight,
      0.1,
      2000
    );
    camera.position.set(60, 60, 60);

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    // sky + lights
    const sky = createSky({ radius: 900 });
    scene.add(sky);

    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(120, 160, 80);
    scene.add(sun);

    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(amb);

    const applyMode = (isNight) => {
      if (isNight) {
        renderer.setClearColor(0x0b1220, 1);
        amb.color.set(0xbfd4ff); amb.intensity = 0.35;
        sun.color.set(0xaec8ff); sun.intensity = 0.6;
        sky.userData.setNight?.(true);
      } else {
        renderer.setClearColor(0xcfefff, 1);
        amb.color.set(0xffffff); amb.intensity = 0.75;
        sun.color.set(0xffffff); sun.intensity = 0.9;
        sky.userData.setNight?.(false);
      }
    };
    applyMode(night);

    // ground (centred @ 0,0,0)
    const ground = createGround({
      // îl ținem centrat și suficient de mare
      width: 90,
      depth: 80,
      color: 0x2b2f33,
      abcX: -18,     // unde „cade” ABC pe X
      defX: 16,      // unde „cade” DEF pe X
      gapBetween: 6, // distanța ABC↔DEF pe Z
      numbersReversed: true
    });
    scene.add(ground);

    // frame ground: box fit
    const box = new THREE.Box3().setFromObject(ground);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);

    controls.target.copy(center);
    const maxDim = Math.max(size.x, size.z);
    const dist = maxDim * 1.4;
    camera.position.set(center.x + dist, center.y + dist, center.z + dist);
    camera.lookAt(center);

    // animate
    let raf;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    // resize
    const onResize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    // listen for external night toggle (optional)
    const onMode = (e) => applyMode(!!e.detail?.night);
    window.addEventListener('map3d-mode-toggle', onMode);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('map3d-mode-toggle', onMode);
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []); // mount once

  // local toggle -> event (sky ascultă)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('map3d-mode-toggle', { detail: { night } }));
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
          onClick={() => setNight(v => !v)}
          title={night ? 'Día' : 'Noche'}
        >
          {night ? '☀️ Día' : '🌙 Noche'}
        </button>
      </div>

      <div ref={mountRef} className={styles.canvasHost} />
    </div>
  );
}