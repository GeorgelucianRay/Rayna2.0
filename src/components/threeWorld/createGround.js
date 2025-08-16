// src/components/threeWorld/createGround.js
import * as THREE from 'three';

/* slot 20’ sincronizat cu containerele */
const SLOT_LEN = 6.06;   // lungime 20'
const SLOT_W   = 2.44;   // lățime container
const SLOT_GAP = 0.06;   // ~6cm
const STEP     = SLOT_LEN + SLOT_GAP; // ~6.12m

/* text “vopsit” 2D pe asfalt */
function makePaintedText(text, { size = 1.6, color = '#e5e7eb', opacity = 0.75 } = {}) {
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
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const geo = new THREE.PlaneGeometry(size, size);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  return m;
}

/* slot pictat */
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
 * Creează asfalt + MARCAJE ABC/DEF aliniate la capetele curții.
 * anchor: 'south' → banda A aproape de marginea de jos (-depth/2 + edgePadding)
 *         'north' → banda A aproape de marginea de sus (+depth/2 - edgePadding)
 */
export default function createGround({
  width = 90,           // ↔ lățime curte (X)
  depth = 60,           // ↕ lungime curte (Z)
  color = 0x9aa0a6,
  anchor = 'south',     // 'south' | 'north'
  edgePadding = 3.0,    // distanța de la margine până la banda A
  abcOffsetX = 0,       // deplasare orizontală ABC
  defOffsetX = 8,       // deplasare orizontală DEF
  abcToDefGap = -9.0,   // distanța pe Z între ABC și DEF (culoar; negativ = DEF mai jos)
} = {}) {
  const g = new THREE.Group();

  // ASFALT
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.02 })
  );
  plane.rotation.x = -Math.PI / 2;
  g.add(plane);

  // Poziționăm banda A lângă “capătul” curții
  const halfZ = depth / 2;
  let ABC_BASE_Z;
  if (anchor === 'south') {
    ABC_BASE_Z = -halfZ + edgePadding;      // jos
  } else {
    ABC_BASE_Z =  halfZ - edgePadding;      // sus
  }

  const ABC_ROW_Z = {
    A: ABC_BASE_Z,
    B: ABC_BASE_Z - (SLOT_W + 0.10),
    C: ABC_BASE_Z - 2 * (SLOT_W + 0.10),
  };

  const START_Z_DEF = ABC_ROW_Z.C + abcToDefGap;

  const ABC_BASE_X = 0 + abcOffsetX;
  const DEF_BASE_X = 4.0 + defOffsetX;
  const DEF_COL_X = {
    D: DEF_BASE_X,
    E: DEF_BASE_X + (SLOT_W + 0.10),
    F: DEF_BASE_X + 2 * (SLOT_W + 0.10),
  };

  // ABC: 3 benzi × 10 sloturi
  for (const row of ['A', 'B', 'C']) {
    const z = ABC_ROW_Z[row];
    for (let col = 1; col <= 10; col++) {
      const xCenter = ABC_BASE_X - (col - 0.5) * STEP; // către stânga
      g.add(paintSlot({ x: xCenter, z, along: 'X' }));
    }
    const label = makePaintedText(row, { size: 2.0 });
    label.position.set(ABC_BASE_X - 10.8 * STEP, 0.03, z);
    g.add(label);
  }
  for (let col = 1; col <= 10; col += 2) {
    const n = makePaintedText(String(col), { size: 1.2 });
    n.position.set(ABC_BASE_X - (col - 0.5) * STEP, 0.03, ABC_ROW_Z.C - 1.6);
    g.add(n);
  }

  // DEF: 3 coloane × 7 sloturi (verticale)
  for (const key of ['D', 'E', 'F']) {
    const x = DEF_COL_X[key];
    for (let r = 1; r <= 7; r++) {
      const zCenter = START_Z_DEF + (r - 0.5) * STEP; // în jos (Z+)
      g.add(paintSlot({ x, z: zCenter, along: 'Z' }));
    }
    const label = makePaintedText(key, { size: 2.0 });
    label.position.set(x, 0.03, START_Z_DEF - 1.6);
    g.add(label);
  }
  for (let r = 1; r <= 7; r += 2) {
    const n = makePaintedText(String(r), { size: 1.2 });
    n.position.set(DEF_COL_X.F + 1.6, 0.03, START_Z_DEF + (r - 0.5) * STEP);
    g.add(n);
  }

  return g;
}