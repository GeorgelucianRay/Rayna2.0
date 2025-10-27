// src/components/depot/map/threeWorld/createGround.js
import * as THREE from 'three';

const SLOT_LEN = 6.06, SLOT_W = 2.44, SLOT_GAP = 0.06, STEP = SLOT_LEN + SLOT_GAP;
const ABC_LABEL_GAP_X = 0.6, ABC_LABEL_GAP_Z = 0.0, DEF_LABEL_GAP_Z = 0.8, D_NUMBERS_GAP_X = 1.2;

function makePaintedText(text, { size = 1.6, color = '#e5e7eb', opacity = 0.8 } = {}) {
  const S = 256;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,S,S); ctx.fillStyle = color; ctx.globalAlpha = opacity;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${Math.floor(S*0.7)}px sans-serif`;
  ctx.fillText(text, S/2, S/2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const geo = new THREE.PlaneGeometry(size, size);
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI/2; m.position.y = 0.03; return m;
}

function paintSlot({ x = 0, z = 0, along = 'X' }) {
  const sizeX = along === 'X' ? STEP : SLOT_W;
  const sizeZ = along === 'X' ? SLOT_W : STEP;
  const geo = new THREE.PlaneGeometry(sizeX, sizeZ);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.18,
    side: THREE.DoubleSide, depthWrite: false
  });
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI/2; m.position.set(x, 0.02, z); return m;
}

export default function createGround({
  width = 90, depth = 60, color = 0x9aa0a6,
  abcOffsetX = 5 * STEP, defOffsetX = 32.3, abcToDefGap = -6.2
} = {}) {
  const g = new THREE.Group();

  // === placă asfalt (mesh-ul pe care facem raycast) ===
  const thickness = 0.5;
  const geo = new THREE.BoxGeometry(width, thickness, depth);
  geo.translate(0, -thickness / 2, 0);

  const asphaltTex = new THREE.TextureLoader().load('/textures/lume/asphalt_curte_textura.PNG');
  asphaltTex.colorSpace = THREE.SRGBColorSpace;
  asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping;
  asphaltTex.repeat.set(width / 6, depth / 6);

  const asphalt = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.95, metalness: 0.02 });
  const dirt    = new THREE.MeshStandardMaterial({ color: 0x6f7f49 });

  const slab = new THREE.Mesh(geo, [dirt, dirt, asphalt, dirt, dirt, dirt]);
  slab.name = 'groundSlab';
  slab.receiveShadow = true;
  g.add(slab);
  g.userData.groundMesh = slab;

  // <<< CHEIA: expunem mesh-ul principal pentru raycast din buildController
  g.userData.groundMesh = slab;

  // === marcaje ABC ===
  const ABC_BASE_Z = -4.0;
  const ABC_ROW_Z = {
    A: ABC_BASE_Z,
    B: ABC_BASE_Z - (SLOT_W + 0.10),
    C: ABC_BASE_Z - 2 * (SLOT_W + 0.10),
  };
  const START_Z_DEF = ABC_ROW_Z.C + abcToDefGap;
  const ABC_BASE_X = abcOffsetX;
  const DEF_BASE_X = 4.0 + defOffsetX;
  const DEF_COL_X = {
    D: DEF_BASE_X,
    E: DEF_BASE_X + (SLOT_W + 0.10),
    F: DEF_BASE_X + 2 * (SLOT_W + 0.10),
  };

  for (const row of ['A','B','C']) {
    const z = ABC_ROW_Z[row];
    for (let col = 1; col <= 10; col++) {
      g.add(paintSlot({ x: ABC_BASE_X - (col - 0.5) * STEP, z, along: 'X' }));
    }
    const xLeftEdge = ABC_BASE_X - 10 * STEP;
    const L = makePaintedText(row, { size: 2.0 }); L.position.set(xLeftEdge - ABC_LABEL_GAP_X, 0.03, z + ABC_LABEL_GAP_Z); g.add(L);
    const R = makePaintedText(row, { size: 2.0 }); R.position.set(ABC_BASE_X + ABC_LABEL_GAP_X, 0.03, z + ABC_LABEL_GAP_Z); g.add(R);
  }
  for (let col = 1; col <= 10; col++) {
    const xNum = ABC_BASE_X - (col - 0.5) * STEP;
    const label = 11 - col;
    const nA = makePaintedText(String(label), { size: 1.2 }); nA.position.set(xNum, 0.03, ABC_ROW_Z.A + 1.6); g.add(nA);
    const nC = makePaintedText(String(label), { size: 1.2 }); nC.position.set(xNum, 0.03, ABC_ROW_Z.C - 1.6); g.add(nC);
  }

  // === marcaje DEF ===
  for (const k of ['D','E','F']) {
    const x = DEF_COL_X[k];
    for (let r = 1; r <= 7; r++) {
      g.add(paintSlot({ x, z: START_Z_DEF + (r - 0.5) * STEP, along: 'Z' }));
    }
    const L = makePaintedText(k, { size: 2.0 }); L.position.set(x, 0.03, START_Z_DEF - DEF_LABEL_GAP_Z); g.add(L);
  }
  for (let r = 1; r <= 7; r++) {
    const n = makePaintedText(String(r), { size: 1.2 });
    n.position.set(DEF_COL_X.D - D_NUMBERS_GAP_X, 0.03, START_Z_DEF + (r - 0.5) * STEP);
    g.add(n);
  }

  return g;
}