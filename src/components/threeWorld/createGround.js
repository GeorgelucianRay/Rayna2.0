// src/components/threeWorld/createGround.js
import * as THREE from 'three';

/** Dimensiuni slot (sincron cu containerele) */
const SLOT_LEN = 6.06;   // lungime slot 20'
const SLOT_W   = 2.44;   // lățime container
const SLOT_GAP = 0.06;   // ~6 cm între sloturi (doar vizual)
const STEP     = SLOT_LEN + SLOT_GAP; // pas pe lungime 20'

/** mici marje pentru poziționarea textului față de marcaje */
const ABC_LABEL_GAP_X = 0.6;  // cât iese litera în fața/după banda ABC pe X
const ABC_LABEL_GAP_Z = 0.0;  // cât deplasez litera pe Z față de axa benzii
const DEF_LABEL_GAP_Z = 0.8;  // cât de departe de primul slot (pe Z) pentru D/E/F
const D_NUMBERS_GAP_X = 1.2;  // cât intră numerele 1..7 spre interiorul curții

/** text “vopsit” (canvas map pe un plane culcat pe asfalt) */
function makePaintedText(text, { size = 1.6, color = '#e5e7eb', opacity = 0.8 } = {}) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(S * 0.7)}px sans-serif`;
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

/** un dreptunghi alb subtil pentru slot */
function paintSlot({ x = 0, z = 0, along = 'X' }) {
  const sizeX = along === 'X' ? STEP : SLOT_W;
  const sizeZ = along === 'X' ? SLOT_W : STEP;
  const geo = new THREE.PlaneGeometry(sizeX, sizeZ);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  return m;
}

/**
 * Creează asfalt + marcaje ABC (orizontale) și DEF (verticale).
 * Opțiuni controlate din MapPage:
 *   width, depth, color, abcOffsetX, defOffsetX, abcToDefGap
 */
export default function createGround({
  width = 90,          // lățimea curții (X)
  depth = 60,          // lungimea curții (Z)
  color = 0x9aa0a6,
  abcOffsetX = -10,    // deplasarea blocului ABC pe X
  defOffsetX = 32,     // deplasarea blocului DEF pe X
  abcToDefGap = 16,    // distanța pe Z între ABC și DEF
} = {}) {
  const g = new THREE.Group();

  // ASFALT
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.02 })
  );
  plane.rotation.x = -Math.PI / 2;
  g.add(plane);

  // ABC – 3 benzi lipite pe Z
  const ABC_BASE_Z = -4.0;
  const ABC_ROW_Z = {
    A: ABC_BASE_Z,
    B: ABC_BASE_Z - (SLOT_W + 0.10),
    C: ABC_BASE_Z - 2 * (SLOT_W + 0.10),
  };

  // DEF – vertical, mai jos pe Z pentru forma de T
  const START_Z_DEF = ABC_ROW_Z.C + abcToDefGap;

  // poziții pe X pentru ABC și DEF
  const ABC_BASE_X = abcOffsetX;
  const DEF_BASE_X = 4.0 + defOffsetX;
  const DEF_COL_X = {
    D: DEF_BASE_X,
    E: DEF_BASE_X + (SLOT_W + 0.10),
    F: DEF_BASE_X + 2 * (SLOT_W + 0.10),
  };

  /* ======================= ABC ======================= */

  for (const row of ['A', 'B', 'C']) {
    const z = ABC_ROW_Z[row];

    // 10 sloturi orizontale
    for (let col = 1; col <= 10; col++) {
      const xCenter = ABC_BASE_X - (col - 0.5) * STEP; // spre stânga
      g.add(paintSlot({ x: xCenter, z, along: 'X' }));
    }

    // litere la ambele capete, lipite de banda
    // capătul stânga (după ultimul slot = la x = ABC_BASE_X - 10*STEP)
    const xLeftEdge  = ABC_BASE_X - 10 * STEP;
    const labL = makePaintedText(row, { size: 2.0 });
    labL.position.set(xLeftEdge - ABC_LABEL_GAP_X, 0.03, z + ABC_LABEL_GAP_Z);
    g.add(labL);

    // capătul dreapta (înainte de primul slot = la x = ABC_BASE_X)
    const xRightEdge = ABC_BASE_X;
    const labR = makePaintedText(row, { size: 2.0 });
    labR.position.set(xRightEdge + ABC_LABEL_GAP_X, 0.03, z + ABC_LABEL_GAP_Z);
    g.add(labR);
  }

  // numerotare 1..10 (din 1 în 1) pe A (sus) și C (jos)
  for (let col = 1; col <= 10; col++) {
  const xNum = ABC_BASE_X - (col - 0.5) * STEP;

  const label = 11 - col; // 10, 9, 8 … 1

  const nA = makePaintedText(String(label), { size: 1.2 });
  nA.position.set(xNum, 0.03, ABC_ROW_Z.A + 1.6);
  g.add(nA);

  const nC = makePaintedText(String(label), { size: 1.2 });
  nC.position.set(xNum, 0.03, ABC_ROW_Z.C - 1.6);
  g.add(nC);
}

  /* ======================= DEF ======================= */

  for (const key of ['D', 'E', 'F']) {
    const x = DEF_COL_X[key];

    // 7 sloturi pe verticală
    for (let r = 1; r <= 7; r++) {
      const zCenter = START_Z_DEF + (r - 0.5) * STEP;
      g.add(paintSlot({ x, z: zCenter, along: 'Z' }));
    }

    // litera coloanei, imediat înainte de primul slot
    const lab = makePaintedText(key, { size: 2.0 });
    lab.position.set(x, 0.03, START_Z_DEF - DEF_LABEL_GAP_Z);
    g.add(lab);
  }

  // numerotare 1..7 (din 1 în 1) pe interiorul curții, lângă D
  for (let r = 1; r <= 7; r++) {
    const n = makePaintedText(String(r), { size: 1.2 });
    n.position.set(DEF_COL_X.D - D_NUMBERS_GAP_X, 0.03, START_Z_DEF + (r - 0.5) * STEP);
    g.add(n);
  }

  return g;
}