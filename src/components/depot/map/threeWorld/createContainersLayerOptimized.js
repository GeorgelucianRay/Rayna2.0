// src/components/threeWorld/createContainersLayerOptimized.js
import * as THREE from 'three';
import { slotToWorld } from './slotToWorld';

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

// naviera -> folder texturi
function brandFolder(navRaw = '', isRoto = false) {
  if (isRoto) return 'roto';
  const s = String(navRaw).toLowerCase();
  if (s.includes('msk') || s.includes('maersk'))   return 'maersk';
  if (s.includes('hapag'))                         return 'hapag';
  if (s.includes('evergreen'))                     return 'evergreen';
  if (s.includes('arkas'))                         return 'arkas';
  if (s.includes('messina'))                       return 'messina';
  if (s.includes('msc'))                           return 'msc';
  if (s.includes('one'))                           return 'one';
  return 'neutru';
}

/**
 * Materiale pentru box în funcție de brand și orientare.
 * Ordinea fețelor BoxGeometry: [right, left, top, bottom, front(+Z), back(-Z)]
 * orient = 'X' => lungimea e pe axa X (capetele sunt ±X)
 * orient = 'Z' => lungimea e pe axa Z (capetele sunt ±Z)
 */
function makeMaterials({ folder, sizeMetersL, orient }) {
  const dir = `${TEXROOT}/${folder}`;

  const side  = tex(`${dir}/${folder}_40_side_texture.png`);
  const front = tex(`${dir}/${folder}_40_front_texture.png`);
  const back  = tex(`${dir}/${folder}_40_back_texture.png`);
  const top   = tex(`${dir}/${folder}_40_top_texture.png`);

  // scale pe lungime ca să reutilizăm setul “40”
  const repeatX = Math.max(0.25, sizeMetersL / 12.19);
  side.repeat.set(repeatX, 1);
  top.repeat.set(repeatX, 1);

  const mSide   = new THREE.MeshStandardMaterial({ map: side,  metalness: 0.1, roughness: 0.8 });
  const mTop    = new THREE.MeshStandardMaterial({ map: top,   metalness: 0.1, roughness: 0.85 });
  const mBottom = new THREE.MeshStandardMaterial({ color: 0x808588, metalness: 0.05, roughness: 0.95 });
  const mFront  = new THREE.MeshStandardMaterial({ map: front, metalness: 0.1, roughness: 0.8 });
  const mBack   = new THREE.MeshStandardMaterial({ map: back,  metalness: 0.1, roughness: 0.8 });

  if (orient === 'X') {
    // right(+X)=front(doors), left(-X)=back, front(+Z)=side, back(-Z)=side
    return [mFront, mBack, mTop, mBottom, mSide, mSide];
  } else {
    // right(+X)=side, left(-X)=side, front(+Z)=front(doors), back(-Z)=back
    return [mSide, mSide, mTop, mBottom, mFront, mBack];
  }
}

/* ------------ STRATUL DE CONTAINERE ------------ */
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

    const wp = slotToWorld(
      { lane: parsed.band, index: parsed.index, tier: parsed.level },
      { ...layout, abcNumbersReversed: true }
    );

    const rot = wp.rotationY || 0;
    const orient = (Math.round((rot / (Math.PI / 2)) % 2) % 2 === 0) ? 'X' : 'Z';

    const isRoto = rec.__source === 'rotos';
    const folder = brandFolder(rec.naviera, isRoto);

    const key = `${tipo}|${folder}|${orient}`;
    if (!groups.has(key)) {
      groups.set(key, { tipo, folder, orient, dims, items: [] });
    }
    groups.get(key).items.push({ parsed, record: rec, rot });
  });

  groups.forEach(g => {
    const count = g.items.length;
    if (!count) return;

    const geom = new THREE.BoxGeometry(g.dims.L, g.dims.H, g.dims.W);
    const mats = makeMaterials({
      folder: g.folder,
      sizeMetersL: g.dims.L,
      orient: g.orient
    });

    const mesh = new THREE.InstancedMesh(geom, mats, count);
    mesh.castShadow = mesh.receiveShadow = true;

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3(1,1,1);

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
    layer.add(mesh);
  });

  return layer;
}