// src/components/threeWorld/createContainersLayerOptimized.js
import * as THREE from 'three';
import { slotToWorld } from './slotToWorld';

/* ===== Dimensiuni containere ===== */
const SIZE_BY_TIPO = {
  '20':        { L: 6.06,  H: 2.59, W: 2.44, texLenCode: '20' },
  '20opentop': { L: 6.06,  H: 2.59, W: 2.44, texLenCode: '20' },
  '40alto':    { L: 12.19, H: 2.89, W: 2.44, texLenCode: '40' },
  '40bajo':    { L: 12.19, H: 2.59, W: 2.44, texLenCode: '40' },
  '40opentop': { L: 12.19, H: 2.59, W: 2.44, texLenCode: '40' },
  '45':        { L: 13.72, H: 2.89, W: 2.44, texLenCode: '45' },
};

/* ===== Texturi ===== */
const TEXROOT = '/textures/contenedores';
const loader  = new THREE.TextureLoader();
const tcache  = new Map();

function loadTex(path) {
  if (tcache.has(path)) return tcache.get(path);
  const t = loader.load(path);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  tcache.set(path, t);
  return t;
}

/** 
 * Caută texturi cu prioritate pentru lungimea corectă (20/40/45), 
 * apoi fallback pe “40” sau fără sufix.
 */
function brandTex(brand, which, lenCode) {
  const dir = `${TEXROOT}/${brand}`;
  const candidates = [];

  // 1) exact pe lungime (dacă ai fișiere separate pentru 20/40/45)
  if (lenCode) {
    candidates.push(
      `${dir}/${brand}_${lenCode}_${which}_texture.png`,
      `${dir}/${brand}_${lenCode}_${which}.png`,
      `${dir}/${brand}_${lenCode}_${which}_texture.jpg`,
      `${dir}/${brand}_${lenCode}_${which}.jpg`,
    );
  }
  // 2) fallback pe “40”
  candidates.push(
    `${dir}/${brand}_40_${which}_texture.png`,
    `${dir}/${brand}_40_${which}.png`,
    `${dir}/${brand}_40_${which}_texture.jpg`,
    `${dir}/${brand}_40_${which}.jpg`,
  );
  // 3) fallback generic
  candidates.push(
    `${dir}/${brand}_${which}.png`,
    `${dir}/${brand}_${which}.jpg`,
  );

  for (const p of candidates) {
    try { return loadTex(p); } catch {}
  }
  return new THREE.Texture(); // fallback gol (evită crash)
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
  if (s.includes('roto')) return 'roto';
  return 'neutru';
}

/* ===== Utilitare lane ===== */
const laneGroupOf = (lane) => ('ABC'.includes(lane) ? 'ABC' : 'DEF');

/** 
 * Pentru materiale:
 * - ABC → capete (front/back) pe ±Z (ușile pe Z)
 * - DEF → capete (front/back) pe ±X (ușile pe X)
 * Facing-ul îl deducem din semnul rotației ca să păstrăm sensul ușilor.
 */
const orientForGroup = (grp) => (grp === 'ABC' ? 'Z' : 'X');
function facingFor(grp, rotY) {
  if (grp === 'ABC') return Math.sin(rotY) >= 0 ? '+Z' : '-Z';
  return Math.cos(rotY) >= 0 ? '+X' : '-X';
}

/* ===== Materiale cu cache (ca să nu recreăm la fiecare instanță) ===== */
const matCache = new Map();
/**
 * Ordine Three.js: [right +X, left -X, top +Y, bottom -Y, front +Z, back -Z]
 * orient: 'X' → uși pe ±X; 'Z' → uși pe ±Z
 */
function getMaterials({ brand, lenCode, sizeMetersL, orient, facing }) {
  const key = `${brand}|${lenCode}|${orient}|${facing}`;
  if (matCache.has(key)) return matCache.get(key);

  // aleg texturile potrivite pentru brand și lungime
  const side0  = brandTex(brand, 'side',  lenCode);
  const top0   = brandTex(brand, 'top',   lenCode);
  const front  = brandTex(brand, 'front', lenCode);
  const back   = brandTex(brand, 'back',  lenCode);

  // clonăm pentru a seta rotații/repetări independent
  const side = side0.clone(); side.needsUpdate = true; side.center.set(0.5, 0.5);
  const top  = top0.clone();  top.needsUpdate  = true; top.center.set(0.5, 0.5);

  // factor corect de “alungire” pe lungime (nu mai tăiem 20ft)
  const baseL = (lenCode === '20') ? 6.06 : (lenCode === '45' ? 13.72 : 12.19);
  const repeatL = Math.max(0.25, (sizeMetersL || baseL) / baseL);
  side.repeat.set(repeatL, 1);
  top.repeat.set(repeatL, 1);

  // dacă lungimea curge pe Z (ABC), rotim 90° textura laterală și topul
  if (orient === 'Z') {
    side.rotation = Math.PI / 2;
    top.rotation  = Math.PI / 2;
  } else {
    side.rotation = 0;
    top.rotation  = 0;
  }

  const mSide   = new THREE.MeshStandardMaterial({ map: side,  metalness: 0.1, roughness: 0.8 });
  const mTop    = new THREE.MeshStandardMaterial({ map: top,   metalness: 0.1, roughness: 0.85 });
  const mBottom = new THREE.MeshStandardMaterial({ color: 0x8a8f95, metalness: 0.1, roughness: 0.9 });
  const mFront  = new THREE.MeshStandardMaterial({ map: front, metalness: 0.1, roughness: 0.8 });
  const mBack   = new THREE.MeshStandardMaterial({ map: back,  metalness: 0.1, roughness: 0.8 });

  let mats;
  if (orient === 'X') {
    mats = (facing === '+X')
      ? [mFront, mBack, mTop, mBottom, mSide, mSide]
      : [mBack, mFront, mTop, mBottom, mSide, mSide];
  } else {
    mats = (facing === '+Z')
      ? [mSide, mSide, mTop, mBottom, mFront, mBack]
      : [mSide, mSide, mTop, mBottom, mBack, mFront];
  }

  matCache.set(key, mats);
  return mats;
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

  // 1) Grupăm după (tipo, brand, laneGroup ABC/DEF, facing semn, programado)
  all.forEach(rec => {
    const parsed = parsePos(rec.pos ?? rec.posicion);
    if (!parsed) return;

    const tipo = (rec.tipo || '40bajo').toLowerCase();
    const dims = SIZE_BY_TIPO[tipo] || SIZE_BY_TIPO['40bajo'];
    const brand = normBrand(rec.naviera || '');
    const isProgramado = rec.__source === 'programados';

    const wp  = slotToWorld(
      { lane: parsed.band, index: parsed.index, tier: parsed.level },
      { ...layout, abcNumbersReversed: true }
    );
    const rot = wp.rotationY || 0;

    const grp    = laneGroupOf(parsed.band);        // 'ABC' | 'DEF'
    const orient = orientForGroup(grp);             // 'Z'   | 'X'
    const facing = facingFor(grp, rot);             // direcția ușilor în funcție de rot
    const lenCode = dims.texLenCode;                // '20' | '40' | '45'

    const key = `${tipo}|${brand}|${grp}|${facing}|${isProgramado ? 1 : 0}`;
    if (!groups.has(key)) {
      groups.set(key, { tipo, brand, grp, orient, facing, lenCode, dims, isProgramado, items: [] });
    }
    groups.get(key).items.push({ parsed, rot });
  });

  // 2) Pentru fiecare grup construim un InstancedMesh
  groups.forEach(g => {
    const count = g.items.length; if (!count) return;

    const geom = new THREE.BoxGeometry(g.dims.L, g.dims.H, g.dims.W);
    const mats = getMaterials({
      brand: g.brand,
      lenCode: g.lenCode,
      sizeMetersL: g.dims.L,
      orient: g.orient,
      facing: g.facing,
    });

    const mesh = new THREE.InstancedMesh(geom, mats, count);
    mesh.castShadow = mesh.receiveShadow = true;

    const M = new THREE.Matrix4();
    const P = new THREE.Vector3();
    const Q = new THREE.Quaternion();
    const S = new THREE.Vector3(1,1,1);

    g.items.forEach((it, i) => {
      const wp = slotToWorld(
        { lane: it.parsed.band, index: it.parsed.index, tier: it.parsed.level },
        { ...layout, abcNumbersReversed: true }
      );
      // PĂSTRĂM exact poziția și rotația din layout (nu stricăm “așezarea”)
      P.copy(wp.position);
      Q.setFromAxisAngle(new THREE.Vector3(0,1,0), wp.rotationY || 0);
      M.compose(P, Q, S);
      mesh.setMatrixAt(i, M);
    });

    if (g.isProgramado) {
      mesh.userData.isProgramado = true;
      mesh.userData.pulsePhases = new Float32Array(count);
      for (let i = 0; i < count; i++) mesh.userData.pulsePhases[i] = Math.random() * Math.PI * 2;
    }

    layer.add(mesh);
  });

  // 3) Anim puls pentru “programados”
  layer.userData.tick = () => {
    const m = new THREE.Matrix4(), p = new THREE.Vector3(),
          q = new THREE.Quaternion(), s = new THREE.Vector3();
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