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
import createSky from './threeWorld/createSky';
import createLandscape from './threeWorld/createLandscape';
import ContainerInfoCard from './ContainerInfoCard';
import { slotToWorld } from './threeWorld/slotToWorld';
import createFirstPerson from './threeWorld/firstPerson';
import Navbar3D from './Navbar3D';
import BuildPalette from './build/BuildPalette';
import createBuildController from './world/buildController'; // ✅ import direct

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
  const rendererRef = useRef(null);
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
  const [error,   setError]   = useState('');
  const navigate = useNavigate();

  // Build mode
  const [buildActive, setBuildActive] = useState(false);
  const buildActiveRef = useRef(false);
  useEffect(()=>{ buildActiveRef.current = buildActive; }, [buildActive]);

  const [buildMode,   setBuildMode]   = useState('place'); // 'place' | 'remove'
  const [showBuild,   setShowBuild]   = useState(false);   // UI paletă
  const buildRef = useRef(null);
  const worldGroupRef = useRef(null);
  const groundMeshRef = useRef(null);

  // Items list modal
  const [itemsOpen, setItemsOpen] = useState(false);

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

  /* ---------- INIT SCENE (o singură dată) ---------- */
  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

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

    // CER HDRI
    scene.add(
      createSky({
        scene,
        renderer,
        hdrPath: '/textures/lume/golden_gate_hills_1k.hdr',
        exposure: 1.1,
      })
    );

    // PEISAJ larg (exterior)
    scene.add(createLandscape({ ground: CFG.ground }));

    // === WORLD EDITABLE ===
    const worldGroup = new THREE.Group();
    worldGroup.name = 'worldGroup';
    scene.add(worldGroup);
    worldGroupRef.current = worldGroup;

    // CURTE (ground + gard)
    const depotGroup = new THREE.Group();
    const groundNode = createGround(CFG.ground);
    const groundMesh = groundNode.userData?.groundMesh || groundNode; // pentru raycast
    groundMeshRef.current = groundMesh;

    const fence  = createFence({ ...CFG.fence, width: YARD_WIDTH - 4, depth: YARD_DEPTH - 4 });
    depotGroup.add(groundNode, fence);
    scene.add(depotGroup);

    // Build controller — creat o singură dată
    buildRef.current = createBuildController({
      camera,
      domElement: renderer.domElement,
      worldGroup,
      groundMesh,
      grid: 1,
    });
    buildRef.current?.setMode(buildMode);

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

    // pick containere (listener unic; citește buildActive via ref)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (event) => {
      if (event.target.closest(`.${styles.searchContainer}`)) return;
      if (buildActiveRef.current) return; // nu selectăm containere când construim

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

    // cleanup (unic)
    return () => {
      mount.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      fpRef.current?.removeKeyboard();
      renderer.dispose();
    };
  }, [bounds]);

  /* ---------- LISTENERE PT. BUILD (atașate doar când buildActive === true) ---------- */
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !buildRef.current) return;

    function onPointerMove(e) {
      if (!buildActiveRef.current) return;
      buildRef.current.updatePreviewAt(e.clientX, e.clientY);
    }
    function onPointerDown(e) {
      if (!buildActiveRef.current) return;
      buildRef.current.clickAt(e.clientX, e.clientY);
    }

    if (buildActive) {
      renderer.domElement.addEventListener('pointermove', onPointerMove);
      renderer.domElement.addEventListener('pointerdown', onPointerDown);
    }

    return () => {
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    };
  }, [buildActive]); // ✅ nu dublează listener-ele când schimbi `buildMode`

  // când schimbă buildActive, pornesc/opresc Orbit
  useEffect(()=>{
    const orbit = controlsRef.current;
    if (!orbit) return;
    orbit.enabled = !buildActive && !isFPRef.current;
  }, [buildActive]);

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
  const handleSelectFromSearch = (container) => setFlyToTarget(container);
  const handleToggleFP = () => toggleFP();
  const handleAdd = (formData) => { console.log('Add from Navbar3D:', formData); };
  const handleOpenWorldItems = () => setItemsOpen(true);
  const handleOpenBuild = () => { setShowBuild(true); setBuildActive(true); };   // ✅ unic

  /* ---------- RENDER ---------- */
  return (
    <div className={styles.fullscreenRoot}>
      {/* Navbar mic cu tool-uri */}
      <Navbar3D
        containers={allContainers}
        onSelectContainer={handleSelectFromSearch}
        onToggleFP={handleToggleFP}
        onAdd={handleAdd}
        onOpenBuild={handleOpenBuild}           // 🧱 (UN SINGUR prop)
        onOpenWorldItems={handleOpenWorldItems}
      />

      {/* Top bar exit */}
      <div className={styles.topBar}>
        <button className={styles.iconBtn} onClick={() => navigate('/depot')}>✕</button>
      </div>

      {/* Controale mobile în First-Person */}
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

      {/* Canvas */}
      <div ref={mountRef} className={styles.canvasHost} />

      {/* Card info container */}
      <ContainerInfoCard
        container={selectedContainer}
        onClose={() => setSelectedContainer(null)}
      />

      {/* Build Palette (UI) */}
      {showBuild && (
        <BuildPalette
          onClose={() => { setShowBuild(false); setBuildActive(false); }}
          onPickType={(t) => buildRef.current?.setType(t)}
          mode={buildMode}
          setMode={(m) => { setBuildMode(m); buildRef.current?.setMode(m); }}
          onRotateStep={(dir) => buildRef.current?.rotateStep(dir)}
          onFinalize={(json) => {
            console.log('WORLD JSON', json);
            setShowBuild(false);
            setBuildActive(false);
          }}
        />
      )}

      {/* World Items – placeholder */}
      {itemsOpen && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.45)', zIndex:30,
                      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ width:'min(560px,94vw)', background:'#0b1220', color:'#fff',
                        borderRadius:12, padding:16, boxShadow:'0 10px 30px rgba(0,0,0,.4)' }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h3 style={{margin:0}}>World Items</h3>
              <button onClick={()=>setItemsOpen(false)} style={{fontSize:20, background:'transparent', color:'#fff', border:'none'}}>✕</button>
            </div>
            <div style={{opacity:.7, marginTop:8}}>
              De aici vei lista/edita/șterge obiectele plasate (drumuri, segmente gard, rocă, etc.).
              Populează cu store-ul din buildController (ex: worldStore.items).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}