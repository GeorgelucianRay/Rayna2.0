import * as THREE from 'three';

// dimensiuni slot 20'
const SLOT_LEN = 6.06, SLOT_W = 2.44, SLOT_GAP = 0.06;
const STEP = SLOT_LEN + SLOT_GAP;

function textPaint(s, { size = 1.5, opacity = .8 } = {}) {
  const C = 256, cv = document.createElement('canvas'); cv.width = cv.height = C;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0,0,C,C);
  ctx.fillStyle = '#e5e7eb'; ctx.globalAlpha = opacity;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(C * .7)}px sans-serif`;
  ctx.fillText(s, C/2, C/2);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI/2; m.position.y = .03; return m;
}

function slot({ x, z, alongX }) {
  const w = alongX ? STEP : SLOT_W;
  const d = alongX ? SLOT_W : STEP;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .22, depthWrite: false }));
  m.rotation.x = -Math.PI/2; m.position.set(x, .02, z); return m;
}

/**
 * Creează asfalt centrat și marchează ABC (orizontal, 10 sloturi) + DEF (vertical, 7 sloturi).
 * - width/depth = dimensiuni asfalt
 * - abcX / defX = offset pe X al benzilor
 * - gapBetween  = distanța pe Z între ABC și începutul DEF
 */
export default function createGround({
  width = 90,
  depth = 80,
  color = 0x2b2f33,
  abcX = -18,
  defX = 16,
  gapBetween = 6,
  numbersReversed = true,
} = {}) {
  const g = new THREE.Group();

  // asfalt centrat la (0,0,0)
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness: .95, metalness: .02 })
  );
  plane.rotation.x = -Math.PI / 2;
  g.add(plane);

  // poziționare benzi
  const ABC_Z = { A: 8, B: 8 - (SLOT_W + .10), C: 8 - 2*(SLOT_W + .10) };
  const START_DEF_Z = ABC_Z.C + gapBetween;

  // ===== ABC (10 sloturi pe X) =====
  for (const row of ['A','B','C']) {
    const z = ABC_Z[row];
    for (let c = 1; c <= 10; c++) {
      const idx = numbersReversed ? (11 - c) : c;
      const x = abcX - (idx - .5) * STEP;
      g.add(slot({ x, z, alongX: true }));
    }
    const left = abcX - 10*STEP, right = abcX;
    const labL = textPaint(row, { size: 2.0 }); labL.position.set(left - .6, .03, z); g.add(labL);
    const labR = textPaint(row, { size: 2.0 }); labR.position.set(right + .6, .03, z); g.add(labR);
  }
  for (let c = 1; c <= 10; c++) {
    const idx = numbersReversed ? (11 - c) : c;
    const x = abcX - (idx - .5) * STEP;
    const nA = textPaint(String(idx), { size: 1.1 }); nA.position.set(x, .03, ABC_Z.A + 1.5); g.add(nA);
    const nC = textPaint(String(idx), { size: 1.1 }); nC.position.set(x, .03, ABC_Z.C - 1.5); g.add(nC);
  }

  // ===== DEF (7 sloturi pe Z) =====
  const DEF_X = { D: defX, E: defX + (SLOT_W + .10), F: defX + 2*(SLOT_W + .10) };

  for (const k of ['D','E','F']) {
    const x = DEF_X[k];
    for (let r = 1; r <= 7; r++) {
      const z = START_DEF_Z + (r - .5) * STEP;
      g.add(slot({ x, z, alongX: false }));
    }
    const lab = textPaint(k, { size: 2.0 }); lab.position.set(x, .03, START_DEF_Z - .8); g.add(lab);
  }
  for (let r = 1; r <= 7; r++) {
    const t = textPaint(String(r), { size: 1.1 });
    t.position.set(DEF_X.D - 1.2, .03, START_DEF_Z + (r - .5) * STEP);
    g.add(t);
  }

  return g;
}