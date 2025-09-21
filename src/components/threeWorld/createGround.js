import * as THREE from 'three';

/** dimensiuni slot (sincron cu containerele) */
const SLOT_LEN = 6.06;   // 20'
const SLOT_W   = 2.44;
const SLOT_GAP = 0.06;
const STEP     = SLOT_LEN + SLOT_GAP;

/** utilitare “vopsea” pe asfalt */
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
 * Asfaltul + marcaje.
 * Poți suprascrie din pagina 3D: width, depth, abcOffsetX, defOffsetX, abcToDefGap.
 */
export default function createGround({
  width = 120,        // lățimea curții (X) – am mărit
  depth = 95,         // lungimea curții (Z) – am mărit
  color = 0x2b2f33,   // gri închis
  // repoziționări ca să iasă ca în screenshot:
  abcOffsetX = -18,   // banda ABC mai spre stânga
  defOffsetX = 16,    // DEF mai aproape de ABC
  abcToDefGap = 8,    // mult mai aproape între blocuri
} = {}) {
  const g = new THREE.Group();

  // ASFALT
  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.96, metalness: 0.02 })
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.receiveShadow = true;
  g.add(asphalt);

  // ABC – orizontal
  const ABC_BASE_Z = -3.0; // puțin mai sus pe scenă
  const ROW_GAP = 0.10;
  const ABC_ROW_Z = {
    A: ABC_BASE_Z,
    B: ABC_BASE_Z - (SLOT_W + ROW_GAP),
    C: ABC_BASE_Z - 2 * (SLOT_W + ROW_GAP),
  };

  // DEF – vertical (T), mai jos pe Z
  const START_Z_DEF = ABC_ROW_Z.C + abcToDefGap;

  // poziții X pentru ABC și DEF
  const ABC_BASE_X = abcOffsetX;
  const DEF_BASE_X = 4.0 + defOffsetX;
  const DEF_COL_X = {
    D: DEF_BASE_X,
    E: DEF_BASE_X + (SLOT_W + ROW_GAP),
    F: DEF_BASE_X + 2 * (SLOT_W + ROW_GAP),
  };

  /* ========== ABC (10 sloturi/orizontal) ========== */
  for (const row of ['A', 'B', 'C']) {
    const z = ABC_ROW_Z[row];

    for (let col = 1; col <= 10; col++) {
      const xCenter = ABC_BASE_X - (col - 0.5) * STEP; // 1..10 spre stânga
      g.add(paintSlot({ x: xCenter, z, along: 'X' }));
    }

    // litere la capete
    const xLeftEdge  = ABC_BASE_X - 10 * STEP;
    const xRightEdge = ABC_BASE_X;
    const labL = makePaintedText(row, { size: 1.8 });
    labL.position.set(xLeftEdge - 0.6, 0.03, z);
    g.add(labL);
    const labR = makePaintedText(row, { size: 1.8 });
    labR.position.set(xRightEdge + 0.6, 0.03, z);
    g.add(labR);
  }

  // numerotare 10…1 pe A (sus) și C (jos)
  for (let col = 1; col <= 10; col++) {
    const xNum = ABC_BASE_X - (col - 0.5) * STEP;
    const label = 11 - col; // 10,9,...,1
    const nA = makePaintedText(String(label), { size: 1.05 });
    nA.position.set(xNum, 0.03, ABC_ROW_Z.A + 1.4);
    g.add(nA);
    const nC = makePaintedText(String(label), { size: 1.05 });
    nC.position.set(xNum, 0.03, ABC_ROW_Z.C - 1.4);
    g.add(nC);
  }

  /* ========== DEF (7 sloturi/vertical) ========== */
  for (const key of ['D', 'E', 'F']) {
    const x = DEF_COL_X[key];
    for (let r = 1; r <= 7; r++) {
      const zCenter = START_Z_DEF + (r - 0.5) * STEP;
      g.add(paintSlot({ x, z: zCenter, along: 'Z' }));
    }
    // litera coloanei, chiar înainte de primul slot
    const lab = makePaintedText(key, { size: 1.8 });
    lab.position.set(x, 0.03, START_Z_DEF - 0.8);
    g.add(lab);
  }

  // numerotare 1..7 pe interiorul curții (lângă D)
  for (let r = 1; r <= 7; r++) {
    const n = makePaintedText(String(r), { size: 1.05 });
    n.position.set(DEF_COL_X.D - 1.1, 0.03, START_Z_DEF + (r - 0.5) * STEP);
    g.add(n);
  }

  return g;
}