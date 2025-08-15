// src/components/MapPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import styles from './MapStandalone.module.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

/* —— culori naviera —— */
const NAVIERA_COLORS = {
  MAERSK: 0xbfc7cf,
  MSK: 0xeab308,        // muștar
  HAPAG: 0xf97316,
  MESSINA: 0xf97316,
  ONE: 0xec4899,
  EVERGREEN: 0x22c55e,
  ARCAS: 0x2563eb,
  OTROS: 0x8b5e3c
};

/* —— dimensiuni container (aprox, în metri) —— */
const SIZE_BY_TIPO = {
  '20':       { L: 6.06,  H: 2.59, W: 2.44 },
  '20opentop':{ L: 6.06,  H: 2.59, W: 2.44 },
  '40alto':   { L:12.19,  H:2.89,  W:2.44 },
  '40bajo':   { L:12.19,  H:2.59,  W:2.44 },
  '40opentop':{ L:12.19,  H:2.59,  W:2.44 },
  '45':       { L:13.72,  H:2.89,  W:2.44 }
};

function pickColor(naviera = '', roto = false, programado = false) {
  if (roto) return 0xef4444; // roșu aprins pentru roto
  const key = (naviera || '').trim().toUpperCase();
  const base = NAVIERA_COLORS[key] ?? NAVIERA_COLORS.OTROS;
  // ușor mai “electric” dacă e programado
  return programado ? new THREE.Color(base).offsetHSL(0, 0, 0.1).getHex() : base;
}

/* Parsează “posicion” tip A1, A10B (B=etaj 2) */
function parsePos(pos = '') {
  const m = pos.trim().toUpperCase().match(/^([A-F])(\d{1,2})([A-Z])?$/);
  if (!m) return null;
  const row = m[1];       // A..F
  const col = Number(m[2]); // 1..n
  const levelLetter = m[3] || 'A'; // A=etaj 1
  const level = levelLetter.charCodeAt(0) - 64; // A=1, B=2...
  return { row, col, level };
}

/* Transformă row/col/level în coordonate X/Z/Y */
function toCoord(row, col, level, height) {
  // distanțe între rânduri/coloane (metri)
  const ROW_SPACING = 6;     // distanță între A,B,C… pe axa Z
  const COL_SPACING = 14;    // distanță între coloane pe axa X
  const BASE_Y = 0;          // sol
  // mapăm rândurile: A=0, B=-1, C=-2, D=+0, E=+1, F=+2 cu două zone
  const rowIndex = { A:-0, B:-1, C:-2, D:+0, E:+1, F:+2 }[row] ?? 0;
  // lăsăm un “culoar” între ABC (x negativ) și DEF (x pozitiv)
  const sideShift = (row <= 'C') ? -1 : +1;

  const x = sideShift * (COL_SPACING * (col - 1) + 10);
  const z = rowIndex * ROW_SPACING;
  const y = BASE_Y + (height / 2) + (height * (level - 1));
  return new THREE.Vector3(x, y, z);
}

export default function MapPage() {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const controlsRef = useRef(null);
  const frameRef = useRef(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // încarc datele (fără să blochez scena dacă pică)
  const loadContainers = async () => {
    try {
      const [{ data: enDep, error: e1 }, { data: progr, error: e2 }, { data: rotos, error: e3 }] =
        await Promise.all([
          supabase.from('contenedores').select('*'),
          supabase.from('contenedores_programados').select('*'),
          supabase.from('contenedores_rotos').select('*'),
        ]);
      if (e1 || e2 || e3) throw e1 || e2 || e3;

      return {
        enDeposito: enDep || [],
        programados: progr || [],
        rotos: rotos || [],
      };
    } catch (e) {
      console.warn('Supabase fetch failed (continuăm cu demo):', e?.message || e);
      return { enDeposito: [], programados: [], rotos: [] };
    }
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1) Renderer sigur
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

    // 2) Scenă, cameră, lumini
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

    // 3) Sol + grilă
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 300),
      new THREE.MeshStandardMaterial({ color: 0x2a2f35, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const grid = new THREE.GridHelper(600, 60, 0x2dd4bf, 0x374151);
    grid.position.y = 0.02;
    scene.add(grid);

    // 4) Controls (mobil ok)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(0, 1.2, 0);
    controlsRef.current = controls;

    // 5) Grup containere
    const group = new THREE.Group();
    scene.add(group);

    // 6) funcție utilă de creat container
    const makeContainer = (tipo, colorHex) => {
      const key = (tipo || '').toLowerCase();
      const dims = SIZE_BY_TIPO[key] || SIZE_BY_TIPO['40bajo'];
      const geom = new THREE.BoxGeometry(dims.L, dims.H, dims.W);
      const mat = new THREE.MeshStandardMaterial({ color: colorHex });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.userData.__dims = dims;
      return mesh;
    };

    // 7) Încarcă date & plasează
    (async () => {
      const { enDeposito, programados, rotos } = await loadContainers();

      const addItem = (rec, { roto = false, programado = false } = {}) => {
        const color = pickColor(rec.naviera, roto, programado);
        const mesh = makeContainer(rec.tipo, color);

        const pos = parsePos(rec.posicion || '');
        if (pos) {
          const yH = mesh.userData.__dims.H;
          const v = toCoord(pos.row, pos.col, pos.level, yH);
          mesh.position.copy(v);
        } else {
          // fallback „zona parcare” dacă nu are poziție
          mesh.position.set(0, mesh.userData.__dims.H / 2, 40);
        }

        // pulse ușor pentru programados
        if (programado) {
          mesh.userData.__pulse = { base: mesh.scale.y, t: Math.random() * Math.PI * 2 };
        }

        mesh.userData.__record = rec;
        group.add(mesh);
      };

      enDeposito.forEach((r) => addItem(r));
      programados.forEach((r) => addItem(r, { programado: true }));
      rotos.forEach((r) => addItem(r, { roto: true }));

      // demo dacă nu e nimic
      if (group.children.length === 0) {
        const demo = [
          { naviera: 'EVERGREEN', tipo: '40alto', posicion: 'A1' },
          { naviera: 'HAPAG', tipo: '20', posicion: 'A2B' },
          { naviera: 'ONE', tipo: '40bajo', posicion: 'E3' },
        ];
        demo.forEach((r) => addItem(r));
      }

      setLoading(false);
    })();

    // 8) animație
    const animate = () => {
      // pulse pentru programados
      group.children.forEach((m) => {
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

    // 9) Resize
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 10) Cleanup
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.());
          else obj.material.dispose?.();
        }
      });
    };
  }, []);

  return (
    <div className={styles.fullscreenRoot}>
      {/* butoane flotante */}
      <div className={styles.topBar}>
        <button className={styles.iconBtn} onClick={() => navigate('/depot')}>✕</button>
        {/* deocamdată + te duce la Depot unde ai modalul Add */}
        <button className={styles.iconBtn} onClick={() => navigate('/depot')}>＋</button>
      </div>

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
    </div>
  );
}