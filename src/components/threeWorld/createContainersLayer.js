// src/components/threeWorld/createContainersLayer.js
import * as THREE from 'three';

/* — culori naviera — */
const NAVIERA_COLORS = {
  MAERSK: 0xbfc7cf, MSK: 0xbfc7cf,
  HAPAG: 0xf97316,  MESSINA: 0xf97316,
  ONE: 0xec4899,
  EVERGREEN: 0x22c55e,
  ARCAS: 0x2563eb,
  OTROS: 0x8b5e3c
};

/* — dimensiuni containere — (metri, aprox) */
const SIZE_BY_TIPO = {
  '20':        { L: 6.06,  H: 2.59, W: 2.44 },
  '20opentop': { L: 6.06,  H: 2.59, W: 2.44 },
  '40alto':    { L:12.19,  H: 2.89, W: 2.44 },
  '40bajo':    { L:12.19,  H: 2.59, W: 2.44 },
  '40opentop': { L:12.19,  H: 2.59, W: 2.44 },
  '45':        { L:13.72,  H: 2.89, W: 2.44 },
};

/* — aceleași constante ca în createGround — */
const SLOT_LEN = 6.06;
const SLOT_W   = 2.44;
const SLOT_GAP = 0.06;
const STEP     = SLOT_LEN + SLOT_GAP; // 6.12 m

/* — utilitare — */
function pickColor(naviera = '', roto = false, programado = false) {
  if (roto) return 0xef4444;
  const key = (naviera || '').trim().toUpperCase();
  const base = NAVIERA_COLORS[key] ?? NAVIERA_COLORS.OTROS;
  if (!programado) return base;
  const c = new THREE.Color(base);
  c.offsetHSL(0, 0, 0.10);
  return c.getHex();
}

// Acceptă "pos" sau "posicion" de forma A1, A10B, D3 etc.
function parsePos(any) {
  // Normalizăm: uppercase + scoatem spații / cratime / puncte / underscore
  const s = String(any || '')
    .toUpperCase()
    .replace(/[\s\-_\.]/g, '');

  // Acceptăm A1, A10B, D3, D03 etc.
  const m = s.match(/^([A-F])0?(\d{1,2})([A-Z])?$/);
  if (!m) return null;

  const band = m[1];                 // A..F
  const index = Number(m[2]);        // 1..10 (ABC) / 1..7 (DEF)
  const levelLetter = m[3] || 'A';   // A=sol, B=etaj 2, ...
  const level = levelLetter.charCodeAt(0) - 64;
  return { band, index, level };
}

function zForABCRow(row) {
  const ABC_BASE_Z = -4.0;
  if (row === 'A') return ABC_BASE_Z;
  if (row === 'B') return ABC_BASE_Z - (SLOT_W + 0.10);
  if (row === 'C') return ABC_BASE_Z - 2 * (SLOT_W + 0.10);
  return ABC_BASE_Z;
}

/** Convertim poziția logică (A1B etc.) în coordonate lumii, folosind layoutul din MapPage:
 *  layout = { abcOffsetX, defOffsetX, abcToDefGap }
 */
function computeWorldFromParsed(parsed, layout, dims) {
  const { band, index, level } = parsed;
  const abcOffsetX  = Number(layout?.abcOffsetX  ?? 0);
  const defOffsetX  = Number(layout?.defOffsetX  ?? 0);
  const abcToDefGap = Number(layout?.abcToDefGap ?? 16);

  // Y (stack pe înălțime, A=1 jos)
  const y = (dims.H / 2) + dims.H * (level - 1);

  // ABC: orizontal pe X, numerotare inversă (1 la capătul din dreapta → x mare)
  if (band === 'A' || band === 'B' || band === 'C') {
    const z = zForABCRow(band);
    const x = abcOffsetX - (index - 0.5) * STEP; // identic cu marcajul
    const rotY = 0; // lungimea cutiei e pe X deja
    return { x, y, z, rotY };
  }

  // DEF: vertical pe Z, x fix pe D/E/F, z crește 1..7; containerul se rotește 90° ca lungimea să fie pe Z
  const DEF_BASE_X = +4.0 + defOffsetX;
  const DEF_COL_X = {
    D: DEF_BASE_X,
    E: DEF_BASE_X + (SLOT_W + 0.10),
    F: DEF_BASE_X + 2 * (SLOT_W + 0.10),
  };
  const START_Z_DEF = zForABCRow('C') + abcToDefGap;
  const x = DEF_COL_X[band] ?? DEF_COL_X.D;
  const z = START_Z_DEF + (index - 0.5) * STEP;
  const rotY = Math.PI / 2; // 90° ca lungimea (L) să fie pe Z
  return { x, y, z, rotY };
}

/**
 * data = { enDeposito:[], programados:[], rotos:[] }
 * layout = { abcOffsetX, defOffsetX, abcToDefGap }
 */
export default function createContainersLayer(data, layout) {
  const layer = new THREE.Group();
  const enDeposito = data?.enDeposito || [];
  const programados = data?.programados || [];
  const rotos = data?.rotos || [];

  const makeBox = (tipo, colorHex) => {
    const dims = SIZE_BY_TIPO[(tipo || '').toLowerCase()] || SIZE_BY_TIPO['40bajo'];
    const geo = new THREE.BoxGeometry(dims.L, dims.H, dims.W); // L pe X, H pe Y, W pe Z
    const mat = new THREE.MeshStandardMaterial({ color: colorHex });
    const m = new THREE.Mesh(geo, mat);
    m.userData.__dims = dims;
    return m;
  };

  function addRecord(rec, opt = {}) {
    // folosim pos sau posicion
    const parsed = parsePos(rec.pos ?? rec.posicion);
    if (!parsed) return;

    const dims = SIZE_BY_TIPO[(rec.tipo || '').toLowerCase()] || SIZE_BY_TIPO['40bajo'];
    const colorHex = pickColor(rec.naviera, opt.roto, opt.programado);

    const { x, y, z, rotY } = computeWorldFromParsed(parsed, layout, dims);

    const mesh = makeBox(rec.tipo, colorHex);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;

    if (opt.programado) {
      mesh.userData.__pulse = { t: Math.random() * Math.PI * 2 };
    }
    mesh.userData.__record = rec || {};
    layer.add(mesh);
  }

  enDeposito.forEach(r => addRecord(r));
  programados.forEach(r => addRecord(r, { programado: true }));
  rotos.forEach(r => addRecord(r, { roto: true }));

  // animație puls doar pentru programados
  layer.userData.tick = () => {
    for (const m of layer.children) {
      const p = m.userData.__pulse;
      if (!p) continue;
      p.t += 0.04;
      const s = 1 + Math.sin(p.t) * 0.05;
      m.scale.set(1, s, 1);
    }
  };

  return layer;
}