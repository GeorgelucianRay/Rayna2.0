// src/components/threeWorld/createContainersDEF.js
// DEF: lungime pe Z, capace (uși) pe ±X, iar LATERALELE (±Z) sunt rotite 90°.

import * as THREE from 'three';
import { slotToWorld } from './slotToWorld';

/* Dimensiuni containere */
const SIZE_BY_TIPO = {
  '20':        { L: 6.06,  H: 2.59, W: 2.44 },
  '20opentop': { L: 6.06,  H: 2.59, W: 2.44 },
  '40alto':    { L: 12.19, H: 2.89, W: 2.44 },
  '40bajo':    { L: 12.19, H: 2.59, W: 2.44 },
  '40opentop': { L: 12.19, H: 2.59, W: 2.44 },
  '45':        { L: 13.72, H: 2.89, W: 2.44 },
};

/* Loader texturi */
const TEXROOT = '/textures/contenedores';
const loader = new THREE.TextureLoader();
const tcache = new Map();

function loadTex(path) {
  if (tcache.has(path)) return tcache.get(path);
  const t = loader.load(path);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
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
  return null; // fallback: fără hartă → material color
}

function normBrand(name='') {
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

/**
 * Materiale pentru DEF:
 * - FRONT/BACK pe ±X (capace/usi)
 * - LATERALE pe ±Z (și sunt ROTITE 90°), fără flip sau offset.
 * - TOP/BOTTOM standard
 */
function makeMaterialsCapsOnX_ZLength(brand) {
  const sideT  = brandTex(brand,'side');
  const topT   = brandTex(brand,'top');
  const frontT = brandTex(brand,'front');
  const backT  = brandTex(brand,'back');

  // Laterale pe ±Z — rotim 90° (numai atât).
  const sideZp = sideT?.clone() ?? null; // fața +Z
  const sideZn = sideT?.clone() ?? null; // fața -Z
  [sideZp, sideZn].forEach((tx) => {
    if (!tx) return;
    tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping;
    tx.center.set(0.5, 0.5);
    tx.rotation = Math.PI / 2;   // 90° spre uși
    tx.repeat.set(1, 1);         // fără întindere/flip/offest
  });

  // Top (fără rotire aici; lasă-l standard)
  const top = topT?.clone() ?? null;
  if (top) {
    top.wrapS = top.wrapT = THREE.ClampToEdgeWrapping;
    top.repeat.set(1, 1);
  }

  // Capace (±X)
  const front = frontT?.clone() ?? null;
  const back  = backT?.clone()  ?? null;
  if (front) { front.wrapS = front.wrapT = THREE.ClampToEdgeWrapping; }
  if (back)  { back.wrapS  = back.wrapT  = THREE.ClampToEdgeWrapping; }

  const mSideZp = new THREE.MeshStandardMaterial({
    color: sideZp ? 0xffffff : 0x9aa0a6, map: sideZp, roughness: 0.8, metalness: 0.1
  });
  const mSideZn = new THREE.MeshStandardMaterial({
    color: sideZn ? 0xffffff : 0x9aa0a6, map: sideZn, roughness: 0.8, metalness: 0.1
  });
  const mTop    = new THREE.MeshStandardMaterial({
    color: top ? 0xffffff : 0x8a8f95, map: top, roughness: 0.85, metalness: 0.1
  });
  const mBottom = new THREE.MeshStandardMaterial({ color: 0x8a8f95, roughness: 0.9, metalness: 0.1 });
  const mFront  = new THREE.MeshStandardMaterial({
    color: front ? 0xffffff : 0xcccccc, map: front, roughness: 0.8, metalness: 0.1
  });
  const mBack   = new THREE.MeshStandardMaterial({
    color: back ? 0xffffff : 0xcccccc, map: back, roughness: 0.8, metalness: 0.1
  });

  // BoxGeometry face order: [right(+X), left(-X), top(+Y), bottom(-Y), front(+Z), back(-Z)]
  // right/left = capace (±X), front/back = laterale (±Z).
  return [mFront, mBack, mTop, mBottom, mSideZp, mSideZn];
}

/* Parsare poziții DEF */
function parsePosDEF(p) {
  const s = String(p || '').trim().toUpperCase();
  const m = s.match(/^([D-F])(\d{1,2})([A-Z])?$/);
  return m ? { band: m[1], index: +m[2], level: m[3] || 'A' } : null;
}

/* Layer DEF */
export default function createContainersDEF(data, layout) {
  const layer = new THREE.Group();
  const list = (data?.containers || [])
    .map(r => ({ rec: r, pos: parsePosDEF(r.pos ?? r.posicion) }))
    .filter(x => x.pos);
  if (!list.length) return layer;

  // grupăm după (tipo, brand)
  const groups = new Map();
  for (const { rec, pos } of list) {
    const tipo  = (rec.tipo || '40bajo').toLowerCase();
    const dims  = SIZE_BY_TIPO[tipo] || SIZE_BY_TIPO['40bajo'];
    const brand = normBrand(rec.naviera || '');
    const key = `${tipo}|${brand}`;
    if (!groups.has(key)) groups.set(key, { dims, brand, items: [] });
    groups.get(key).items.push(pos);
  }

  groups.forEach(g => {
    // Geometria default are L pe X; o rotim 90° ca să punem lungimea pe Z în scenă.
    const geom = new THREE.BoxGeometry(g.dims.L, g.dims.H, g.dims.W);
    const mats = makeMaterialsCapsOnX_ZLength(g.brand);
    const mesh = new THREE.InstancedMesh(geom, mats, g.items.length);
    mesh.castShadow = mesh.receiveShadow = true;

    const M = new THREE.Matrix4();
    const P = new THREE.Vector3();
    const Q = new THREE.Quaternion();
    const S = new THREE.Vector3(1, 1, 1);

    g.items.forEach((slot, i) => {
      const wp = slotToWorld(
        { lane: slot.band, index: slot.index, tier: slot.level },
        { ...layout, abcNumbersReversed: true }
      );

      // Poziție din slotToWorld; rotim 90° în jurul Y pentru lungime pe Z,
      // ușile rămân pe ±X conform cerinței.
      P.copy(wp.position);
      Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
      M.compose(P, Q, S);
      mesh.setMatrixAt(i, M);
    });

    layer.add(mesh);
  });

  layer.userData.solid = true;
  return layer;
}