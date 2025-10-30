// src/components/threeWorld/createContainersLayerOptimized.js
import * as THREE from 'three';
import { slotToWorld } from './slotToWorld';

/* ===== Dimensiuni containere ===== */
const SIZE_BY_TIPO = {
  '20':        { L: 6.06,  H: 2.59, W: 2.44 },
  '20opentop': { L: 6.06,  H: 2.59, W: 2.44 },
  '40alto':    { L: 12.19, H: 2.89, W: 2.44 },
  '40bajo':    { L: 12.19, H: 2.59, W: 2.44 },
  '40opentop': { L: 12.19, H: 2.59, W: 2.44 },
  '45':        { L: 13.72, H: 2.89, W: 2.44 },
};

/* ===== Texturi ===== */
const TEXROOT = '/textures/contenedores';
const loader = new THREE.TextureLoader();
const tcache = new Map();

function loadTex(path) {
  if (tcache.has(path)) return tcache.get(path);
  const t = loader.load(path);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  tcache.set(path, t);
  return t;
}

function brandTex(brand, which) {
  const dir = `${TEXROOT}/${brand}`;
  const candidates = [
    `${dir}/${brand}_40_${which}_texture.png`,
    `${dir}/${brand}_40_${which}.png`,
    `${dir}/${brand}_40_${which}_texture.jpg`,
    `${dir}/${brand}_40_${which}.jpg`,
  ];
  for (const p of candidates) {
    try { return loadTex(p); } catch {}
  }
  return new THREE.Texture(); // fallback gol
}

function normBrand(name = '') {
  const s = name.toLowerCase();
  if (s.includes('maersk') || s === 'msk') return 'maersk';
  if (s.includes('evergreen')) return 'evergreen';
  if (s.includes('hapag') || s.includes('hlag')) return 'hapag';
  if (s.includes('messina')) return 'messina';
  if (s.includes('one')) return 'one';
  if (s.includes('arkas') || s.includes('arcas')) return 'arkas';
  if (s.includes('msc')) return 'msc';
  if (s.includes('roto') || s.includes('rotoș') || s.includes('rotos')) return 'roto';
  return 'neutru';
}

/**
 * Array materiale pentru BoxGeometry:
 * Ordine Three.js: [right(+X), left(-X), top(+Y), bottom(-Y), front(+Z), back(-Z)]
 * orient: 'X' (lungime pe X) / 'Z' (lungime pe Z)
 * facing: '+X' | '-X' | '+Z' | '-Z' – unde sunt ușile (front).
 */
function makeMaterials({ brand, sizeMetersL, orient, facing }) {
  const side  = brandTex(brand, 'side');
  const top   = brandTex(brand, 'top');
  const front = brandTex(brand, 'front');
  const back  = brandTex(brand, 'back');

  const repeatL = Math.max(0.25, sizeMetersL / 12.19);
  side.repeat.set(repeatL, 1);
  top.repeat.set(repeatL, 1);

  const mSide   = new THREE.MeshStandardMaterial({ map: side,  metalness: 0.1, roughness: 0.8 });
  const mTop    = new THREE.MeshStandardMaterial({ map: top,   metalness: 0.1, roughness: 0.85 });
  const mBottom = new THREE.MeshStandardMaterial({ color: 0x8a8f95, metalness: 0.1, roughness: 0.9 });
  const mFront  = new THREE.MeshStandardMaterial({ map: front, metalness: 0.1, roughness: 0.8 });
  const mBack   = new THREE.MeshStandardMaterial({ map: back,  metalness: 0.1, roughness: 0.8 });

  if (orient === 'X') {
    // laterale ±Z; capete (uși) ±X
    return (facing === '+X')
      ? [mFront, mBack, mTop, mBottom, mSide, mSide]
      : [mBack, mFront, mTop, mBottom, mSide, mSide];
  } else {
    // orient === 'Z' → laterale ±X; capete ±Z
    return (facing === '+Z')
      ? [mSide, mSide, mTop, mBottom, mFront, mBack]
      : [mSide, mSide, mTop, mBottom, mBack, mFront];
  }
}

/* ===== Layer ===== */
export default function createContainersLayerOptimized(data, layout) {
  const layer = new THREE.Group();
  const all = data?.containers || [];
  if (!all.length) return layer;

  const groups = new Map();

  function parsePos(p) {
    const s = String(p || '').trim().toUpperCase();
    const m = s.match(/^([A-F])(\d{1,2})([A-Z])?$/);
    if (!m) return null;
    return { band: m[1], index: Number(m[2]), level: m[3] || 'A' };
  }

  // ——— AICI e schimbarea importantă: orient/facing în funcție de bandă, nu de rot —
  const orientFromLane = (lane) => ('ABC'.includes(lane) ? 'Z' : 'X');
  const facingFromLane = (lane, rotY) => {
    // păstrăm sensul ușilor dar pe axa potrivită
    if ('ABC'.includes(lane)) {
      // ABC: front/back pe ±Z
      return Math.sin(rotY) >= 0 ? '+Z' : '-Z';
    } else {
      // DEF: front/back pe ±X — EXACT cerința ta
      return Math.cos(rotY) >= 0 ? '+X' : '-X';
    }
  };

  // bucketize după tip, brand, orient, facing
  all.forEach(rec => {
    const parsed = parsePos(rec.pos ?? rec.posicion);
    if (!parsed) return;

    const tipo = (rec.tipo || '40bajo').toLowerCase();
    const dims = SIZE_BY_TIPO[tipo] || SIZE_BY_TIPO['40bajo'];

    const wp = slotToWorld(
      { lane: parsed.band, index: parsed.index, tier: parsed.level },
      { ...layout, abcNumbersReversed: true }
    );

    const rot = wp.rotationY || 0;

    const orient = orientFromLane(parsed.band);           // <-- forțăm după bandă
    const facing = facingFromLane(parsed.band, rot);      // <-- front/back pe axa corectă

    const brand = normBrand(rec.naviera || '');
    const isProgramado = rec.__source === 'programados';

    const key = `${tipo}|${brand}|${orient}|${facing}|${isProgramado ? 1 : 0}`;
    if (!groups.has(key)) {
      groups.set(key, { tipo, brand, orient, facing, isProgramado, dims, items: [] });
    }
    groups.get(key).items.push({ parsed, rot });
  });

  groups.forEach(g => {
    const count = g.items.length;
    if (!count) return;

    const geom = new THREE.BoxGeometry(g.dims.L, g.dims.H, g.dims.W);
    const mats = makeMaterials({
      brand: g.brand,
      sizeMetersL: g.dims.L,
      orient: g.orient,
      facing: g.facing,
    });

    const mesh = new THREE.InstancedMesh(geom, mats, count);
    mesh.castShadow = mesh.receiveShadow = true;

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3(1,1,1);

    g.items.forEach((it, i) => {
      const wp = slotToWorld(
        { lane: it.parsed.band, index: it.parsed.index, tier: it.parsed.level },
        { ...layout, abcNumbersReversed: true }
      );
      pos.copy(wp.position);
      // rotim corpul ca să aliniem lungimea cu axa potrivită
      const rotY = ('ABC'.includes(it.parsed.band)) ? Math.PI / 2 : 0;
      quat.setFromAxisAngle(new THREE.Vector3(0,1,0), rotY);
      matrix.compose(pos, quat, scl);
      mesh.setMatrixAt(i, matrix);
    });

    if (g.isProgramado) {
      mesh.userData.isProgramado = true;
      mesh.userData.pulsePhases = new Float32Array(count);
      for (let i = 0; i < count; i++) mesh.userData.pulsePhases[i] = Math.random() * Math.PI * 2;
    }

    layer.add(mesh);
  });

  // anim puls pentru programados
  layer.userData.tick = () => {
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();

    layer.children.forEach(mesh => {
      if (!mesh.userData.isProgramado) return;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, m); m.decompose(p,q,s);
        mesh.userData.pulsePhases[i] += 0.04;
        const k = 1 + Math.sin(mesh.userData.pulsePhases[i]) * 0.05;
        s.set(1, k, 1); m.compose(p,q,s); mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
  };

  return layer;
}