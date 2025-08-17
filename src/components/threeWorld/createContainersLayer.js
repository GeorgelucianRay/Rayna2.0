// src/components/threeWorld/createContainersLayer.js

import * as THREE from 'three';
import { slotToWorld } from './slotToWorld'; // Folosim direct utilitarul corect

/* — culori naviera — */
const NAVIERA_COLORS = {
  MAERSK: 0xbfc7cf, MSK: 0xbfc7cf,
  HAPAG: 0xf97316,  MESSINA: 0xf97316,
  ONE: 0xec4899,
  EVERGREEN: 0x22c55e,
  ARCAS: 0x2563eb,
  OTROS: 0x8b5e3c
};

/* — dimensiuni containere — */
const SIZE_BY_TIPO = {
  '20':        { L: 6.06,  H: 2.59, W: 2.44 },
  '20opentop': { L: 6.06,  H: 2.59, W: 2.44 },
  '40alto':    { L:12.19,  H: 2.89, W: 2.44 },
  '40bajo':    { L:12.19,  H: 2.59, W: 2.44 },
  '40opentop': { L:12.19,  H: 2.59, W: 2.44 },
  '45':        { L:13.72,  H: 2.89, W: 2.44 },
};

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

function parsePos(any) {
  const s = String(any || '').trim().toUpperCase();
  const m = s.match(/^([A-F])(\d{1,2})([A-Z])?$/);
  if (!m) return null;
  const band = m[1];
  const index = Number(m[2]);
  const levelLetter = m[3] || 'A';
  const level = levelLetter.charCodeAt(0) - 64;
  return { band, index, level };
}

/**
 * data = { containers: [] }
 * layout = { abcOffsetX, defOffsetX, abcToDefGap }
 */
export default function createContainersLayer(data, layout) {
  const layer = new THREE.Group();
  const allContainers = data?.containers || [];

  const makeBox = (tipo, colorHex) => {
    const dims = SIZE_BY_TIPO[(tipo || '').toLowerCase()] || SIZE_BY_TIPO['40bajo'];
    const geo = new THREE.BoxGeometry(dims.L, dims.H, dims.W);
    const mat = new THREE.MeshStandardMaterial({ color: colorHex });
    const m = new THREE.Mesh(geo, mat);
    m.userData.__dims = dims;
    return m;
  };

  const addRecord = (rec) => {
    const parsed = parsePos(rec.pos ?? rec.posicion);
    if (!parsed) return;

    // Folosim slotToWorld pentru a calcula corect coordonatele
    const worldPos = slotToWorld(
      { lane: parsed.band, index: parsed.index, tier: String.fromCharCode(64 + parsed.level) },
      { ...layout, abcNumbersReversed: true } // Asigurăm că numerotarea inversă e activă
    );

    // Determinăm starea (roto/programado) din sursa record-ului
    const isRoto = rec.__source === 'rotos';
    const isProgramado = rec.__source === 'programados';
    const colorHex = pickColor(rec.naviera, isRoto, isProgramado);
    
    const mesh = makeBox(rec.tipo, colorHex);
    mesh.position.copy(worldPos.position);
    mesh.rotation.y = worldPos.rotationY;

    if (isProgramado) {
      mesh.userData.__pulse = { t: Math.random() * Math.PI * 2 };
    }
    mesh.userData.__record = rec || {};
    layer.add(mesh);
  };

  // O singură buclă pentru toate containerele
  allContainers.forEach(rec => addRecord(rec));

  // Animație puls (doar pentru programados)
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
