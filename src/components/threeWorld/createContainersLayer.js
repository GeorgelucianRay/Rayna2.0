import * as THREE from 'three';

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

const SIZE_BY_TIPO = {
  '20':        { L: 6.06,  H: 2.59, W: 2.44 },
  '20opentop': { L: 6.06,  H: 2.59, W: 2.44 },
  '40alto':    { L:12.19,  H: 2.89, W: 2.44 },
  '40bajo':    { L:12.19,  H: 2.59, W: 2.44 },
  '40opentop': { L:12.19,  H: 2.59, W: 2.44 },
  '45':        { L:13.72,  H: 2.89, W: 2.44 },
};

function pickColor(naviera = '', roto = false, programado = false) {
  if (roto) return 0xef4444;
  const key = (naviera || '').trim().toUpperCase();
  const base = NAVIERA_COLORS[key] ?? NAVIERA_COLORS.OTROS;
  if (!programado) return base;
  const c = new THREE.Color(base);
  c.offsetHSL(0, 0, +0.08);
  return c.getHex();
}

/** A1 / A10B => { row:'A', col:1.., level:1.. } */
function parsePos(pos = '') {
  const m = pos.trim().toUpperCase().match(/^([A-F])(\d{1,2})([A-Z])?$/);
  if (!m) return null;
  const row = m[1];
  const col = Number(m[2]);
  const levelLetter = m[3] || 'A';
  const level = levelLetter.charCodeAt(0) - 64; // A=1, B=2 ...
  return { row, col, level };
}

/**
 * Sistem de coordonate:
 *  - X = est-vest
 *  - Z = nord-sud
 *  - Y = înălțime
 *
 * ABC = bloc stânga (X negativ), orizontal (10 sloturi pe X), rândurile A,B,C aproape lipite (pe Z)
 * DEF = bloc dreapta (X pozitiv), vertical (7 sloturi pe Z), rândurile D,E,F aproape lipite (pe X)
 *
 * Notă: la DEF, poziția 7 este lipită de gard (Z maxim).
 */
function toCoordABC(row, col, level, height) {
  const ORIGIN_X = -52;      // “start” ABC spre stânga
  const ORIGIN_Z = 0;        // centru pe Z
  const COL_GAP = 5.8;       // distanță între sloturi (aproape lipite)
  const ROW_GAP = 2.8;       // A/B/C foarte apropiate
  const rowIndex = { A: +ROW_GAP, B: 0, C: -ROW_GAP }[row] ?? 0;

  const x = ORIGIN_X + (col - 1) * COL_GAP;
  const z = ORIGIN_Z + rowIndex;
  const y = (height / 2) + (height * (level - 1));
  return new THREE.Vector3(x, y, z);
}

function toCoordDEF(row, col, level, height) {
  // D,E,F pe X (aproape lipite), 1..7 pe Z (vertical spre gard)
  const ORIGIN_X = +36;
  const ORIGIN_Z = -18;      // 1 aproape de centru
  const ROW_GAP_X = 2.8;     // distanța mică între D/E/F
  const COL_GAP_Z = 6.8;     // 7 sloturi până la gard
  const rowIndexX = { D: 0, E: +ROW_GAP_X, F: +ROW_GAP_X * 2 }[row] ?? 0;

  const x = ORIGIN_X + rowIndexX;
  const z = ORIGIN_Z + (col - 1) * COL_GAP_Z; // col=7 -> aproape de gard (Z mare)
  const y = (height / 2) + (height * (level - 1));
  return new THREE.Vector3(x, y, z);
}

function toCoord(row, col, level, height) {
  if (row === 'A' || row === 'B' || row === 'C') {
    return toCoordABC(row, col, level, height);
  }
  // D,E,F
  return toCoordDEF(row, col, level, height);
}

export default function createContainersLayer({ enDeposito, programados, rotos }) {
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
      const { H } = mesh.userData.__dims;
      mesh.position.copy(toCoord(parsed.row, parsed.col, parsed.level, H));
    } else {
      // fallback: “parcare” centrală
      mesh.position.set(-4, mesh.userData.__dims.H / 2, 14);
    }

    if (programado) {
      const baseY = mesh.scale.y;
      mesh.userData.__pulse = { baseY, t: Math.random() * Math.PI * 2 };
    }

    mesh.userData.__record = rec;
    layer.add(mesh);
  };

  (enDeposito || []).forEach(r => addRecord(r));
  (programados || []).forEach(r => addRecord(r, { programado: true }));
  (rotos || []).forEach(r => addRecord(r, { roto: true }));

  if (layer.children.length === 0) {
    addRecord({ naviera: 'EVERGREEN', tipo: '40alto', posicion: 'A1' });
    addRecord({ naviera: 'HAPAG',     tipo: '20',     posicion: 'A2B' });
    addRecord({ naviera: 'ONE',       tipo: '40bajo', posicion: 'D3'  });
  }

  layer.userData.tick = () => {
    layer.children.forEach(m => {
      if (m.userData.__pulse) {
        const p = m.userData.__pulse;
        p.t += 0.04;
        const s = 1 + Math.sin(p.t) * 0.05;
        m.scale.set(1, s, 1);
      }
    });
  };

  return layer;
}