import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import createSky from './createSky';
import createMountainWall from './createMountainWall';
import fetchContainers from './fetchContainers';
import createContainersLayer from './createContainersLayer'; // sau Optimized

export default function Map3DCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const w = mount.clientWidth, h = mount.clientHeight;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // scene
    const scene = new THREE.Scene();

    // camera
    const camera = new THREE.PerspectiveCamera(60, w/h, 0.1, 1000);
    camera.position.set(26, 24, 32);

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;

    // light
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(40, 80, 30);
    dir.castShadow = true;
    scene.add(dir, new THREE.AmbientLight(0xffffff, 0.35));

    // sky + “munte” nord
    scene.add(createSky());
    scene.add(createMountainWall({ yardDepth: 140, fenceMargin: 2 }));

    // opțional: sol simplu
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(280, 140),
      new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 1 })
    );
    ground.rotation.x = -Math.PI/2;
    ground.receiveShadow = true;
    scene.add(ground);

    // layout (ajustează după curtea reală)
    const layout = {
      abcOffsetX: 40,       // deplasări în metri
      defOffsetX: -20,
      abcToDefGap: -14,
      abcNumbersReversed: true,
      debug: false,
    };

    let containersLayer = null;
    let running = true;

    (async () => {
      const data = await fetchContainers();
      containersLayer = createContainersLayer(data, layout);
      scene.add(containersLayer);
    })();

    const onResize = () => {
      const W = mount.clientWidth, H = mount.clientHeight;
      camera.aspect = W/H; camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    const tick = () => {
      if (!running) return;
      const dt = clock.getDelta();
      controls.update();
      containersLayer?.userData?.tick?.(dt);
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    };
    tick();

    return () => {
      running = false;
      window.removeEventListener('resize', onResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} style={{ width:'100%', height:'calc(100vh - 80px)' }} />;
}