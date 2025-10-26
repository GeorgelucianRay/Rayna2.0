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
import createSky from './threeWorld/createSky';
import createLandscape from './threeWorld/createLandscape';
import ContainerInfoCard from './ContainerInfoCard';
import SearchBox from './SearchBox';
import { slotToWorld } from './threeWorld/slotToWorld';

/* ===================== CONFIG ===================== */
const YARD_WIDTH = 90, YARD_DEPTH = 60, YARD_COLOR = 0x9aa0a6;
const STEP = 6.06 + 0.06, ABC_CENTER_OFFSET_X = 5 * STEP;
const CFG = {
  ground: { width: YARD_WIDTH, depth: YARD_DEPTH, color: YARD_COLOR, abcOffsetX: ABC_CENTER_OFFSET_X, defOffsetX: 32.3, abcToDefGap: -6.2 },
  fence: { margin: 2, postEvery: 10, gate: { side: 'west', width: 10, centerZ: -6.54, tweakZ: 0 } },
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
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = clientX - cx, dy = clientY - cy;
    const rad = r.width / 2;
    const nx = THREE.MathUtils.clamp(dx / rad, -1, 1);
    const ny = THREE.MathUtils.clamp(dy / rad, -1, 1);
    setKnob({ x: nx, y: ny });
    onChange?.({ x: nx, y: ny, active: true });
  }

  const stop = () => { setKnob({ x: 0, y: 0 }); setActive(false); onChange?.({ x: 0, y: 0, active: false }); };

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', left: 12, bottom: 12, zIndex: 5,
        width: size, height: size, borderRadius: size / 2,
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,.2)',
        touchAction: 'none', userSelect: 'none'
      }}
      onMouseDown={(e) => { ensureFP?.(); setActive(true); setVec(e.clientX, e.clientY); }}
      onMouseMove={(e) => active && setVec(e.clientX, e.clientY)}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={(e) => { ensureFP?.(); setActive(true); const t = e.touches[0]; setVec(t.clientX, t.clientY); }}
      onTouchMove={(e) => { const t = e.touches[0]; setVec(t.clientX, t.clientY); }}
      onTouchEnd={stop}
    >
      <div style={{
        position: 'absolute',
        left: `calc(50% + ${knob.x * (size * 0.35)}px)`,
        top: `calc(50% + ${knob.y * (size * 0.35)}px)`,
        transform: 'translate(-50%, -50%)',
        width: size * 0.35, height: size * 0.35, borderRadius: '50%',
        background: 'rgba(255,255,255,.25)', backdropFilter: 'blur(2px)'
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
        position: 'absolute', right: 12, bottom: 14, zIndex: 5,
        width: 64, height: 64, borderRadius: 32, border: 'none',
        background: pressed ? '#10b981' : '#1f2937', color: '#fff',
        fontSize: 30, lineHeight: '64px', boxShadow: '0 2px 10px rgba(0,0,0,.25)'
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

  // Walk mode
  const [isFP, setIsFP] = useState(false);
  const [fwdPressed, setFwdPressed] = useState(false);
  const fwdRef = useRef(false);
  useEffect(() => { fwdRef.current = fwdPressed; }, [fwdPressed]);

  // joystick & tastatură
  const joyRef = useRef({ x: 0, y: 0, active: false });
  const keysRef = useRef({ w:false,a:false,s:false,d:false, ArrowUp:false, ArrowLeft:false, ArrowRight:false, ArrowDown:false });

  // Scene data
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

  // activator simplu pt FP
  const ensureFP = () => {
    const orbit = controlsRef.current;
    const cam = cameraRef.current;
    if (!orbit || !cam) return;
    if (!isFP) {
      orbit.enabled = false;
      cam.position.y = 1.6;
      setIsFP(true);
    }
  };

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(20, 8, 20);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let depotGroup = null;
    let containersLayer = null;

    function onClick(event) {
      if (event.target.closest(`.${styles.searchContainer}`)) return;
      const rect = mount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      if (depotGroup) {
        const intersects = raycaster.intersectObjects(depotGroup.children, true);
        if (intersects.length > 0) {
          const hit = intersects[0], obj = hit.object;
          if (obj.isInstancedMesh && obj.userData?.records && hit.instanceId != null) {
            const rec = obj.userData.records[hit.instanceId]; if (rec) { setSelectedContainer(rec); return; }
          }
          if (obj.userData?.__record) { setSelectedContainer(obj.userData.__record); return; }
        }
      }
      setSelectedContainer(null);
    }
    mount.addEventListener('click', onClick);

    // lights + lume
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(5,10,5); scene.add(dir);
    scene.add(createSky());
    scene.add(createLandscape({ ground: CFG.ground }));

    // curtea
    depotGroup = new THREE.Group();
    const ground = createGround(CFG.ground);
    const fence = createFence({ ...CFG.fence, width: YARD_WIDTH - 4, depth: YARD_DEPTH - 4 });
    depotGroup.add(ground, fence);
    scene.add(depotGroup);

    (async () => {
      try {
        const data = await fetchContainers();
        setAllContainers(data.containers);
        containersLayer = createContainersLayerOptimized(data, CFG.ground);
        depotGroup.add(containersLayer);
      } catch (e) {
        console.warn(e); setError('Nu am putut încărca containerele.');
      } finally { setLoading(false); }
    })();

    // ====== INPUT: tastatură ======
    const down = (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      if (e.key === 'w' || e.key === 'W') keysRef.current.w = true;
      if (e.key === 'a' || e.key === 'A') keysRef.current.a = true;
      if (e.key === 's' || e.key === 'S') keysRef.current.s = true;
      if (e.key === 'd' || e.key === 'D') keysRef.current.d = true;
      if (e.key.startsWith('Arrow')) keysRef.current[e.key] = true;
    };
    const up = (e) => {
      if (e.key === 'w' || e.key === 'W') keysRef.current.w = false;
      if (e.key === 'a' || e.key === 'A') keysRef.current.a = false;
      if (e.key === 's' || e.key === 'S') keysRef.current.s = false;
      if (e.key === 'd' || e.key === 'D') keysRef.current.d = false;
      if (e.key.startsWith('Arrow')) keysRef.current[e.key] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    // ====== LOOP ======
    const minX = -YARD_WIDTH/2 + 5, maxX = YARD_WIDTH/2 + 5;
    const minZ = -YARD_DEPTH/2 + 5, maxZ = YARD_DEPTH/2 + 5;

    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();

      containersLayer?.userData?.tick?.();

      if (!isFP) {
        controls.update();
        if (!isAnimatingRef.current) {
          controls.target.x = THREE.MathUtils.clamp(controls.target.x, minX, maxX);
          controls.target.z = THREE.MathUtils.clamp(controls.target.z, minZ, maxZ);
        }
      } else {
        // ----- WALK MODE -----
        const j = joyRef.current || { x:0, y:0, active:false };
        const DEAD = 0.15;

        // yaw
        const yawSpeed = 1.8;
        let yawInput = 0;
        if (Math.hypot(j.x, j.y) > DEAD) yawInput += j.x;
        if (keysRef.current.d || keysRef.current.ArrowRight) yawInput += 0.8;
        if (keysRef.current.a || keysRef.current.ArrowLeft)  yawInput -= 0.8;
        camera.rotateY(-yawInput * yawSpeed * delta);

        // direcție înainte
        const forward = new THREE.Vector3(); camera.getWorldDirection(forward);
        forward.y = 0; forward.normalize();

        // mers înainte/înapoi
        let moveInput = 0;
        if (Math.hypot(j.x, j.y) > DEAD) moveInput += -j.y;         // joystick: sus înainte
        if (fwdRef.current || keysRef.current.w || keysRef.current.ArrowUp) moveInput += 1;
        if (keysRef.current.s || keysRef.current.ArrowDown) moveInput -= 1;

        if (moveInput !== 0) {
          const moveSpeed = 6;
          camera.position.addScaledVector(forward, moveInput * moveSpeed * delta);
        }

        // limite + înălțime ochi
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, bounds.minX, bounds.maxX);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, bounds.minZ, bounds.maxZ);
        camera.position.y = 1.6;
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      mount.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      renderer.dispose();
    };
  }, [isFP, bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ]);

  // Fly-to (neschimbat)
  useEffect(() => {
    if (!flyToTarget) return;
    const camera = cameraRef.current; const controls = controlsRef.current;
    if (!camera || !controls) return;
    const pos = flyToTarget.posicion?.trim().toUpperCase();
    const match = pos?.match?.(/^([A-F])(\d{1,2})([A-Z])?$/); if (!match) return;
    const worldPos = slotToWorld(
      { lane: match[1], index: Number(match[2]), tier: match[3] || 'A' },
      { ...CFG.ground, abcNumbersReversed: true }
    );
    const targetPosition = worldPos.position;
    const offset = new THREE.Vector3(10, 8, 10);
    const cameraPosition = new THREE.Vector3().copy(targetPosition).add(offset);
    gsap.to(controls.target, {
      x: targetPosition.x, y: targetPosition.y, z: targetPosition.z,
      duration: 1.5, ease: 'power3.out',
      onStart: () => { isAnimatingRef.current = true; },
      onComplete: () => { isAnimatingRef.current = false; }
    });
    gsap.to(camera.position, {
      x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z,
      duration: 1.5, ease: 'power3.out',
    });
    setSelectedContainer(flyToTarget); setFlyToTarget(null);
  }, [flyToTarget]);

  // toggle FP manual
  const toggleFP = () => {
    const orbit = controlsRef.current; const cam = cameraRef.current;
    if (!orbit || !cam) return;
    if (!isFP) { orbit.enabled = false; cam.position.y = 1.6; setIsFP(true); }
    else { orbit.enabled = true; setIsFP(false); }
  };

  return (
    <div className={styles.fullscreenRoot}>
      <div className={styles.searchContainer}>
        <SearchBox containers={[]} onContainerSelect={()=>{}} />
      </div>

      <div className={styles.topBar}>
        <button className={styles.iconBtn} onClick={() => navigate('/depot')}>✕</button>
      </div>

      {isFP && (
        <>
          <VirtualJoystick onChange={(v)=>{ joyRef.current = v; }} ensureFP={ensureFP} />
          <ForwardButton pressed={fwdPressed} setPressed={setFwdPressed} ensureFP={ensureFP} />
        </>
      )}
      <button
        onClick={toggleFP}
        title={isFP ? 'Ieși din Walk' : 'Walk mode'}
        style={{
          position: 'absolute', right: 12, bottom: 90, zIndex: 5,
          width: 48, height: 48, borderRadius: 24, border: 'none',
          background: isFP ? '#10b981' : '#1f2937', color: '#fff',
          fontSize: 22, boxShadow: '0 2px 10px rgba(0,0,0,.25)'
        }}
      >👤</button>

      <div ref={mountRef} className={styles.canvasHost} />

      <ContainerInfoCard container={null} onClose={()=>{}} />
    </div>
  );
}