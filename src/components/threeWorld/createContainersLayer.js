// src/components/threeWorld/createContainersLayer.js
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
  if (roto) return 0xef4444; // roșu pentru roto
  const key = naviera.trim().toUpperCase();
  const base = NAVIERA_COLORS[key] ?? NAVIERA_COLORS.OTROS;
  if (!programado) return base;
  const c = new THREE.Color(base);
  c.offsetHSL(0, 0, +0.1); // mai luminos dacă e programado
  return c.getHex();
}

function parsePos(pos = '') {
  // A1, A10B (B=etaj 2)
  const m = pos.trim().toUpperCase().match(/^([A-F])(\d{1,2})([A-Z])?$/);
  if (!m) return null;
  const row = m[1];
  const col = Number(m[2]);
  const levelLetter = m[3] || 'A';
  const level = levelLetter.charCodeAt(0) - 64; // A=1, B=2...
  return { row, col, level };
}

function toCoord(row, col, level, height) {
  // curte mai mică
  const ROW_SPACING = 5.5;  // distanță între rânduri ABC / DEF (pe Z)
  const COL_SPACING = 12;   // distanță între coloane (pe X)
  const rowIndex = { A: -0, B: -1, C: -2, D: +0, E: +1, F: +2 }[row] ?? 0;
  const sideShift = row <= 'C' ? -1 : +1; // ABC în stânga, DEF în dreapta
  const x = sideShift * (COL_SPACING * (col - 1) + 8);
  const z = rowIndex * ROW_SPACING;
  const y = (height / 2) + height * (level - 1);
  return new THREE.Vector3(x, y, z);
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
      // fallback: „zona parcare” la nord
      mesh.position.set(0, mesh.userData.__dims.H / 2, 35);
    }

    if (programado) {
      // pulse subtil
      const baseY = mesh.scale.y;
      mesh.userData.__pulse = { baseY, t: Math.random() * Math.PI * 2 };
    }

    mesh.userData.__record = rec;
    layer.add(mesh);
  };

  (enDeposito || []).forEach(r => addRecord(r));
  (programados || []).forEach(r => addRecord(r, { programado: true }));
  (rotos || []).forEach(r => addRecord(r, { roto: true }));

  // dacă n-ai date, arată 3 demo (exact ce vedeai înainte)
  if (layer.children.length === 0) {
    addRecord({ naviera: 'EVERGREEN', tipo: '40alto', posicion: 'A1' });
    addRecord({ naviera: 'HAPAG',     tipo: '20',     posicion: 'A2B' });
    addRecord({ naviera: 'ONE',       tipo: '40bajo', posicion: 'E3'  });
  }

  // tick pt. animația „programados”
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