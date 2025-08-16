import * as THREE from 'three';

/* —— culori naviera —— */
const NAVIERA_COLORS = {
  MAERSK: 0xbfc7cf, MSK: 0xeab308, HAPAG: 0xf97316, MESSINA: 0xf97316,
  ONE: 0xec4899, EVERGREEN: 0x22c55e, ARCAS: 0x2563eb, OTROS: 0x8b5e3c
};
const SIZE_BY_TIPO = {
  '20':{L:6.06,H:2.59,W:2.44}, '20opentop':{L:6.06,H:2.59,W:2.44},
  '40alto':{L:12.19,H:2.89,W:2.44}, '40bajo':{L:12.19,H:2.59,W:2.44},
  '40opentop':{L:12.19,H:2.59,W:2.44}, '45':{L:13.72,H:2.89,W:2.44}
};

function pickColor(naviera = '', roto = false, programado = false) {
  if (roto) return 0xef4444;
  const key = naviera.trim().toUpperCase();
  const base = NAVIERA_COLORS[key] ?? NAVIERA_COLORS.OTROS;
  const c = new THREE.Color(base);
  if (programado) c.offsetHSL(0, 0, 0.1); // puțin mai luminos
  return c.getHex();
}

function parsePos(pos = '') {
  const m = pos.trim().toUpperCase().match(/^([A-F])(\d{1,2})([A-Z])?$/);
  if (!m) return null;
  const row = m[1], col = Number(m[2]), levelLetter = m[3] || 'A';
  const level = levelLetter.charCodeAt(0) - 64; // A=1
  return { row, col, level };
}

function toCoord(row, col, level, height) {
  const ROW_SPACING = 6;   // distanța între A,B,C… pe Z
  const COL_SPACING = 14;  // distanța între coloane pe X
  const rowIndex = { A:-2, B:-1, C:0, D:0, E:1, F:2 }[row] ?? 0;
  const sideShift = (row <= 'C') ? -1 : +1;
  const x = sideShift * (COL_SPACING * (col - 1) + 10);
  const z = rowIndex * ROW_SPACING;
  const y = (height/2) + height*(level - 1);
  return new THREE.Vector3(x, y, z);
}

export default function createContainersLayer({ enDeposito = [], programados = [], rotos = [] } = {}) {
  const group = new THREE.Group();
  group.name = 'containersLayer';

  const makeContainer = (tipo, colorHex) => {
    const key = (tipo || '').toLowerCase();
    const dims = SIZE_BY_TIPO[key] || SIZE_BY_TIPO['40bajo'];
    const geom = new THREE.BoxGeometry(dims.L, dims.H, dims.W);
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.9, metalness: 0.05 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData.__dims = dims;
    return mesh;
  };

  const addItem = (rec, { roto = false, programado = false }={}) => {
    const color = pickColor(rec.naviera, roto, programado);
    const mesh = makeContainer(rec.tipo, color);
    const pos = parsePos(rec.posicion || '');
    if (pos) {
      const v = toCoord(pos.row, pos.col, pos.level, mesh.userData.__dims.H);
      mesh.position.copy(v);
    } else {
      mesh.position.set(0, mesh.userData.__dims.H/2, 42);
    }
    if (programado) mesh.userData.__pulse = { t: Math.random()*Math.PI*2 };
    mesh.userData.__record = rec;
    group.add(mesh);
  };

  enDeposito.forEach(r => addItem(r));
  programados.forEach(r => addItem(r, { programado: true }));
  rotos.forEach(r => addItem(r, { roto: true }));

  if (group.children.length === 0) {
    [{ naviera:'EVERGREEN', tipo:'40alto', posicion:'A1' },
     { naviera:'HAPAG', tipo:'20', posicion:'A2B'  },
     { naviera:'ONE', tipo:'40bajo', posicion:'E3' }].forEach(r => addItem(r));
  }

  // tick pentru puls la programados
  group.userData.tick = () => {
    group.children.forEach(m => {
      if (m.userData.__pulse) {
        m.userData.__pulse.t += 0.04;
        const s = 1 + Math.sin(m.userData.__pulse.t) * 0.05;
        m.scale.set(1, s, 1);
      }
    });
  };

  return group;
}
