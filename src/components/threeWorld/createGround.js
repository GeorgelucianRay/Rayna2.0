// src/components/threeWorld/createGround.js
import * as THREE from 'three';

/* ——— aceeași unitate de slot ca în stratul de containere ——— */
const SLOT_LEN = 6.06;   // 20'
const SLOT_GAP = 0.20;
const STEP = SLOT_LEN + SLOT_GAP;
const SLOT_W = 2.60;     // lățime vizuală a marcajului pe Z/X (puțin > 2.44 ca să se vadă)

const ROW_Z = { A: -11, B: -17, C: -23 }; // pozițiile rândurilor ABC
const COL_X = { D: +11, E: +17, F: +23 }; // pozițiile coloanelor DEF

/* text „vopsit pe asfalt” dintr-un canvas */
function makePaintedText(text, { size = 1.6, color = '#cbd5e1' } = {}) {
  const canvas = document.createElement('canvas');
  const s = 256;
  canvas.width = canvas.height = s;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(s * 0.7)}px sans-serif`;
  ctx.fillText(text, s / 2, s / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const geo = new THREE.PlaneGeometry(size, size);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;  // culcat pe asfalt
  mesh.position.y = 0.03;
  return mesh;
}

/* un dreptunghi subțire „vopsit” (rame per slot) */
function paintSlotRect({ x = 0, z = 0, along = 'X' }) {
  const wX = (along === 'X') ? STEP : SLOT_W;
  const wZ = (along === 'X') ? SLOT_W : STEP;

  const geo = new THREE.PlaneGeometry(wX, wZ);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xe5e7eb,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);

  // contur subțire
  const edges = new THREE.EdgesGeometry(geo);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })
  );
  line.rotation.x = -Math.PI / 2;
  line.position.copy(m.position);

  const g = new THREE.Group();
  g.add(m, line);
  return g;
}

export default function createGround({
  width = 300, depth = 180, color = 0x9aa0a6
} = {}) {
  const g = new THREE.Group();

  // asfalt simplu
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.02 })
  );
  plane.rotation.x = -Math.PI / 2;
  g.add(plane);

  // ========== MARCAJE ABC (orizontal, 3 rânduri x 10 sloturi) ==========
  for (const row of ['A', 'B', 'C']) {
    const z = ROW_Z[row];
    for (let col = 1; col <= 10; col++) {
      const xCenter = -((col - 0.5) * STEP);     // spre stânga (negativ)
      g.add(paintSlotRect({ x: xCenter, z, along: 'X' }));
    }
    // litera rândului „vopsită” la capătul stâng
    const label = makePaintedText(row, { size: 2.2 });
    label.position.set(-(10.8 * STEP), 0.03, z);
    g.add(label);
  }

  // numere 1..10 lângă A (jos), din 2 în 2 ca să nu aglomerăm
  for (let col = 1; col <= 10; col++) {
    if (col % 2 === 1) {
      const xNum = -((col - 0.5) * STEP);
      const n = makePaintedText(String(col), { size: 1.6 });
      n.position.set(xNum, 0.03, ROW_Z.C - 3);
      g.add(n);
    }
  }

  // ========== MARCAJE DEF (vertical, 3 coloane x 7 sloturi) ==========
  for (const colKey of ['D', 'E', 'F']) {
    const x = COL_X[colKey];
    for (let rowIdx = 1; rowIdx <= 7; rowIdx++) {
      const zCenter = -23 + (rowIdx - 0.5) * STEP;  // 1..7 pe Z+
      g.add(paintSlotRect({ x, z: zCenter, along: 'Z' }));
    }
    // litera coloanei vopsită jos
    const label = makePaintedText(colKey, { size: 2.2 });
    label.position.set(x, 0.03, (-23 - 3));
    g.add(label);
  }

  // numere 1..7 la capătul de sus, din 2 în 2
  for (let r = 1; r <= 7; r++) {
    if (r % 2 === 1) {
      const zNum = -23 + (r - 0.5) * STEP;
      const n = makePaintedText(String(r), { size: 1.6 });
      n.position.set(COL_X.F + 3, 0.03, zNum);
      g.add(n);
    }
  }

  return g;
}