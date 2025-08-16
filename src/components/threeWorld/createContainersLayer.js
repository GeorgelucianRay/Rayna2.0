import * as THREE from 'three';

/* culori naviera */
const NAVIERA_COLORS = {
  MAERSK: 0xbfc7cf, MSK: 0xeab308, HAPAG: 0xf97316, MESSINA: 0xf97316,
  ONE: 0xec4899, EVERGREEN: 0x22c55e, ARCAS: 0x2563eb, OTROS: 0x8b5e3c,
};

/* dimensiuni (m) */
const SIZE_BY_TIPO = {
  '20': { L:6.06,H:2.59,W:2.44 }, '20opentop': { L:6.06,H:2.59,W:2.44 },
  '40alto': { L:12.19,H:2.89,W:2.44 }, '40bajo': { L:12.19,H:2.59,W:2.44 },
  '40opentop': { L:12.19,H:2.59,W:2.44 }, '45': { L:13.72,H:2.89,W:2.44 },
};

/* === GRID COMPACT === */
const SLOT_LEN = 6.06;         // 20’
const SLOT_GAP = 0.08;         // foarte mic – aproape „lipite”
const STEP = SLOT_LEN + SLOT_GAP;    // pas pe lungime

/* ABC: trei rânduri lipite pe Z (diferența ≈ lățimea containerului) */
const ROW_Z = { A: -4.0, B: -6.8, C: -9.6 };   // ~2.8m între ele (lipite)

/* DEF: trei coloane lipite pe X */
const COL_X = { D: +4.0, E: +6.8, F: +9.6 };

/* DEF: slotul 1 pornește imediat sub rândul C; 1..7 urcă pe Z+ */
const START_Z_DEF = ROW_Z.C + STEP * 0.5;

function slotsForTipo(tipo='') {
  const t = tipo.toLowerCase();
  if (t.startsWith('20')) return 1;
  if (t.startsWith('40') || t === '45') return 2;
  return 2;
}

function parsePos(pos='') {
  const m = pos.trim().toUpperCase().match(/^([A-F])(\d{1,2})([A-Z])?$/);
  if (!m) return null;
  const row = m[1];
  const startCol = Number(m[2]);
  const levelLetter = m[3] || 'A';
  const level = levelLetter.charCodeAt(0) - 64; // A=1
  return { row, startCol, level };
}

function pickColor(naviera='', roto=false, programado=false) {
  if (roto) return 0xef4444;
  const base = NAVIERA_COLORS[naviera.trim().toUpperCase()] ?? NAVIERA_COLORS.OTROS;
  if (!programado) return base;
  const c = new THREE.Color(base); c.offsetHSL(0,0,+0.1); return c.getHex();
}

/* poziționare: ABC pe X negativ; DEF pe Z pozitiv */
function toCoord(parsed, occSlots, height) {
  const { row, startCol, level } = parsed;
  let x=0, z=0;

  if (row === 'A' || row === 'B' || row === 'C') {
    const centerCol = startCol + (occSlots/2 - 0.5);
    x = -((centerCol) * STEP);             // spre stânga
    z = ROW_Z[row];
  } else {
    const centerRow = startCol + (occSlots/2 - 0.5); // 1..7
    x = COL_X[row];
    z = START_Z_DEF + (centerRow - 1) * STEP;        // vertical
  }

  const y = (height/2) + height*(level-1);
  return new THREE.Vector3(x,y,z);
}

export default function createContainersLayer({ enDeposito, programados, rotos }) {
  const layer = new THREE.Group();

  const makeBox = (tipo, colorHex) => {
    const dims = SIZE_BY_TIPO[tipo?.toLowerCase()] || SIZE_BY_TIPO['40bajo'];
    const geo = new THREE.BoxGeometry(dims.L, dims.H, dims.W);
    const mat = new THREE.MeshStandardMaterial({ color: colorHex });
    const m = new THREE.Mesh(geo, mat); m.userData.__dims = dims; return m;
  };

  const addRecord = (rec, opts={}) => {
    const mesh = makeBox(rec.tipo, pickColor(rec.naviera, opts.roto, opts.programado));
    const parsed = parsePos(rec.posicion || '');
    if (parsed) {
      const occ = slotsForTipo(rec.tipo);
      mesh.position.copy(toCoord(parsed, occ, mesh.userData.__dims.H));
    } else {
      mesh.position.set(0, mesh.userData.__dims.H/2, 32); // parcare
    }
    if (opts.programado) mesh.userData.__pulse = { t: Math.random()*Math.PI*2 };
    layer.add(mesh);
  };

  (enDeposito||[]).forEach(r=>addRecord(r));
  (programados||[]).forEach(r=>addRecord(r,{programado:true}));
  (rotos||[]).forEach(r=>addRecord(r,{roto:true}));

  if (layer.children.length===0){
    addRecord({ naviera:'EVERGREEN', tipo:'40alto', posicion:'A1' });
    addRecord({ naviera:'HAPAG',     tipo:'20',     posicion:'A2B' });
    addRecord({ naviera:'ONE',       tipo:'40bajo', posicion:'E3'  });
  }

  layer.userData.tick = () => {
    layer.children.forEach(m=>{
      if (m.userData.__pulse){
        m.userData.__pulse.t += .04;
        const s = 1 + Math.sin(m.userData.__pulse.t)*.05;
        m.scale.set(1,s,1);
      }
    });
  };
  return layer;
}