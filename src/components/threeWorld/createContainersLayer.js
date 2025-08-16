// src/components/threeWorld/createContainersLayer.js
import * as THREE from 'three';
import { slotToWorld } from './slotToWorld';

/* — culori naviera — */
const NAVIERA_COLORS = {
  MAERSK: 0xbfc7cf, MSK: 0xeab308, HAPAG: 0xf97316, MESSINA: 0xf97316,
  ONE: 0xec4899, EVERGREEN: 0x22c55e, ARCAS: 0x2563eb, OTROS: 0x8b5e3c,
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

/* — aceleași constante ca în createGround — */
const SLOT_LEN = 6.06;
const SLOT_W   = 2.44;
const SLOT_GAP = 0.06;
const STEP     = SLOT_LEN + SLOT_GAP;

/* — utilitare — */
function pickColor(naviera = '', roto = false, programado = false) {
  if (roto) return 0xef4444;
  const key = (naviera || '').trim().toUpperCase();
  const base = NAVIERA_COLORS[key] ?? NAVIERA_COLORS.OTROS;
  if (!programado) return base;
  const c = new THREE.Color(base); c.offsetHSL(0, 0, 0.1); return c.getHex();
}

function parsePos(pos = '') {
  const m = String(pos).trim().toUpperCase().match(/^([A-F])(\d{1,2})([A-Z])?$/);
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

function computeCoordFromPos(parsed, layout, boxH) {
  const { band, index, level } = parsed;
  const abcOffsetX  = Number(layout?.abcOffsetX  ?? 0);
  const defOffsetX  = Number(layout?.defOffsetX  ?? 0);
  const abcToDefGap = Number(layout?.abcToDefGap ?? 16);

  // Y: etaje (A=1 jos, B=2, ...)
  const y = (boxH / 2) + boxH * (level - 1);

  if (band === 'A' || band === 'B' || band === 'C') {
    const z = zForABCRow(band);
    const x = abcOffsetX - (index - 0.5) * STEP; // ABC merg spre X negativ
    return new THREE.Vector3(x, y, z);
  }

  // D/E/F: coloane verticale pe Z, lipite pe X
  const DEF_BASE_X = +4.0 + defOffsetX;
  const DEF_COL_X = {
    D: DEF_BASE_X,
    E: DEF_BASE_X + (SLOT_W + 0.10),
    F: DEF_BASE_X + 2 * (SLOT_W + 0.10),
  };
  const START_Z_DEF = zForABCRow('C') + abcToDefGap;
  const x = DEF_COL_X[band] ?? DEF_COL_X.D;
  const z = START_Z_DEF + (index - 0.5) * STEP;
  return new THREE.Vector3(x, y, z);
}
function slotToWorld(container, opts = {}) {
  const STEP_X = opts.stepX || 2.5;
  const STEP_Y = 2.9;
  const STEP_Z = opts.stepZ || 2.7;

  const baseX_ABC = opts.baseX_ABC || -5;
  const baseX_DEF = opts.baseX_DEF || 15;
  const baseZ = opts.baseZ || 0;

  const { lane, index, tier, sizeFt } = container;
  let x, z, rotationY = 0;

  if (['A', 'B', 'C'].includes(lane)) {
    // invers pentru ABC
    x = baseX_ABC - (index - 1) * STEP_X;
    z = lane === 'A' ? baseZ
        : lane === 'B' ? baseZ + STEP_Z
        : baseZ + 2 * STEP_Z;
  } else {
    // DEF pe vertical
    z = baseZ + (index - 1) * STEP_X;
    x = baseX_DEF + (lane === 'D' ? 0
          : lane === 'E' ? STEP_Z
          : 2 * STEP_Z);
    rotationY = Math.PI / 2; // rotim 90°
  }

  const y = (tier - 1) * STEP_Y;
  return { position: new THREE.Vector3(x, y, z), rotationY };
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
    const geo = new THREE.BoxGeometry(dims.L, dims.H, dims.W);
    const mat = new THREE.MeshStandardMaterial({ color: colorHex });
    const m = new THREE.Mesh(geo, mat);
    m.userData.__dims = dims;
    return m;
  };

  for (const c of containers) {
  const mesh = makeContainerMesh(c.sizeFt, c.color);

  // obținem poziția și rotația corectă
  const { position, rotationY } = slotToWorld(c, {
    stepX: 2.5,
    stepZ: 2.7,
    baseX_ABC: -5,
    baseX_DEF: 15,
    baseZ: 0
  });

  mesh.position.copy(position);
  mesh.rotation.y = rotationY;

  group.add(mesh);
}

    if (opt.programado) {
      mesh.userData.__pulse = { t: Math.random() * Math.PI * 2 };
    }
    mesh.userData.__record = rec || {};
    layer.add(mesh);
  };

  enDeposito.forEach(r => addRecord(r));
  programados.forEach(r => addRecord(r, { programado: true }));
  rotos.forEach(r => addRecord(r, { roto: true }));

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