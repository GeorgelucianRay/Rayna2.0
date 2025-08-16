// src/components/MapPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import styles from './MapStandalone.module.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

/* ─────────────── NAVIERA → culoare ─────────────── */
const NAVIERA_COLORS = {
  MAERSK: 0xbfc7cf,     // gri deschis
  HAPAG: 0xf97316,      // portocaliu
  MESSINA: 0xf97316,    // portocaliu-roșiatic
  ONE: 0xec4899,        // roz
  EVERGREEN: 0x22c55e,  // verde
  ARCAS: 0x2563eb,      // albastru
  MSK: 0xeab308,        // galben muștar
  OTROS: 0x8b5e3c       // maro neutru
};

function normalizeNaviera(v = '') {
  const s = (v || '').trim().toUpperCase();
  if (s.includes('MAERSK')) return 'MAERSK';
  if (s.includes('HAPAG')) return 'HAPAG';
  if (s.includes('MESSINA')) return 'MESSINA';
  if (s === 'ONE') return 'ONE';
  if (s.includes('EVERGREEN')) return 'EVERGREEN';
  if (s.includes('ARCAS')) return 'ARCAS';
  if (s === 'MSK') return 'MSK';
  return 'OTROS';
}

/* ─────────────── dimensiuni container ─────────────── */
const SIZE_BY_TIPO = {
  '20':        { L: 6.06,  H: 2.59, W: 2.44 },
  '20opentop': { L: 6.06,  H: 2.59, W: 2.44 },
  '40alto':    { L:12.19,  H: 2.89, W: 2.44 },
  '40bajo':    { L:12.19,  H: 2.59, W: 2.44 },
  '40opentop': { L:12.19,  H: 2.59, W: 2.44 },
  '45':        { L:13.72,  H: 2.89, W: 2.44 }
};

function normalizeTipo(raw = '') {
  // acoperă valori gen: '40 Alto', '40 bajo', '20 OpenTop' etc.
  const s = raw.toString().trim().toLowerCase().replace(/\s+/g, '');
  if (s.startsWith('20opentop')) return '20opentop';
  if (s.startsWith('40opentop')) return '40opentop';
  if (s.startsWith('40alto'))    return '40alto';
  if (s.startsWith('40bajo'))    return '40bajo';
  if (s === '20')                return '20';
  if (s === '45')                return '45';
  // fallback rezonabil
  if (s.startsWith('40'))        return '40bajo';
  return '40bajo';
}

/* ─────────────── culoare finală ─────────────── */
function pickColor(naviera = '', esteRoto = false, esteProgramado = false) {
  if (esteRoto) return 0xef4444; // roșu aprins
  const base = NAVIERA_COLORS[normalizeNaviera(naviera)] ?? NAVIERA_COLORS.OTROS;
  if (!esteProgramado) return base;
  // ușor mai luminos pentru programados
  const c = new THREE.Color(base);
  c.offsetHSL(0, 0, 0.1);
  return c.getHex();
}

/* ─────────────── parse poziție "A1" / "A10B" ─────────────── */
function parsePos(pos = '') {
  const m = pos.trim().toUpperCase().match(/^([A-F])(\d{1,2})([A-Z])?$/);
  if (!m) return null;
  const row = m[1];                  // A..F
  const col = Number(m[2]);          // 1..n
  const levelLetter = m[3] || 'A';   // A=1, B=2...
  const level = levelLetter.charCodeAt(0) - 64;
  return { row, col, level };
}

/* ─────────────── mapping poziție → coordonate ───────────────
   NOTĂ: Ținem logica actuală; după ce vezi în acțiune, împărțim ABC/DEF.
*/
function toCoord(row, col, level, height) {
  const ROW_SPACING = 6;    // distanță între rânduri pe Z
  const COL_SPACING = 14;   // distanță între coloane pe X
  const BASE_Y = 0;

  const rowIndex = { A: -0, B: -1, C: -2, D: +0, E: +1, F: +2 }[row] ?? 0;
  const sideShift = (row <= 'C') ? -1 : +1; // ABC la stânga, DEF la dreapta (culoar la mijloc)

  const x = sideShift * (COL_SPACING * (col - 1) + 10);
  const z = rowIndex * ROW_SPACING;
  const y = BASE_Y + (height / 2) + (height * (level - 1));
  return new THREE.Vector3(x, y, z);
}

export default function MapPage() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const frameRef = useRef(null);
  const groupRef = useRef(null);

  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());

  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedInfo, setSelectedInfo] = useState(null); // panel info pentru click

  /* ─────────────── fetch Supabase (coloane exacte) ─────────────── */
  async function loadContainers() {
    try {
      const [
        { data: enDep,  error: e1 },
        { data: prog,   error: e2 },
        { data: rotos,  error: e3 }
      ] = await Promise.all([
        supabase
          .from('contenedores')
          .select('id,created_at,matricula_contenedor,naviera,tipo,posicion,estado,matricula_camion'),
        supabase
          .from('contenedores_programados')
          .select('id,created_at,matricula_contenedor,naviera,tipo,posicion,empresa_descarga,fecha,hora,matricula_camion,estado'),
        supabase
          .from('contenedores_rotos')
          .select('id,created_at,matricula_contenedor,naviera,tipo,posicion,detalles,matricula_camion')
      ]);

      if (e1 || e2 || e3) throw e1 || e2 || e3;

      return {
        enDeposito: enDep || [],
        programados: prog || [],
        rotos: rotos || []
      };
    } catch (err) {
      console.warn('Supabase fetch a eșuat. Continuăm cu demo:', err?.message || err);
      return { enDeposito: [], programados: [], rotos: [] };
    }
  }

  /* ─────────────── three init ─────────────── */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (e) {
      setError('Tu dispositivo/navegador no soporta WebGL.');
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f1a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.1,
      3000
    );
    camera.position.set(36, 28, 42);
    cameraRef.current = camera;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 1.1);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(50, 60, 20);
    scene.add(dir);

    // sol + grid
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 300),
      new THREE.MeshStandardMaterial({ color: 0x2a2f35, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const grid = new THREE.GridHelper(600, 60, 0x2dd4bf, 0x374151);
    grid.position.y = 0.02;
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(0, 1.2, 0);
    controlsRef.current = controls;

    const containersGroup = new THREE.Group();
    groupRef.current = containersGroup;
    scene.add(containersGroup);

    // helper: container mesh
    const makeContainer = (tipoRaw, colorHex) => {
      const key = normalizeTipo(tipoRaw);
      const dims = SIZE_BY_TIPO[key] || SIZE_BY_TIPO['40bajo'];
      const geom = new THREE.BoxGeometry(dims.L, dims.H, dims.W);
      const mat = new THREE.MeshStandardMaterial({ color: colorHex });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.userData.__dims = dims;
      return mesh;
    };

    // adăugare item în scenă
    const addItem = (rec, { roto = false, programado = false } = {}) => {
      const color = pickColor(rec.naviera, roto, programado);
      const mesh = makeContainer(rec.tipo, color);

      const parsed = parsePos(rec.posicion || '');
      if (parsed) {
        const v = toCoord(parsed.row, parsed.col, parsed.level, mesh.userData.__dims.H);
        mesh.position.copy(v);
      } else {
        // fallback zonă parcare
        mesh.position.set(0, mesh.userData.__dims.H / 2, 40);
      }

      if (programado) {
        mesh.userData.__pulse = { base: 1, t: Math.random() * Math.PI * 2 };
      }

      mesh.userData.__record = rec;
      mesh.userData.__flags = { roto, programado };
      containersGroup.add(mesh);
    };

    // fetch + plasare
    (async () => {
      const { enDeposito, programados, rotos } = await loadContainers();

      enDeposito.forEach((r) => addItem(r));
      programados.forEach((r) => addItem(r, { programado: true }));
      rotos.forEach((r) => addItem(r, { roto: true }));

      // dacă nu e nimic, demo
      if (containersGroup.children.length === 0) {
        [
          { naviera: 'Evergreen', tipo: '40 Alto', posicion: 'A1', matricula_contenedor: 'EGHU001' },
          { naviera: 'Hapag', tipo: '20', posicion: 'A2B', matricula_contenedor: 'HAPU002' },
          { naviera: 'ONE', tipo: '40 Bajo', posicion: 'E3', matricula_contenedor: 'ONEU003' },
        ].forEach((r) => addItem(r));
      }

      setLoading(false);
    })();

    // raycast: pointer move (pt dblclick/hover dacă vrei ulterior)
    const onPointerMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      pointerRef.current.set(x, y);
    };

    // click: deschide panel info
    const onClick = () => {
      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      const hits = raycasterRef.current.intersectObjects(containersGroup.children, false);
      if (hits.length) {
        const obj = hits[0].object;
        const rec = obj.userData.__record || {};
        const flags = obj.userData.__flags || {};
        setSelectedInfo({
          ...rec,
          __roto: !!flags.roto,
          __programado: !!flags.programado,
        });
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    // loop
    const animate = () => {
      // pulse pentru programados
      containersGroup.children.forEach((m) => {
        if (m.userData.__pulse) {
          const p = m.userData.__pulse;
          p.t += 0.04;
          const s = 1 + Math.sin(p.t) * 0.05;
          m.scale.set(1, s, 1);
        }
      });
      controls.update();
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };
    animate();

    // resize
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // cleanup
    return () => {
      setSelectedInfo(null);
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
          else obj.material.dispose?.();
        }
      });
    };
  }, []);

  return (
    <div className={styles.fullscreenRoot}>
      {/* top bar */}
      <div className={styles.topBar}>
        <button className={styles.iconBtn} onClick={() => navigate('/depot')}>✕</button>
        <button className={styles.iconBtn} onClick={() => navigate('/depot')}>＋</button>
      </div>

      {/* fallback / loader / canvas */}
      {error ? (
        <div className={styles.fallback}>
          <h2>Rayna 3D Depot</h2>
          <p>{error}</p>
          <button className={styles.primary} onClick={() => navigate('/depot')}>Volver al Depot</button>
        </div>
      ) : (
        <>
          {loading && <div className={styles.loader}>Cargando mapa 3D…</div>}
          <div ref={mountRef} className={styles.canvasHost} />
        </>
      )}

      {/* info panel la click pe un container */}
      {selectedInfo && (
        <div className={styles.infoCard}>
          <div className={styles.infoHeader}>
            <strong>{selectedInfo.matricula_contenedor || 'Contenedor'}</strong>
            <button className={styles.infoClose} onClick={() => setSelectedInfo(null)}>×</button>
          </div>
          <div className={styles.infoBody}>
            {selectedInfo.naviera && <p><strong>Naviera:</strong> {selectedInfo.naviera}</p>}
            {selectedInfo.tipo && <p><strong>Tipo:</strong> {selectedInfo.tipo}</p>}
            {selectedInfo.posicion && <p><strong>Posición:</strong> {selectedInfo.posicion}</p>}
            {selectedInfo.estado && <p><strong>Estado:</strong> {selectedInfo.estado}</p>}
            {selectedInfo.matricula_camion && <p><strong>Matrícula Camión:</strong> {selectedInfo.matricula_camion}</p>}
            {selectedInfo.empresa_descarga && <p><strong>Empresa:</strong> {selectedInfo.empresa_descarga}</p>}
            {(selectedInfo.fecha || selectedInfo.hora) && (
              <p><strong>Programado:</strong> {selectedInfo.fecha || ''} {selectedInfo.hora || ''}</p>
            )}
            {selectedInfo.detalles && <p><strong>Detalles:</strong> {selectedInfo.detalles}</p>}
            {selectedInfo.__roto && <p className={styles.badgeDanger}>ROTO</p>}
            {selectedInfo.__programado && <p className={styles.badgeWarn}>PROGRAMADO</p>}
          </div>
          <div className={styles.infoFooter}>
            <button className={styles.secondary} onClick={() => navigate('/depot')}>Editar / Mover</button>
            <button className={styles.primary} onClick={() => setSelectedInfo(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}