// src/components/threeWorld/createGround.js
import * as THREE from 'three';

/** ——— dimensiuni sincronizate cu containerele ——— */
const SLOT_LEN = 6.06;        // lungime slot 20'
const SLOT_W   = 2.44;        // lățime container
const SLOT_GAP = 0.06;        // ~6cm între benzi (aproape lipite)
const STEP     = SLOT_LEN + SLOT_GAP;

/** ——— poziția grupului ABC (lipite între ele) ——— */
const ABC_BASE_Z = -4.0;      // unde plasăm rândul A; B și C sunt deduse
const ABC_ROW_Z = {
  A: ABC_BASE_Z,
  B: ABC_BASE_Z - (SLOT_W + 0.10),
  C: ABC_BASE_Z - 2 * (SLOT_W + 0.10),
};

/** ——— culoarul mare + poziția blocului DEF „jos” ca un T ———
 * Poți regla doar ABC_TO_DEF_GAP dacă vrei și mai mare/mic.
 */
const ABC_TO_DEF_GAP = 22.0;  // <<< lățimea culoarului (metri) dintre ABC și DEF
const START_Z_DEF = ABC_ROW_Z.C + ABC_TO_DEF_GAP;

/** ——— coloanele DEF (lipite între ele) ——— */
const DEF_BASE_X = +4.0;
const DEF_COL_X = {
  D: DEF_BASE_X,
  E: DEF_BASE_X + (SLOT_W + 0.10),
  F: DEF_BASE_X + 2 * (SLOT_W + 0.10),
};

/** text „vopsit” pe asfalt (plane + canvas) */
function makePaintedText(text, { size = 1.6, color = '#e5e7eb', opacity = 0.75 } = {}) {
  const c = document.createElement('canvas'); const S = 256; c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,S,S);
  ctx.fillStyle = color; ctx.globalAlpha = opacity;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(S*0.7)}px sans-serif`;
  ctx.fillText(text, S/2, S/2);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4; tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const geo = new THREE.PlaneGeometry(size, size);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  return m;
}

/** un slot pictat (alb subtil), fără contur gros */
function paintSlot({ x = 0, z = 0, along = 'X' }) {
  const sizeX = (along === 'X') ? STEP : SLOT_W;
  const sizeZ = (along === 'X') ? SLOT_W : STEP;

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

export default function createGround({ width = 300, depth = 180, color = 0x9aa0a6 } = {}) {
  const g = new THREE.Group();

  // asfalt
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.02 })
  );
  plane.rotation.x = -Math.PI / 2;
  g.add(plane);

  /** ——— ABC: 3 benzi lipite, 10 sloturi fiecare ——— */
  for (const row of ['A', 'B', 'C']) {
    const z = ABC_ROW_Z[row];
    for (let col = 1; col <= 10; col++) {
      const xCenter = -((col - 0.5) * STEP); // spre stânga
      g.add(paintSlot({ x: xCenter, z, along: 'X' }));
    }
    // litera rândului
    const label = makePaintedText(row, { size: 2.0 });
    label.position.set(-(10.8 * STEP), 0.03, z);
    g.add(label);
  }
  // numerotare 1..10 (din 2 în 2) jos pe C
  for (let col = 1; col <= 10; col += 2) {
    const n = makePaintedText(String(col), { size: 1.2 });
    n.position.set(-((col - 0.5) * STEP), 0.03, ABC_ROW_Z.C - 1.6);
    g.add(n);
  }

  /** ——— DEF: 3 coloane lipite, 7 sloturi „mai jos” (T) ——— */
  for (const key of ['D', 'E', 'F']) {
    const x = DEF_COL_X[key];
    for (let r = 1; r <= 7; r++) {
      const zCenter = START_Z_DEF + (r - 0.5) * STEP; // merge în jos (Z+)
      g.add(paintSlot({ x, z: zCenter, along: 'Z' }));
    }
    const label = makePaintedText(key, { size: 2.0 });
    label.position.set(x, 0.03, START_Z_DEF - 1.6);
    g.add(label);
  }
  // numerotare 1..7 (din 2 în 2) la dreapta lângă F
  for (let r = 1; r <= 7; r += 2) {
    const n = makePaintedText(String(r), { size: 1.2 });
    n.position.set(DEF_COL_X.F + 1.6, 0.03, START_Z_DEF + (r - 0.5) * STEP);
    g.add(n);
  }

  return g;
}