// src/components/depot/map/Map3DPage.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

import styles from './Map3DStandalone.module.css';

import createGround from './threeWorld/createGround';
import createFence from './threeWorld/createFence';
import createContainersLayerOptimized from './threeWorld/createContainersLayerOptimized';
import fetchContainers from './threeWorld/fetchContainers';
import createSky from './threeWorld/createSky';                // primește { scene, renderer, hdrPath, ... }
import createLandscape from './threeWorld/createLandscape';
import ContainerInfoCard from './ContainerInfoCard';
import { slotToWorld } from './threeWorld/slotToWorld';
import createFirstPerson from './threeWorld/firstPerson';       // controller FP
import Navbar3D from './Navbar3D';                               // 🔧 nou

/* ===================== CONFIG ===================== */
const YARD_WIDTH = 90, YARD_DEPTH = 60, YARD_COLOR = 0x9aa0a6;
const STEP = 6.06 + 0.06, ABC_CENTER_OFFSET_X = 5 * STEP;
const CFG = {
  ground: { width: YARD_WIDTH, depth: YARD_DEPTH, color: YARD_COLOR, abcOffsetX: ABC_CENTER_OFFSET_X, defOffsetX: 32.3, abcToDefGap: -6.2 },
  fence:  { margin: 2, postEvery: 10, gate: { side: 'west', width: 10, centerZ: -6.54, tweakZ: 0 } },
};
/* =================================================== */

/* ---------- UI: Joystick + Forward Button ---------- */
function VirtualJoystick({ onChange, ensureFP, size = 120 }) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  function setVec(clientX, clientY) {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    const dx = clientX - cx, dy = clientY - cy;
    const rad = r.width / 2;
    const nx = THREE.MathUtils.clamp(dx / rad, -1, 1);
    const ny = THREE.MathUtils.clamp(dy / rad, -1, 1);
    setKnob({ x: nx, y: ny });
    onChange?.({ x: nx, y: ny, active: true });
  }
  const stop = () => { setKnob({x:0,y:0}); setActive(false); onChange?.({x:0,y:0,active:false}); };

  return (
    <div
      ref={ref}
      style={{
        position:'absolute', left:12, bottom:12, zIndex:5,
        width:size, height:size, borderRadius:size/2,
        background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,.2)',
        touchAction:'none', userSelect:'none'
      }}
      onMouseDown={e => { ensureFP?.(); setActive(true); setVec(e.clientX, e.clientY); }}
      onMouseMove={e => active && setVec(e.clientX, e.clientY)}
      onMouseUp={stop} onMouseLeave={stop}
      onTouchStart={e => { ensureFP?.(); setActive(true); const t=e.touches[0]; setVec(t.clientX,t.clientY); }}
      onTouchMove={e => { const t=e.touches[0]; setVec(t.clientX,t.clientY); }}
      onTouchEnd={stop}
    >
      <div style={{
        position:'absolute',
        left:`calc(50% + ${knob.x * (size*0.35)}px)`,
        top:`calc(50% + ${knob.y * (size*0.35)}px)`,
        transform:'translate(-50%,-50%)',
        width:size*0.35, height:size*0.35, borderRadius:'50%',
        background:'rgba(255,255,255,.25)', backdropFilter:'blur(2px)'
      }}/>
    </div>
  );
}
function ForwardButton({ pressed, setPressed, ensureFP }) {
  return (
    <button
      onMouseDown={() => { ensureFP?.(); setPressed(true); }}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => { ensureFP?.(); setPressed(true); }}
      onTouchEnd={() => setPressed(false)}
      title="Mergi înainte"
      style={{
        position:'absolute', right:12, bottom:14, zIndex:5,
        width:64, height:64, borderRadius:32, border:'none',
        background: pressed ? '#10b981' : '#1f2937', color:'#fff',
        fontSize:30, lineHeight:'64px', boxShadow:'0 2px 10px rgba(0,0,0,.25)'
      }}
    >↑</button>
  );
}
/* --------------------------------------------------- */

export default function MapPage() {
  const mountRef = useRef(null);
  const cameraRef = useRef();
  const controlsRef = useRef();
  const isAnimatingRef = useRef(false);
  const clockRef = useRef(new THREE.Clock());

  // FP controller + state sigur
  const [isFP, setIsFP] = useState(false);
  const isFPRef = useRef(false);
  useEffect(() => { isFPRef.current = isFP; }, [isFP]);

  const fpRef = useRef(null);
  const fpReadyRef = useRef(false);
  const pendingEnableRef = useRef(false);

  const [fwdPressed, setFwdPressed] = useState(false);

  const [selectedContainer, setSelectedContainer] = useState(null);
  const [allContainers, setAllContainers] = useState([]);
  const [flyToTarget, setFlyToTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const bounds = useMemo(() => ({
    minX: -YARD_WIDTH / 2 + 2,
    maxX:  YARD_WIDTH / 2 - 2,
    minZ: -YARD_DEPTH / 2 + 2,
    maxZ:  YARD_DEPTH / 2 - 2,
  }), []);

  /* ---------- HANDLERS (FP) ---------- */
  const enableFPInternal = () => {
    const orbit = controlsRef.current;
    if (!orbit) return;
    if (!fpRef.current || !fpReadyRef.current) { pendingEnableRef.current = true; return; }
    orbit.enabled = false;
    fpRef.current.enable();
    fpRef.current.addKeyboard();
    isFPRef.current = true;
    setIsFP(true);
  };
  const disableFPInternal = () => {
    const orbit = controlsRef.current;
    if (!orbit) return;
    if (fpRef.current) {
      fpRef.current.disable();
      fpRef.current.removeKeyboard();
    }
    orbit.enabled = true;
    isFPRef.current = false;
    setIsFP(false);
  };
  const ensureFP = () => { if (!isFPRef.current) enableFPInternal(); };
  const toggleFP = () => { isFPRef.current ? disableFPInternal() : enableFPInternal(); };

  /* ---------- INIT SCENE ---------- */
  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // scenă + cameră
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth/mount.clientHeight, 0.1, 1000);
    camera.position.set(20, 8, 20);
    cameraRef.current = camera;

    // orbit
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    // first-person
    fpRef.current = createFirstPerson(camera, bounds);
    fpReadyRef.current = true;
    if (pendingEnableRef.current) { enableFPInternal(); pendingEnableRef.current = false; }

    // lumini + lume
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(5,10,5); scene.add(dir);

    // CER HDRI — PASĂM renderer-ul aici
    scene.add(
      createSky({
        scene,
        renderer,
        hdrPath: '/textures/lume/golden_gate_hills_1k.hdr', // fișierul tău
        exposure: 1.1,
      })
    );

    // PEISAJ + CURTE
    scene.add(createLandscape({ ground: CFG.ground }));
    const depotGroup = new THREE.Group();
    const ground = createGround(CFG.ground);
    const fence  = createFence({ ...CFG.fence, width: YARD_WIDTH - 4, depth: YARD_DEPTH - 4 });
    depotGroup.add(ground, fence);
    scene.add(depotGroup);

    // containere
    (async () => {
      try {
        const data = await fetchContainers();
        setAllContainers(data.containers);
        depotGroup.add(createContainersLayerOptimized(data, CFG.ground));
      } catch (e) {
        console.warn(e); setError('Nu am putut încărca containerele.');
      } finally { setLoading(false); }
    })();

    // pick
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (event) => {
      if (event.target.closest(`.${styles.searchContainer}`)) return;
      const rect = mount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(depotGroup.children, true);
      if (intersects.length > 0) {
        const hit = intersects[0], obj = hit.object;
        if (obj.isInstancedMesh && obj.userData?.records && hit.instanceId != null) {
          const rec = obj.userData.records[hit.instanceId]; if (rec) { setSelectedContainer(rec); return; }
        }
        if (obj.userData?.__record) { setSelectedContainer(obj.userData.__record); return; }
      }
      setSelectedContainer(null);
    };
    mount.addEventListener('click', onClick);

    // loop
    const minX = -YARD_WIDTH/2 + 5, maxX = YARD_WIDTH/2 + 5;
    const minZ = -YARD_DEPTH/2 + 5, maxZ = YARD_DEPTH/2 + 5;

    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();

      if (isFPRef.current) {
        fpRef.current?.update(delta);
      } else {
        controls.update();
        if (!isAnimatingRef.current) {
          controls.target.x = THREE.MathUtils.clamp(controls.target.x, minX, maxX);
          controls.target.z = THREE.MathUtils.clamp(controls.target.z, minZ, maxZ);
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    // resize
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // cleanup
    return () => {
      mount.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      fpRef.current?.removeKeyboard();
      renderer.dispose();
    };
  }, [bounds]);

  // joystick: “înainte”
  useEffect(() => { fpRef.current?.setForwardPressed(fwdPressed); }, [fwdPressed]);

  /* ---------- FLY-TO ---------- */
  useEffect(() => {
    if (!flyToTarget) return;
    const camera = cameraRef.current; const controls = controlsRef.current;
    if (!camera || !controls) return;
    const pos = flyToTarget.posicion?.trim().toUpperCase();
    const m = pos?.match?.(/^([A-F])(\d{1,2})([A-Z])?$/); if (!m) return;
    const wp = slotToWorld(
      { lane: m[1], index: Number(m[2]), tier: m[3] || 'A' },
      { ...CFG.ground, abcNumbersReversed: true }
    );
    const target = wp.position;
    const camPos = new THREE.Vector3().copy(target).add(new THREE.Vector3(10,8,10));
    gsap.to(controls.target, {
      x: target.x, y: target.y, z: target.z,
      duration: 1.5, ease: 'power3.out',
      onStart: () => { isAnimatingRef.current = true; },
      onComplete: () => { isAnimatingRef.current = false; }
    });
    gsap.to(camera.position, { x: camPos.x, y: camPos.y, z: camPos.z, duration: 1.5, ease:'power3.out' });
    setSelectedContainer(flyToTarget); setFlyToTarget(null);
  }, [flyToTarget]);

  /* ---------- CALLBACK-URI PENTRU NAVBAR3D ---------- */
  const handleSelectFromSearch = (container) => {
    setFlyToTarget(container);
  };
  const handleToggleFP = () => {
    toggleFP();
  };
  const handleAdd = (formData) => {
    // TODO: integrează cu Supabase / fluxul tău existent
    console.log('Add from Navbar3D:', formData);
  };

  /* ---------- RENDER ---------- */
  return (
    <div className={styles.fullscreenRoot}>
      {/* Navbar mic cu tool-uri */}
      <Navbar3D
        containers={allContainers}
        onSelectContainer={handleSelectFromSearch}
        onToggleFP={handleToggleFP}
        onAdd={handleAdd}
      />

      <div className={styles.topBar}>
        <button className={styles.iconBtn} onClick={() => navigate('/depot')}>✕</button>
      </div>

      {isFP && (
        <>
          <VirtualJoystick
            ensureFP={ensureFP}
            onChange={(v) => fpRef.current?.setJoystick(v)}
          />
          <ForwardButton
            pressed={fwdPressed}
            setPressed={setFwdPressed}
            ensureFP={ensureFP}
          />
        </>
      )}

      <div ref={mountRef} className={styles.canvasHost} />

      <ContainerInfoCard
        container={selectedContainer}
        onClose={() => setSelectedContainer(null)}
      />
    </div>
  );
}