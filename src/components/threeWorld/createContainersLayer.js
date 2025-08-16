// src/components/threeWorld/createContainersLayer.js
import * as THREE from 'three';

/* culori naviera */
const NAVIERA_COLORS = {
  MAERSK: 0xbfc7cf, MSK: 0xeab308, HAPAG: 0xf97316, MESSINA: 0xf97316,
  ONE: 0xec4899, EVERGREEN: 0x22c55e, ARCAS: 0x2563eb, OTROS: 0x8b5e3c,
};

/* dimensiuni containere */
const SIZE_BY_TIPO = {
  '20':        { L: 6.06,  H: 2.59, W: 2.44 },
  '20opentop': { L: 6.06,  H: 2.59, W: 2.44 },
  '40alto':    { L:12.19,  H: 2.89, W: 2.44 },
  '40bajo':    { L:12.19,  H: 2.59, W: 2.44 },
  '40opentop': { L:12.19,  H: 2.59, W: 2.44 },
  '45':        { L:13.72,  H: 2.89, W: 2.44 },
};

/* aceleași constante ca în createGround */
const SLOT_LEN = 6.06;
const SLOT_W   = 2.44;
const SLOT_GAP = 0.06;
const STEP     = SLOT_LEN + SLOT_GAP;

/* utilitare */
function pickColor(naviera = '', roto = false, programado = false) {
  if (roto) return 0xef4444;
  const key = (naviera || '').trim().toUpperCase();
  const base = NAVIERA_COLORS[key] ?? NAVIERA_COLORS.OTROS;
  if (!programado) return base;
  const c = new THREE.Color(base); c.offsetHSL(0, 0, 0.1);
  return c.getHex();
}

function parsePos(raw) {
  const s = String(raw || '').trim().toUpperCase();
  const m = s.match(/^([A-F])(\d{1,2})([A-Z])?$/); // ex: A1, A10B
  if (!m) return null;
  const band = m[1];
  const index = Number(m[2]);
  const levelLetter = m[3] || 'A';
  const level = levelLetter.charCodeAt(0) - 64; // A=1
  return { band, index, level };
}

function zForABCRow(row) {
  const ABC_BASE_Z = -4.0;
  if (row === 'A') return ABC_BASE_Z;
  if (row === 'B') return ABC_BASE_Z - (SLOT_W + 0.10);
  if (row === 'C') return ABC_BASE_Z - 2 * (SLOT_W + 0.10);
  return ABC_BASE_Z;
}

/** poziția în lume pentru un „slot” (fără să ne batem capul cu alt fișier) */
function coordFromLayout({ band, index, level }, layout, boxH) {
  const abcOffsetX  = Number(layout?.abcOffsetX  ?? 0);
  const defOffsetX  = Number(layout?.defOffsetX  ?? 0);
  const abcToDefGap = Number(layout?.abcToDefGap ?? 16);

  // Y: etaje
  const y = (boxH / 2) + boxH * (level - 1);

  if (band === 'A' || band === 'B' || band === 'C') {
    const z = zForABCRow(band);
    const x = abcOffsetX - (index - 0.5) * STEP; // ABC merg spre X negativ
    return { x, y, z, rotY: 0 };
  }

  // D/E/F: coloane verticale pe Z, lipite pe X
  const DEF_BASE_X = 4.0 + defOffsetX;
  const DEF_COL_X = {
    D: DEF_BASE_X,
    E: DEF_BASE_X + (SLOT_W + 0.10),
    F: DEF_BASE_X + 2 * (SLOT_W + 0.10),
  };
  const START_Z_DEF = zForABCRow('C') + abcToDefGap;
  const x = DEF_COL_X[band] ?? DEF_COL_X.D;
  const z = START_Z_DEF + (index - 0.5) * STEP;
  return { x, y, z, rotY: Math.PI / 2 }; // DEF rotit 90° să fie pe verticală
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
    const key = (tipo || '').toLowerCase();
    const norm = key === '40' ? '40bajo' : key; // normalizează „40” la 40bajo
    const dims = SIZE_BY_TIPO[norm] || SIZE_BY_TIPO['40bajo'];
    const geo = new THREE.BoxGeometry(dims.L, dims.H, dims.W);
    const mat = new THREE.MeshStandardMaterial({ color: colorHex });
    const m = new THREE.Mesh(geo, mat);
    m.userData.__dims = dims;
    return m;
  };

  function addRecord(rec, opt = {}) {
    // acceptă rec.posicion, rec.pos, rec.position, rec.slot
    const rawPos = rec.posicion ?? rec.pos ?? rec.position ?? rec.slot ?? '';
    const parsed = parsePos(rawPos);
    if (!parsed) return;

    const dims = SIZE_BY_TIPO[(String(rec.tipo || '').toLowerCase())] || SIZE_BY_TIPO['40bajo'];
    const colorHex = pickColor(rec.naviera, opt.roto, opt.programado);
    const mesh = makeBox(rec.tipo, colorHex);

    // coordonate + rotație, ALINIAT cu marcajele din createGround
    const { x, y, z, rotY } = coordFromLayout(parsed, layout, dims.H);
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

  // animație „pulse” pt. programados
  layer.userData.tick = () => {
    layer.children.forEach(m => {
      if (m.userData.__pulse) {
        m.userData.__pulse.t += 0.04;
        const s = 1 + Math.sin(m.userData.__pulse.t) * 0.05;
        m.scale.set(1, s, 1);
      }
    });
  };

  return layer;
}