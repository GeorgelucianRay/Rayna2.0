import * as THREE from 'three';

const SLOT_LEN = 6.06;   // 20'
const SLOT_W   = 2.44;
const SLOT_GAP = 0.06;
const STEP     = SLOT_LEN + SLOT_GAP;

const ABC_LABEL_GAP_X = 0.8;
const ABC_LABEL_GAP_Z = 0.0;
const DEF_LABEL_GAP_Z = 1.0;
const D_NUMBERS_GAP_X = 1.3;

function makePaintedText(text, { size = 1.6, color = '#e5e7eb', opacity = 0.9 } = {}) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(S * 0.68)}px sans-serif`;
  ctx.fillText(text, S / 2, S / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const geo = new THREE.PlaneGeometry(size, size);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  return m;
}

function paintSlot({ x = 0, z = 0, along = 'X', alpha = 0.25 }) {
  const sizeX = along === 'X' ? STEP : SLOT_W;
  const sizeZ = along === 'X' ? SLOT_W : STEP;
  const geo = new THREE.PlaneGeometry(sizeX, sizeZ);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: alpha,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  return m;
}

export default function createGround({
  width = 180,
  depth = 120,
  color = 0x2b2f36,
  abcOffsetX = -14,
  defOffsetX = 44,
  abcToDefGap = 20,
} = {}) {
  const g = new THREE.Group();

  // asfalt mare
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.94, metalness: 0.03 })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  g.add(plane);

  // poziții ABC
  const ABC_BASE_Z = -4.0;
  const ABC_ROW_Z = {
    A: ABC_BASE_Z,
    B: ABC_BASE_Z - (SLOT_W + 0.10),
    C: ABC_BASE_Z - 2 * (SLOT_W + 0.10),
  };
  const ABC_BASE_X = abcOffsetX;

  // DEF
  const START_Z_DEF = ABC_ROW_Z.C + abcToDefGap;
  const DEF_BASE_X = 4.0 + defOffsetX;
  const DEF_COL_X = {
    D: DEF_BASE_X,
    E: DEF_BASE_X + (SLOT_W + 0.10),
    F: DEF_BASE_X + 2 * (SLOT_W + 0.10),
  };

  // ABC – 10 sloturi/orizontal pe A,B,C + litere + numere
  for (const row of ['A', 'B', 'C']) {
    const z = ABC_ROW_Z[row];
    for (let col = 1; col <= 10; col++) {
      const xCenter = ABC_BASE_X - (col - 0.5) * STEP;
      g.add(paintSlot({ x: xCenter, z, along: 'X', alpha: 0.28 }));
    }
    const xLeftEdge  = ABC_BASE_X - 10 * STEP;
    const xRightEdge = ABC_BASE_X;

    const labL = makePaintedText(row, { size: 2.0 });
    labL.position.set(xLeftEdge - ABC_LABEL_GAP_X, 0.03, z + ABC_LABEL_GAP_Z);
    g.add(labL);

    const labR = makePaintedText(row, { size: 2.0 });
    labR.position.set(xRightEdge + ABC_LABEL_GAP_X, 0.03, z + ABC_LABEL_GAP_Z);
    g.add(labR);
  }

  // numerotare 10..1 pe A și C (exterioare)
  for (let col = 1; col <= 10; col++) {
    const xNum = ABC_BASE_X - (col - 0.5) * STEP;
    const label = 11 - col; // 10 → 1

    const nA = makePaintedText(String(label), { size: 1.25 });
    nA.position.set(xNum, 0.03, ABC_ROW_Z.A + 1.6);
    g.add(nA);

    const nC = makePaintedText(String(label), { size: 1.25 });
    nC.position.set(xNum, 0.03, ABC_ROW_Z.C - 1.6);
    g.add(nC);
  }

  // DEF – 3 coloane × 7 rânduri
  for (const key of ['D', 'E', 'F']) {
    const x = DEF_COL_X[key];
    for (let r = 1; r <= 7; r++) {
      const zCenter = START_Z_DEF + (r - 0.5) * STEP;
      g.add(paintSlot({ x, z: zCenter, along: 'Z', alpha: 0.28 }));
    }
    const lab = makePaintedText(key, { size: 2.0 });
    lab.position.set(x, 0.03, START_Z_DEF - DEF_LABEL_GAP_Z);
    g.add(lab);
  }

  for (let r = 1; r <= 7; r++) {
    const n = makePaintedText(String(r), { size: 1.25 });
    n.position.set(DEF_COL_X.D - D_NUMBERS_GAP_X, 0.03, START_Z_DEF + (r - 0.5) * STEP);
    g.add(n);
  }

  return g;
}