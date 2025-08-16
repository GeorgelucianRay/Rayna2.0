import * as THREE from 'three';

/** ——— constante sincronizate cu createContainersLayer ——— */
const SLOT_LEN = 6.06;           // lungime slot 20'
const SLOT_W   = 2.44;           // lățime container
const SLOT_GAP = 0.06;           // ~6cm – aproape lipite
const STEP     = SLOT_LEN + SLOT_GAP;

/* pozițiile benzilor (z pentru ABC, x pentru DEF) – aproape lipite */
const ROW_Z = { A: -4.00, B: -4.00 - (SLOT_W + 0.10), C: -4.00 - 2*(SLOT_W + 0.10) };
const COL_X = { D:  +4.00, E:  +4.00 + (SLOT_W + 0.10), F:  +4.00 + 2*(SLOT_W + 0.10) };

/* DEF pornește imediat după C, pe Z pozitiv (vertical) */
const START_Z_DEF = ROW_Z.C + STEP * 0.50;

/* text „vopsit” pe asfalt (plane cu canvas) */
function makePaintedText(text, { size = 1.6, color = '#e5e7eb', opacity = 0.75 } = {}) {
  const c = document.createElement('canvas'); const S = 256; c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,S,S);
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
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

/* un slot pictat (alb subtil), fără contururi groase */
function paintSlot({ x = 0, z = 0, along = 'X' }) {
  const sizeX = (along === 'X') ? STEP : SLOT_W;
  const sizeZ = (along === 'X') ? SLOT_W : STEP;

  const geo = new THREE.PlaneGeometry(sizeX, sizeZ);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.25,              // „vopsea” discretă
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  return m;
}

export default function createGround({ width = 300, depth = 180, color = 0x9aa0a6 } = {}) {
  const g = new THREE.Group();

  // asfalt neted
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.02 })
  );
  plane.rotation.x = -Math.PI / 2;
  g.add(plane);

  /** ——— ABC: 3 benzi lipite, 10 sloturi fiecare ——— */
  for (const row of ['A', 'B', 'C']) {
    const z = ROW_Z[row];
    for (let col = 1; col <= 10; col++) {
      const xCenter = -((col - 0.5) * STEP);      // spre stânga
      g.add(paintSlot({ x: xCenter, z, along: 'X' }));
    }
    // litera rândului
    const label = makePaintedText(row, { size: 2.0 });
    label.position.set(-(10.8 * STEP), 0.03, z);
    g.add(label);
  }
  // numerotare 1..10 (din 2 în 2) pe marginea C
  for (let col = 1; col <= 10; col += 2) {
    const n = makePaintedText(String(col), { size: 1.2 });
    n.position.set(-((col - 0.5) * STEP), 0.03, ROW_Z.C - 1.6);
    g.add(n);
  }

  /** ——— DEF: 3 coloane lipite, 7 sloturi pe verticală ——— */
  for (const key of ['D', 'E', 'F']) {
    const x = COL_X[key];
    for (let r = 1; r <= 7; r++) {
      const zCenter = START_Z_DEF + (r - 0.5) * STEP - STEP * 0.5;
      g.add(paintSlot({ x, z: zCenter, along: 'Z' }));
    }
    // litera coloanei
    const label = makePaintedText(key, { size: 2.0 });
    label.position.set(x, 0.03, START_Z_DEF - 1.6);
    g.add(label);
  }
  // numerotare 1..7 (din 2 în 2) lângă F
  for (let r = 1; r <= 7; r += 2) {
    const n = makePaintedText(String(r), { size: 1.2 });
    n.position.set(COL_X.F + 1.6, 0.03, START_Z_DEF + (r - 0.5) * STEP - STEP * 0.5);
    g.add(n);
  }

  return g;
}