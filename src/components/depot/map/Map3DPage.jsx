import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import styles from './Map3DStandalone.module.css';

import createGround from '../../threeWorld/createGround';
import fetchContainers from '../../threeWorld/fetchContainers';
import createContainersLayer from '../../threeWorld/createContainersLayer';

// shader sky (cupolă) – culori zi/noapte
function createSky({ radius = 500 } = {}) {
  const topDay = new THREE.Color(0x8fd3fe);     // albastru senin
  const botDay = new THREE.Color(0xc9efff);
  const topNight = new THREE.Color(0x0b1020);   // albastru foarte închis
  const botNight = new THREE.Color(0x101525);

  const uniforms = {
    topColor:    { value: topDay.clone() },
    bottomColor: { value: botDay.clone() },
    offset:      { value: 0.2 },
    exponent:    { value: 0.9 },
  };

  const geo = new THREE.SphereGeometry(radius, 40, 28);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms,
    vertexShader: `
      varying vec3 vPos;
      void main(){
        vPos = (modelMatrix * vec4(position,1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vPos,1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vPos;
      void main(){
        float h = normalize(vPos).y;
        float f = max(pow(max(h + offset, 0.0), exponent), 0.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, f), 1.0);
      }`,
  });

  const sky = new THREE.Mesh(geo, mat);

  // API mic pentru comutare mod
  sky.userData.setMode = (mode) => {
    if (mode === 'night') {
      uniforms.topColor.value.copy(topNight);
      uniforms.bottomColor.value.copy(botNight);
      uniforms.offset.value = 0.15;
      uniforms.exponent.value = 0.8;
    } else {
      uniforms.topColor.value.copy(topDay);
      uniforms.bottomColor.value.copy(botDay);
      uniforms.offset.value = 0.2;
      uniforms.exponent.value = 0.9;
    }
  };

  return sky;
}

export default function Map3DPage() {
  const navigate = useNavigate();
  const mountRef = useRef(null);
  const three = useRef({});
  const [mode, setMode] = useState('day'); // 'day' | 'night'

  // comută lumini + cer
  const applyMode = (mode) => {
    const { sun, hemi, sky } = three.current;
    if (!sun || !hemi || !sky) return;

    if (mode === 'night') {
      sun.intensity = 0.35;
      sun.color.set(0xbdd3ff);
      hemi.intensity = 0.25;
      hemi.color.set(0xbfcfe6);
      sky.userData.setMode('night');
    } else {
      sun.intensity = 1.0;
      sun.color.set(0xffffff);
      hemi.intensity = 0.65;
      hemi.color.set(0xffffff);
      sky.userData.setMode('day');
    }
  };

  useEffect(() => {
    const mount = mountRef.current;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // scenă + cameră
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.1,
      2000
    );
    camera.position.set(90, 85, 120);

    // lumini
    const hemi = new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 0.65);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(140, 220, 120);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    // cer
    const sky = createSky({ radius: 800 });
    scene.add(sky);

    // orbit
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.update();

    // asfalt – mai MARE (încape tot: ABC/DEF + spațiu)
    const ground = createGround({
      width: 180,      // X
      depth: 120,      // Z
      color: 0x2b2f36,
      abcOffsetX: -14,
      defOffsetX: 44,
      abcToDefGap: 20,
    });
    ground.receiveShadow = true;
    scene.add(ground);

    // containere
    (async () => {
      try {
        const data = await fetchContainers(); // { containers: [...] }
        const layout = {
          abcOffsetX: -14,
          defOffsetX: 44,
          abcToDefGap: 20,
          abcNumbersReversed: true,
          debug: false,
        };
        const layer = createContainersLayer(data, layout);
        scene.add(layer);
        three.current.layer = layer;
      } catch (e) {
        console.error('Fetch/Layer error:', e);
      }
    })();

    // animare
    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      clock.getDelta();
      if (three.current.layer?.userData?.tick) {
        three.current.layer.userData.tick();
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    // resize
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // stocăm
    three.current = { renderer, scene, camera, controls, sun, hemi, sky, raf };
    applyMode(mode); // aplică starea inițială

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // când user apasă toggle
  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <div className={styles.leftRow}>
          <button className={styles.backBtn} onClick={() => navigate('/depot')}>
            <span className={styles.backIcon}>←</span>
            Volver al Depot
          </button>
        </div>
        <h1 className={styles.title}>Mapa 3D · Depósito</h1>
        <div className={styles.rightRow}>
          <button
            className={styles.toggleBtn}
            onClick={() => setMode((m) => (m === 'day' ? 'night' : 'day'))}
            title="Cambiar modo Día/Noche"
          >
            {mode === 'day' ? '🌙 Noche' : '☀️ Día'}
          </button>
        </div>
      </div>

      <div ref={mountRef} className={styles.canvasMount} />
    </div>
  );
}