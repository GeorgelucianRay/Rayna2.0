import * as THREE from 'three';
import { slotToWorld } from './slotToWorld';

/* ------------ CULORI NAVIERA ------------ */
const NAVIERA_COLORS = {
  MAERSK: 0xbfc7cf, MSK: 0xbfc7cf,
  HAPAG: 0xf97316, MESSINA: 0xf97316,
  ONE: 0xec4899, EVERGREEN: 0x22c55e,
  ARKAS: 0x2563eb, MSC: 0xfacc15,
  OTROS: 0x8b5e3c
};

/* ------------ DIMENSIUNI CONTAINERE ------------ */
const SIZE_BY_TIPO = {
  '20':        { L: 6.06,  H: 2.59, W: 2.44 },
  '20opentop': { L: 6.06,  H: 2.59, W: 2.44 },
  '40alto':    { L: 12.19, H: 2.89, W: 2.44 },
  '40bajo':    { L: 12.19, H: 2.59, W: 2.44 },
  '40opentop': { L: 12.19, H: 2.59, W: 2.44 },
  '45':        { L: 13.72, H: 2.89, W: 2.44 },
};

/* ------------ TEXTURI ------------ */
const TEXROOT = '/textures/contenedores';
const loader = new THREE.TextureLoader();
const tcache = new Map();

function tex(path) {
  if (tcache.has(path)) return tcache.get(path);
  const t = loader.load(path);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  tcache.set(path, t);
  return t;
}

function normBrand(name='') {
  const s = name.toLowerCase();
  if (s.includes('maersk') || s.includes('msk')) return 'maersk';
  if (s.includes('hapag')) return 'hapag';
  if (s.includes('messina')) return 'messina';
  if (s.includes('one')) return 'one';
  if (s.includes('evergreen')) return 'evergreen';
  if (s.includes('arkas')) return 'arkas';
  if (s.includes('msc')) return 'msc';
  return 'generic';
}

/**
 * Creează array-ul de 6 materiale pentru un container.
 * Ordinea: [right, left, top, bottom, front, back]
 */
function makeMaterials({ brand, sizeMetersL, orient, colorHex }) {
  const matPlain = new THREE.MeshStandardMaterial({
    color: colorHex, metalness: 0.1, roughness: 0.7
  });

  if (brand === 'generic') {
    return [matPlain, matPlain, matPlain, matPlain, matPlain, matPlain];
  }

  const dir = `${TEXROOT}/${brand}`;
  const side  = tex(`${dir}/${brand}_40_side_texture.png`);
  const front = tex(`${dir}/${brand}_40_front_texture.png`);
  const back  = tex(`${dir}/${brand}_40_back_texture.png`);
  const top   = tex(`${dir}/${brand}_40_top_texture.png`);

  const repeatX = Math.max(0.25, sizeMetersL / 12.19);
  side.repeat.set(repeatX, 1);
  top.repeat.set(repeatX, 1);

  const mSide  = new THREE.MeshStandardMaterial({ map: side,  metalness: 0.1, roughness: 0.8 });
  const mTop   = new THREE.MeshStandardMaterial({ map: top,   metalness: 0.1, roughness: 0.85 });
  const mBottom= new THREE.MeshStandardMaterial({ color: 0x8a8f95, metalness: 0.1, roughness: 0.9 });
  const mFront = new THREE.MeshStandardMaterial({ map: front, metalness: 0.1, roughness: 0.8 });
  const mBack  = new THREE.MeshStandardMaterial({ map: back,  metalness: 0.1, roughness: 0.8 });

  if (orient === 'X') {
    return [mFront, mBack, mTop, mBottom, mSide, mSide];
  } else {
    return [mSide, mSide, mTop, mBottom, mFront, mBack];
  }
}

/* ------------ LAYER PRINCIPAL ------------ */
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

  all.forEach(rec => {
    const parsed = parsePos(rec.pos ?? rec.posicion);
    if (!parsed) return;

    const tipo = (rec.tipo || '40bajo').toLowerCase();
    const dims = SIZE_BY_TIPO[tipo] || SIZE_BY_TIPO['40bajo'];
    const wp = slotToWorld({ lane: parsed.band, index: parsed.index, tier: parsed.level }, { ...layout, abcNumbersReversed: true });

    const rot = wp.rotationY || 0;
    const orient = (Math.round((rot / (Math.PI / 2)) % 2) % 2 === 0) ? 'X' : 'Z';
    const isProgramado = rec.__source === 'programados';
    const navRaw = (rec.naviera || '').trim().toUpperCase();
    const brand = normBrand(navRaw);

    const baseColor = NAVIERA_COLORS[navRaw] ?? NAVIERA_COLORS.OTROS;
    const colorHex = isProgramado
      ? new THREE.Color(baseColor).offsetHSL(0, 0, 0.10).getHex()
      : baseColor;

    const key = `${tipo}|${brand}|${orient}|${isProgramado}`;
    if (!groups.has(key)) {
      groups.set(key, { tipo, brand, orient, isProgramado, colorHex, dims, items: [] });
    }
    groups.get(key).items.push({ parsed, record: rec, rot });
  });

  groups.forEach(g => {
    const count = g.items.length;
    if (!count) return;

    const geom = new THREE.BoxGeometry(g.dims.L, g.dims.H, g.dims.W);
    const mats = makeMaterials({
      brand: g.brand,
      sizeMetersL: g.dims.L,
      orient: g.orient,
      colorHex: g.colorHex
    });

    const mesh = new THREE.InstancedMesh(geom, mats, count);
    mesh.castShadow = mesh.receiveShadow = true;

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3(1, 1, 1);
    const records = new Array(count);

    g.items.forEach((it, i) => {
      const wp = slotToWorld(
        { lane: it.parsed.band, index: it.parsed.index, tier: it.parsed.level },
        { ...layout, abcNumbersReversed: true }
      );
      pos.copy(wp.position);
      quat.setFromAxisAngle(new THREE.Vector3(0,1,0), wp.rotationY);
      matrix.compose(pos, quat, scl);
      mesh.setMatrixAt(i, matrix);
      records[i] = it.record;
    });

    mesh.userData.records = records;
    if (g.isProgramado) {
      mesh.userData.isProgramado = true;
      mesh.userData.pulsePhases = new Float32Array(count);
      for (let i = 0; i < count; i++) mesh.userData.pulsePhases[i] = Math.random() * Math.PI * 2;
    }

    layer.add(mesh);
  });

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