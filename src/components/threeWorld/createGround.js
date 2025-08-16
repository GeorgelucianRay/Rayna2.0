// src/components/threeWorld/createGround.js
import * as THREE from 'three';

/** —— Dimensiuni slot sincronizate cu containerele —— */
const SLOT_LEN = 6.06;  // lungime slot 20'
const SLOT_W   = 2.44;  // lățime container
const SLOT_GAP = 0.06;  // ~6 cm între sloturi (vizual)
const STEP     = SLOT_LEN + SLOT_GAP;

/** Text “vopsit” pe asfalt (plane + canvas) */
function makePaintedText(
  text,
  { size = 1.6, color = '#e5e7eb', opacity = 0.8 } = {}
) {
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
  m.position.y = 0.03; // un pic peste asfalt ca să nu „fÂlfÂie”
  return m;
}

/** Un slot pictat (alb subtil) */
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
 * Creează asfaltul + marcajele ABC (orizontale) și DEF (verticale).
 *
 * Controlezi ușor din MapPage:
 *   createGround({
 *     width, depth, color,
 *     abcOffsetX, defOffsetX, abcToDefGap
 *   })
 */
export default function createGround({
  width = 90,            // ↔ lățimea curții (X)
  depth = 60,            // ↕ lungimea curții (Z)
  color = 0x9aa0a6,
  abcOffsetX = -10,      // mută tot blocul ABC pe X
  defOffsetX = 32,       // mută tot blocul DEF pe X
  abcToDefGap = 16,      // distanța pe Z dintre ABC și DEF (culoarul mare)
} = {}) {
  const g = new THREE.Group();

  // —— ASFALT ——
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.02 })
  );
  plane.rotation.x = -Math.PI / 2;
  g.add(plane);

  // —— ABC: poziții pe Z (lipite între ele) ——
  const ABC_BASE_Z = -4.0;
  const ABC_ROW_Z = {
    A: ABC_BASE_Z,
    B: ABC_BASE_Z - (SLOT_W + 0.10),
    C: ABC_BASE_Z - 2 * (SLOT_W + 0.10),
  };

  // —— DEF: începe „mai jos” pe Z ca să formeze un T cu ABC ——
  const START_Z_DEF = ABC_ROW_Z.C + abcToDefGap;

  // —— Poziții pe X (cu offset-uri) ——
  const ABC_BASE_X = 0 + abcOffsetX;
  const DEF_BASE_X = +4.0 + defOffsetX;
  const DEF_COL_X = {
    D: DEF_BASE_X,
    E: DEF_BASE_X + (SLOT_W + 0.10),
    F: DEF_BASE_X + 2 * (SLOT_W + 0.10),
  };

  // =========================================================
  //                        A B C
  // =========================================================

  // 3 benzi × 10 sloturi
  for (const row of ['A', 'B', 'C']) {
    const z = ABC_ROW_Z[row];
    for (let col = 1; col <= 10; col++) {
      const xCenter = ABC_BASE_X - (col - 0.5) * STEP; // spre stânga
      g.add(paintSlot({ x: xCenter, z, along: 'X' }));
    }

    // Litera rândului la AMBELE capete (stânga & dreapta)
    const labelLeft = makePaintedText(row, { size: 2.0 });
    labelLeft.position.set(ABC_BASE_X - 10.8 * STEP, 0.03, z);
    g.add(labelLeft);

    const labelRight = makePaintedText(row, { size: 2.0 });
    // capătul din dreapta (începutul rândului)
    labelRight.position.set(ABC_BASE_X + 1.2 * STEP, 0.03, z);
    g.add(labelRight);
  }

  // Numerotare 1..10 din 1 în 1 — pe A și C (ambele capete vizuale ale blocului)
  for (let col = 1; col <= 10; col++) {
    const xNum = ABC_BASE_X - (col - 0.5) * STEP;

    // pe banda A (deasupra)
    const nA = makePaintedText(String(col), { size: 1.2 });
    nA.position.set(xNum, 0.03, ABC_ROW_Z.A + 1.6);
    g.add(nA);

    // pe banda C (jos)
    const nC = makePaintedText(String(col), { size: 1.2 });
    nC.position.set(xNum, 0.03, ABC_ROW_Z.C - 1.6);
    g.add(nC);
  }

  // =========================================================
  //                        D E F
  // =========================================================

  for (const key of ['D', 'E', 'F']) {
    const x = DEF_COL_X[key];

    // 7 sloturi vertical (pe Z)
    for (let r = 1; r <= 7; r++) {
      const zCenter = START_Z_DEF + (r - 0.5) * STEP;
      g.add(paintSlot({ x, z: zCenter, along: 'Z' }));
    }

    // Litera coloanei (sus, înainte de primul slot)
    const labelCol = makePaintedText(key, { size: 2.0 });
    labelCol.position.set(x, 0.03, START_Z_DEF - 1.6);
    g.add(labelCol);
  }

  // Numerotare 1..7 din 1 în 1 — DOAR pe coloana D, pe interiorul curții
  for (let r = 1; r <= 7; r++) {
    const n = makePaintedText(String(r), { size: 1.2 });
    // poziționăm cifra la stânga coloanei D (spre interior)
    n.position.set(DEF_COL_X.D - 1.4, 0.03, START_Z_DEF + (r - 0.5) * STEP);
    g.add(n);
  }

  return g;
}