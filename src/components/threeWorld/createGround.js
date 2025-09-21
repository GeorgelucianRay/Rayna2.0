import * as THREE from 'three';

const SLOT_LEN = 6.06;   // 20'
const SLOT_W   = 2.44;
const SLOT_GAP = 0.06;
const STEP     = SLOT_LEN + SLOT_GAP;

function paintText(text,{size=1.6,color='#e5e7eb',opacity=.8}={}) {
  const S=256, c=document.createElement('canvas'); c.width=c.height=S;
  const ctx=c.getContext('2d');
  ctx.clearRect(0,0,S,S); ctx.fillStyle=color; ctx.globalAlpha=opacity;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font=`bold ${Math.floor(S*.7)}px sans-serif`; ctx.fillText(text,S/2,S/2);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=4;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),
    new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.position.y=.03; return m;
}

function paintSlot({x=0,z=0, along='X'}) {
  const sx = along==='X' ? STEP  : SLOT_W;
  const sz = along==='X' ? SLOT_W: STEP;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(sx,sz),
    new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.24,side:THREE.DoubleSide,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.position.set(x,.02,z); return m;
}

/**
 * Auto-dimensionează asfaltul ca să includă PERFECT benzile ABC (10) + DEF (7)
 * și să nu mai iasă nimic în afară. Poți regla:
 *  - gapBetween: distanța pe Z dintre ABC și DEF (mai mic = mai aproape)
 *  - margin: marginea liberă a asfaltului în jurul marcajelor
 */
export default function createGround({
  color = 0x2b2f33,
  gapBetween = 5.5,
  margin = 6,
  abcNumbersReversed = true
} = {}) {
  const g = new THREE.Group();

  // poziții benzilor
  const ABC_BASE_Z = -4.0;
  const ABC_ROW_Z = {
    A: ABC_BASE_Z,
    B: ABC_BASE_Z - (SLOT_W + 0.10),
    C: ABC_BASE_Z - 2*(SLOT_W + 0.10),
  };
  const ABC_BASE_X = 0;

  const START_Z_DEF = ABC_ROW_Z.C + gapBetween;
  const DEF_BASE_X  = 10 * STEP * -0.25 + 9; // mică “tragere” spre centru
  const DEF_COL_X = {
    D: DEF_BASE_X,
    E: DEF_BASE_X + (SLOT_W + 0.10),
    F: DEF_BASE_X + 2*(SLOT_W + 0.10),
  };

  // --- EXTENTE reale ale marcajelor (fără margini) ---
  const abcXmin = ABC_BASE_X - 10*STEP - 1.2; // + puțin spațiu pentru litere
  const abcXmax = ABC_BASE_X + 1.2;
  const defXmin = DEF_COL_X.D - SLOT_W/2 - 1.0;
  const defXmax = DEF_COL_X.F + SLOT_W/2 + 1.0;

  const xMin = Math.min(abcXmin, defXmin) - margin;
  const xMax = Math.max(abcXmax, defXmax) + margin;

  const zMin = (ABC_ROW_Z.C - SLOT_W/2) - margin;
  const zMax = (START_Z_DEF + 7*STEP) + margin;

  const planeWidth  = xMax - xMin;
  const planeDepth  = zMax - zMin;
  const planeCenterX = (xMin + xMax) / 2;
  const planeCenterZ = (zMin + zMax) / 2;

  // --- ASFALT ---
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(planeWidth, planeDepth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.02 })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(planeCenterX, 0, planeCenterZ);
  g.add(plane);

  // ======= ABC (10 sloturi pe X) =======
  for (const row of ['A', 'B', 'C']) {
    const z = ABC_ROW_Z[row];
    for (let col = 1; col <= 10; col++) {
      const eff = abcNumbersReversed ? (11 - col) : col;
      const xCenter = ABC_BASE_X - (eff - 0.5) * STEP;
      g.add(paintSlot({ x: xCenter, z, along: 'X' }));
    }

    const leftEdge  = ABC_BASE_X - 10*STEP;
    const rightEdge = ABC_BASE_X;

    const labL = paintText(row, { size: 2.0 });
    labL.position.set(leftEdge - 0.6, 0.03, z);
    g.add(labL);

    const labR = paintText(row, { size: 2.0 });
    labR.position.set(rightEdge + 0.6, 0.03, z);
    g.add(labR);
  }

  // numerotare pe A și C (10..1 dacă e reversed)
  for (let col = 1; col <= 10; col++) {
    const eff = abcNumbersReversed ? (11 - col) : col;
    const xCenter = ABC_BASE_X - (eff - 0.5) * STEP;

    const nA = paintText(String(eff), { size: 1.15 });
    nA.position.set(xCenter, 0.03, ABC_ROW_Z.A + 1.55);
    g.add(nA);

    const nC = paintText(String(eff), { size: 1.15 });
    nC.position.set(xCenter, 0.03, ABC_ROW_Z.C - 1.55);
    g.add(nC);
  }

  // ======= DEF (7 sloturi pe Z) =======
  for (const key of ['D', 'E', 'F']) {
    const x = DEF_COL_X[key];

    for (let r = 1; r <= 7; r++) {
      const zCenter = START_Z_DEF + (r - 0.5) * STEP;
      g.add(paintSlot({ x, z: zCenter, along: 'Z' }));
    }

    const lab = paintText(key, { size: 2.0 });
    lab.position.set(x, 0.03, START_Z_DEF - 0.8);
    g.add(lab);
  }

  for (let r = 1; r <= 7; r++) {
    const n = paintText(String(r), { size: 1.15 });
    n.position.set(DEF_COL_X.D - 1.2, 0.03, START_Z_DEF + (r - 0.5) * STEP);
    g.add(n);
  }

  return g;
}