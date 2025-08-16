import * as THREE from 'three';

/* culori naviera */
const NAVIERA_COLORS = {
  maersk: 0xbfc7cf,
  msk: 0xeab308,
  hapag: 0xf97316,
  messina: 0xf97316,
  one: 0xec4899,
  evergreen: 0x22c55e,
  arcas: 0x2563eb,
  otros: 0x8b5e3c,
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

/* ---- utils ---- */
function pickColor(naviera, roto = false, programado = false) {
  if (roto) return 0xff0000;       // roșu pt roto
  if (programado) return 0xffff00; // galben pt programado
  const key = (naviera || '').toLowerCase();
  return NAVIERA_COLORS[key] || NAVIERA_COLORS.otros;
}

function parsePos(pos) {
  if (!pos || typeof pos !== 'string') return null;
  // Ex: "A2B"
  const match = pos.match(/^([A-F])(\d+)([A-Z])$/i);
  if (!match) return null;
  const [, band, idx, lvl] = match;
  return {
    band: band.toUpperCase(),
    index: parseInt(idx, 10),
    level: lvl.charCodeAt(0) - 64 // A=1, B=2 etc.
  };
}

/* ---- slotToWorld ---- */
function slotToWorld(container, opts = {}) {
  const STEP_X = opts.stepX || 2.5;
  const STEP_Y = 2.9;
  const STEP_Z = opts.stepZ || 2.7;

  const baseX_ABC = opts.baseX_ABC || -5;
  const baseX_DEF = opts.baseX_DEF || 15;
  const baseZ = opts.baseZ || 0;

  const { lane, index, tier } = container;
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
    rotationY = Math.PI / 2;
  }

  const y = (tier - 1) * STEP_Y;
  return { position: new THREE.Vector3(x, y, z), rotationY };
}

/* ---- createContainersLayer ---- */
/**
 * data = { enDeposito:[], programados:[], rotos:[] }
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

  function addRecord(rec, opt = {}) {
    const parsed = parsePos(rec.pos);
    if (!parsed) return;

    const colorHex = pickColor(rec.naviera, opt.roto, opt.programado);
    const mesh = makeBox(rec.tipo, colorHex);

    // coordonate + rotație
    const { position, rotationY } = slotToWorld(
      {
        lane: parsed.band,
        index: parsed.index,
        tier: parsed.level,
        sizeFt: rec.tipo
      },
      {
        stepX: 2.5,
        stepZ: 2.7,
        baseX_ABC: -5,
        baseX_DEF: 15,
        baseZ: 0
      }
    );

    mesh.position.copy(position);
    mesh.rotation.y = rotationY;

    if (opt.programado) {
      mesh.userData.__pulse = { t: Math.random() * Math.PI * 2 };
    }
    mesh.userData.__record = rec || {};
    layer.add(mesh);
  }

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