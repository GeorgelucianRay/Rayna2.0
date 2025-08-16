import * as THREE from 'three';

/* culori naviera */
const NAVIERA_COLORS = { /* ... */ };

/* dimensiuni containere */
const SIZE_BY_TIPO = { /* ... */ };

function pickColor(...) { /* ... */ }

function parsePos(...) { /* ... */ }

/* — slotToWorld FINAL — */
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

/* createContainersLayer(...) rămâne identic, doar folosește slotToWorld */

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

  function addRecord(rec, opt = {}) {
    const parsed = parsePos(rec.pos);
    if (!parsed) return;

    const dims = SIZE_BY_TIPO[(rec.tipo || '').toLowerCase()] || SIZE_BY_TIPO['40bajo'];
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