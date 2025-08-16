// src/components/threeWorld/createContainersLayer.js
import * as THREE from 'three';

/* —— culori naviera —— */
const NAVIERA_COLORS = {
  MAERSK: 0xbfc7cf,
  MSK: 0xeab308,
  HAPAG: 0xf97316,
  MESSINA: 0xf97316,
  ONE: 0xec4899,
  EVERGREEN: 0x22c55e,
  ARCAS: 0x2563eb,
  OTROS: 0x8b5e3c,
};

/* —— dimensiuni container (m) —— */
const SIZE_BY_TIPO = {
  '20':        { L: 6.06,  H: 2.59, W: 2.44 },
  '20opentop': { L: 6.06,  H: 2.59, W: 2.44 },
  '40alto':    { L:12.19,  H: 2.89, W: 2.44 },
  '40bajo':    { L:12.19,  H: 2.59, W: 2.44 },
  '40opentop': { L:12.19,  H: 2.59, W: 2.44 },
  '45':        { L:13.72,  H: 2.89, W: 2.44 },
};

/* —— aceleași constante ca în createGround —— */
const SLOT_LEN = 6.06;       // 20ft
const SLOT_W   = 2.44;       // lățime container
const SLOT_GAP = 0.06;       // spațiu vizual între sloturi
const STEP     = SLOT_LEN + SLOT_GAP;

/* —— util: culoarea corectă —— */
function pickColor(naviera = '', roto = false, programado = false) {
  if (roto) return 0xef4444; // roșu pentru roto
  const key = (naviera || '').trim().toUpperCase();
  const base = NAVIERA_COLORS[key] ?? NAVIERA_COLORS.OTROS;
  if (!programado) return base;
  const c = new THREE.Color(base);
  c.offsetHSL(0, 0, +0.1); // un pic mai luminos dacă e programado
  return c.getHex();
}

/* —— parsează A1, A10B, D3C etc —— */
function parsePos(pos = '') {
  const m = pos.trim().toUpperCase().match(/^([A-F])(\d{1,2})([A-Z])?$/);
  if (!m) return null;
  const band = m[1];              // A..F
  const index = Number(m[2]);     // 1..n
  const levelLetter = m[3] || 'A';
  const level = levelLetter.charCodeAt(0) - 64; // A=1,B=2...
  return { band, index, level };
}

/* —— hartă Z pentru ABC și DEF, sincron cu createGround —— */
function zForABCRow(row) {
  const ABC_BASE_Z = -4.0;
  if (row === 'A') return ABC_BASE_Z;
  if (row === 'B') return ABC_BASE_Z - (SLOT_W + 0.10);
  if (row === 'C') return ABC_BASE_Z - 2 * (SLOT_W + 0.10);
  return ABC_BASE_Z;
}

/**
 * Calculează poziția 3D pentru o etichetă (A..F + index + level),
 * folosind aceiași parametri ca marcajele de pe asfalt.
 *
 * abcOffsetX → deplasează blocul ABC pe X
 * defOffsetX → deplasează blocul DEF pe X
 * abcToDefGap → distanța pe Z între ABC și DEF (START_Z_DEF)
 */
function computeCoordFromPos({ band, index, level }, { abcOffsetX, defOffsetX, abcToDefGap }, boxHeight) {
  // înălțime Y în funcție de nivel (A=1 jos, B=2, C=3…)
  const y = (boxHeight / 2) + boxHeight * (level - 1);

  if (band === 'A' || band === 'B' || band === 'C') {
    // ABC: benzi orizontale, sloturile merg spre X negativ
    const z = zForABCRow(band);
    const x = (0 + abcOffsetX) - (index - 0.5) * STEP;
    return new THREE.Vector3(x, y, z);
  }

  // DEF: coloane verticale pe Z, lipite între ele pe X
  const DEF_BASE_X = +4.0 + defOffsetX;
  const DEF_COL_X = {
    D: DEF_BASE_X,
    E: DEF_BASE_X + (SLOT_W + 0.10),
    F: DEF_BASE_X + 2 * (SLOT_W + 0.10),
  };
  const START_Z_DEF = zForABCRow('C') + abcToDefGap;

  const x = DEF_COL_X[band] ?? DEF_COL_X.D;
  const z = START_Z_DEF + (index - 0.5) * STEP; // index crește „în jos” pe Z
  return new THREE.Vector3(x, y, z);
}

export default function createContainersLayer(
  { enDeposito, programados, rotos },
  layout = { abcOffsetX: 0, defOffsetX: 0, abcToDefGap: 16 }
) {
  const layer = new THREE.Group();

  const makeBox = (tipo, colorHex) => {
    const dims = SIZE_BY_TIPO[(tipo || '').toLowerCase()] || SIZE_BY_TIPO['40bajo'];
    const geo = new THREE.BoxGeometry(dims.L, dims.H, dims.W);
    const mat = new THREE.MeshStandardMaterial({ color: colorHex });
    const m = new THREE.Mesh(geo, mat);
    m.userData.__dims = dims;
    return m;
  };

  const addRecord = (rec, { roto = false, programado = false } = {}) => {
    const color = pickColor(rec.naviera || '', roto, programado);
    const mesh = makeBox(rec.tipo, color);

    const parsed = parsePos(rec.posicion || '');
    if (parsed) {
      const dims = mesh.userData.__dims;
      const v = computeCoordFromPos(parsed, layout, dims.H);
      mesh.position.copy(v);
    } else {
      // fallback: parcare nord
      mesh.position.set(0, mesh.userData.__dims.H / 2, 35);
    }

    if (programado) {
      mesh.userData.__pulse = { t: Math.random() * Math.PI * 2 };
    }

    mesh.userData.__record = rec;
    layer.add(mesh);
  };

  (enDeposito || []).forEach(r => addRecord(r));
  (programados || []).forEach(r => addRecord(r, { programado: true }));
  (rotos || []).forEach(r => addRecord(r, { roto: true }));

  // animația „pulse” pentru programados
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