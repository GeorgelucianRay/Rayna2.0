import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';

import createGround from '../../threeWorld/createGround';
import createContainersLayer from '../../threeWorld/createContainersLayer';
import styles from './Map3DStandalone.module.css';

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export default function Map3DPage(){
  const navigate = useNavigate();
  const mountRef = useRef(null);
  const headerRef = useRef(null);
  const [night, setNight] = useState(false);
  const [containers, setContainers] = useState([]);

  /* ==== DATA ==== */
  useEffect(() => {
    (async () => {
      const cols = 'id, matricula_contenedor, naviera, tipo, posicion, pos';
      const [a,b,c] = await Promise.all([
        supabase.from('contenedores').select(cols),
        supabase.from('contenedores_programados').select(cols),
        supabase.from('contenedores_rotos').select(cols),
      ]);
      const combined = [
        ...((a.data||[]).map(r=>({ ...r, __source:'enDeposito'}))),
        ...((b.data||[]).map(r=>({ ...r, __source:'programados'}))),
        ...((c.data||[]).map(r=>({ ...r, __source:'rotos'}))),
      ];
      setContainers(combined);
    })();
  }, []);

  /* ==== 3D ==== */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // măsurare robustă a spațiului disponibil
    const hHeader = headerRef.current?.getBoundingClientRect()?.height ?? 0;
    const width  = mount.clientWidth || window.innerWidth;
    const height = (mount.clientHeight || (window.innerHeight - hHeader)) || 400;

    const scene = new THREE.Scene();
    const skyBottom = new THREE.Color(night ? 0x0a0f18 : 0xd5efff);
    scene.background = skyBottom;

    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(55, width/height, 0.1, 800);
    camera.position.set(60, 65, 85);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(-10, 0, 18);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;

    // lumini zi/noapte
    const sun = new THREE.DirectionalLight(0xffffff, night ? 0.35 : 0.95);
    sun.position.set(100, 160, 60);
    sun.castShadow = true;
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, night ? 0.25 : 0.55));

    // asfalt + marcaje (valorile calibrate)
    const ground = createGround({
      width: 130,
      depth: 105,
      color: 0x2b2f33,
      abcOffsetX: -18,
      defOffsetX: 16,
      abcToDefGap: 8,
    });
    scene.add(ground);

    // containere (dacă nu există, funcția nu crapă)
    const layer = createContainersLayer(
      { containers },
      { abcOffsetX:-18, defOffsetX:16, abcToDefGap:8, abcNumbersReversed:true }
    );
    scene.add(layer);

    // resize sigur (cu fallback de înălțime)
    const onResize = () => {
      const hh = headerRef.current?.getBoundingClientRect()?.height ?? 0;
      const w  = mount.clientWidth || window.innerWidth;
      const h  = (mount.clientHeight || (window.innerHeight - hh)) || 400;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    let raf;
    const tick = () => {
      layer.userData?.tick?.();
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement?.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [night, containers]);

  return (
    <div className={styles.wrap}>
      <header ref={headerRef} className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/depot')}>
          <BackIcon /><span>Volver al Depot</span>
        </button>
        <h1 className={styles.title}>Mapa 3D · Depósito</h1>
        <button className={styles.modeBtn}
          onClick={()=>setNight(v=>!v)}
          title={night ? 'Modo día' : 'Modo noche'}>
          {night ? '☀️ Día' : '🌙 Noche'}
        </button>
      </header>

      <div ref={mountRef} className={styles.canvas} />
    </div>
  );
}