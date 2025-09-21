// src/components/threeWorld/createGround.js
import * as THREE from 'three';

/** slot geometry numbers */
const SLOT_LEN = 6.06;   // lungimea slotului (20')
const SLOT_W   = 2.44;   // lățimea containerului
const SLOT_GAP = 0.06;   // mic spațiu vizual
const STEP     = SLOT_LEN + SLOT_GAP;

/** desen text “vopsit” pe asfalt (canvas → texture) */
function paintedText(text, { size = 1.6, color = '#e5e7eb', opacity = 0.8 } = {}) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(S * 0.74)}px Inter, system-ui, Arial, sans-serif`;
  ctx.fillText(text, S / 2, S / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const geo = new THREE.PlaneGeometry(size, size);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  return mesh;
}

/** un “slot” alb subtil */
function slotMark({ x, z, along = 'X' }) {
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
 * Creează asfalt + marcaje ABC (orizontale) și DEF (verticale).
 *  - width/depth: dimensiunea plăcii de asfalt (centrată în 0,0)
 *  - abcOffsetX: coordonata X a capătului din DREAPTA al blocului ABC
 *  - defOffsetX: offset pentru D (DEF_BASE_X = 4.0 + defOffsetX)
 *  - abcToDefGap: distanța pe Z între C și începutul lui D
 */
export default function createGround({
  width = 90,
  depth = 95,
  color = 0x2b2f33,
  abcOffsetX = 43.5,
  defOffsetX = 34.42,
  abcToDefGap = 2.0,
} = {}) {
  const g = new THREE.Group();

  // ASFALT
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.02 })
  );
  plane.rotation.x = -Math.PI / 2;
  g.add(plane);

  // — ABC —
  const ABC_BASE_Z = -4.0;
  const ABC_ROW_Z = {
    A: ABC_BASE_Z,
    B: ABC_BASE_Z - (SLOT_W + 0.10),
    C: ABC_BASE_Z - 2 * (SLOT_W + 0.10),
  };

  // — DEF —
  const DEF_BASE_X = 4.0 + defOffsetX;
  const DEF_COL_X = {
    D: DEF_BASE_X,
    E: DEF_BASE_X + (SLOT_W + 0.10),
    F: DEF_BASE_X + 2 * (SLOT_W + 0.10),
  };
  const START_Z_DEF = ABC_ROW_Z.C + abcToDefGap;

  // — ABC: 10 sloturi pe X, numerotate 10..1 spre stânga —
  const ABC_LABEL_GAP_X = 0.6;
  const ABC_LABEL_GAP_Z = 0.0;

  for (const row of ['A', 'B', 'C']) {
    const z = ABC_ROW_Z[row];

    for (let col = 1; col <= 10; col++) {
      const xCenter = abcOffsetX - (col - 0.5) * STEP; // spre stânga
      g.add(slotMark({ x: xCenter, z, along: 'X' }));
    }

    // litere la capete
    const xLeftEdge = abcOffsetX - 10 * STEP;
    const labL = paintedText(row, { size: 2.0 });
    labL.position.set(xLeftEdge - ABC_LABEL_GAP_X, 0.03, z + ABC_LABEL_GAP_Z);
    g.add(labL);

    const xRightEdge = abcOffsetX;
    const labR = paintedText(row, { size: 2.0 });
    labR.position.set(xRightEdge + ABC_LABEL_GAP_X, 0.03, z + ABC_LABEL_GAP_Z);
    g.add(labR);
  }

  // numerotare 10..1 pe A (sus) și C (jos)
  for (let col = 1; col <= 10; col++) {
    const xNum = abcOffsetX - (col - 0.5) * STEP;
    const label = 11 - col;

    const nA = paintedText(String(label), { size: 1.2 });
    nA.position.set(xNum, 0.03, ABC_ROW_Z.A + 1.6);
    g.add(nA);

    const nC = paintedText(String(label), { size: 1.2 });
    nC.position.set(xNum, 0.03, ABC_ROW_Z.C - 1.6);
    g.add(nC);
  }

  // — DEF: 7 sloturi pe Z —
  const DEF_LABEL_GAP_Z = 0.8;
  const D_NUMBERS_GAP_X = 1.2;

  for (const key of ['D', 'E', 'F']) {
    const x = DEF_COL_X[key];

    for (let r = 1; r <= 7; r++) {
      const zCenter = START_Z_DEF + (r - 0.5) * STEP;
      g.add(slotMark({ x, z: zCenter, along: 'Z' }));
    }

    // litera coloanei
    const lab = paintedText(key, { size: 2.0 });
    lab.position.set(x, 0.03, START_Z_DEF - DEF_LABEL_GAP_Z);
    g.add(lab);
  }

  // numerotare 1..7 lângă D
  for (let r = 1; r <= 7; r++) {
    const n = paintedText(String(r), { size: 1.2 });
    n.position.set(DEF_COL_X.D - D_NUMBERS_GAP_X, 0.03, START_Z_DEF + (r - 0.5) * STEP);
    g.add(n);
  }

  return g;
}