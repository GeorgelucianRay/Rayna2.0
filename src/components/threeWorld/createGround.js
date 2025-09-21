// src/components/threeWorld/createGround.js
import * as THREE from 'three';

/** dimensiuni slot (metri, aproximativ) */
const SLOT_LEN = 6.06;   // lungimea unui slot 20'
const SLOT_W   = 2.44;   // lățimea containerului
const GAP      = 0.06;   // spațiu vizual între sloturi
const STEP     = SLOT_LEN + GAP; // pasul pe axa de așezare

/* util: text „vopsit” pe asfalt (canvas -> texture) */
function makePaintedText(text, { size = 1.6, color = '#cfd4da', opacity = 0.9 } = {}) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(S * 0.65)}px sans-serif`;
  ctx.fillText(text, S / 2, S / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const geo = new THREE.PlaneGeometry(size, size);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  return m;
}

/* util: slot desenat discret */
function paintSlot({ x = 0, z = 0, along = 'X' }) {
  const sizeX = along === 'X' ? STEP : SLOT_W;
  const sizeZ = along === 'X' ? SLOT_W : STEP;
  const geo = new THREE.PlaneGeometry(sizeX, sizeZ);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  return m;
}

/**
 * Creează asfaltul și benzile ABC/DEF încadrate perfect.
 * Pozițiile se pot regla din obiectele `abc` și `def`.
 */
export default function createGround({
  width = 120,       // X total
  depth = 95,        // Z total
  color = 0x2b2f33,  // asfalt

  // bloc ABC (orizontal): 3 benzi x 10 sloturi
  abc = {
    marginLeft: 12,      // cât departe de marginea stângă
    centerZ: -8,         // poziție pe Z a centrului benzilor
    reverseNumbers: true // 10..1 la A/C
  },

  // bloc DEF (vertical): 3 benzi x 7 sloturi
  def = {
    marginRight: 10,   // distanță până la marginea dreaptă
    startZ: -2,        // început pe Z
    gapToABC: 18       // distanța vizuală față de ABC
  },
} = {}) {
  const g = new THREE.Group();

  // 1) asfaltul (plan mare)
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.02 })
  );
  plane.rotation.x = -Math.PI / 2;
  g.add(plane);

  // margini utile pentru „încadrare”
  const halfW = width / 2;
  const halfD = depth / 2;

  /* =================== ABC (orizontal) =================== */
  // blocul ABC îl plasăm spre stânga, în interior
  const abcLength = 10 * STEP;         // ~ 60.6 m
  const abcHalf   = abcLength / 2;

  // centrul pe X (în interior, la marginLeft de marginea stângă)
  const abcCenterX = -halfW + abc.marginLeft + abcHalf;
  // 3 benzi pe Z (A sus, B mijloc, C jos, foarte apropiate)
  const ABC_ROW_Z = {
    A: abc.centerZ + (SLOT_W + 0.10),
    B: abc.centerZ,
    C: abc.centerZ - (SLOT_W + 0.10),
  };

  // sloturi 10x pe fiecare din A/B/C
  for (const row of ['A', 'B', 'C']) {
    const z = ABC_ROW_Z[row];
    for (let i = 1; i <= 10; i++) {
      const xCenter = abcCenterX - abcHalf + (i - 0.5) * STEP;
      g.add(paintSlot({ x: xCenter, z, along: 'X' }));
    }
  }

  // litere A/B/C la capete (stânga & dreapta)
  const abcLeftX  = abcCenterX - abcHalf;
  const abcRightX = abcCenterX + abcHalf;
  for (const row of ['A', 'B', 'C']) {
    const z = ABC_ROW_Z[row];
    const tL = makePaintedText(row, { size: 1.9 });
    tL.position.set(abcLeftX - 0.9, 0.03, z);
    g.add(tL);
    const tR = makePaintedText(row, { size: 1.9 });
    tR.position.set(abcRightX + 0.9, 0.03, z);
    g.add(tR);
  }

  // numerotare 1..10 (sau 10..1) pe A (sus) și C (jos)
  for (let i = 1; i <= 10; i++) {
    const label = abc.reverseNumbers ? 11 - i : i;
    const x = abcCenterX - abcHalf + (i - 0.5) * STEP;
    const nA = makePaintedText(String(label), { size: 1.1 });
    nA.position.set(x, 0.03, ABC_ROW_Z.A + 1.5);
    g.add(nA);
    const nC = makePaintedText(String(label), { size: 1.1 });
    nC.position.set(x, 0.03, ABC_ROW_Z.C - 1.5);
    g.add(nC);
  }

  /* =================== DEF (vertical) ==================== */
  // blocul DEF îl plasăm spre dreapta, dar apropiat de ABC
  const defLength = 7 * STEP; // ~ 42.9 m
  const defHalf   = defLength / 2;

  // X pentru D/E/F (lipite pe verticală)
  const defRightEdge = halfW - def.marginRight;
  // cele 3 benzi una lângă alta (D interior, E mijloc, F exterior)
  const DEF_COL_X = {
    D: defRightEdge - (SLOT_W + 0.10) * 2,
    E: defRightEdge - (SLOT_W + 0.10) * 1,
    F: defRightEdge,
  };

  // centrăm grosso-modo vertical la o distanță față de ABC:
  const startZ = def.startZ + def.gapToABC; // punct de start al primului slot
  for (const key of ['D', 'E', 'F']) {
    const x = DEF_COL_X[key];
    for (let r = 1; r <= 7; r++) {
      const zCenter = startZ + (r - 0.5) * STEP;
      g.add(paintSlot({ x, z: zCenter, along: 'Z' }));
    }
    // litera coloanei la intrarea în primul slot
    const lab = makePaintedText(key, { size: 1.9 });
    lab.position.set(x, 0.03, startZ - 0.9);
    g.add(lab);
  }

  // numerotare 1..7 pe interior (zona D)
  for (let r = 1; r <= 7; r++) {
    const n = makePaintedText(String(r), { size: 1.1 });
    n.position.set(DEF_COL_X.D - 1.1, 0.03, startZ + (r - 0.5) * STEP);
    g.add(n);
  }

  // verificare încadrări (opțional)
  // console.log({halfW, halfD, abcCenterX, abcLeftX, abcRightX, defRightEdge});

  return g;
}