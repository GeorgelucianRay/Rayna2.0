import * as THREE from 'three';

/* aceleași constante ca în containersLayer */
const SLOT_LEN = 6.06;
const SLOT_GAP = 0.08;
const STEP = SLOT_LEN + SLOT_GAP;
const SLOT_W = 2.60;

const ROW_Z = { A:-4.0, B:-6.8, C:-9.6 };
const COL_X = { D:+4.0, E:+6.8, F:+9.6 };
const START_Z_DEF = ROW_Z.C + STEP * 0.5;

/* text „vopsit” pe asfalt */
function makePaintedText(text, { size=1.6, color='#cbd5e1' } = {}) {
  const c = document.createElement('canvas'); const s = 256; c.width=c.height=s;
  const ctx = c.getContext('2d'); ctx.clearRect(0,0,s,s);
  ctx.fillStyle=color; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font=`bold ${Math.floor(s*0.7)}px sans-serif`; ctx.fillText(text,s/2,s/2);
  const tex = new THREE.CanvasTexture(c); tex.anisotropy=4; tex.colorSpace=THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent:true, depthWrite:false });
  const geo = new THREE.PlaneGeometry(size,size);
  const m = new THREE.Mesh(geo,mat); m.rotation.x=-Math.PI/2; m.position.y=0.03; return m;
}

function paintSlotRect({ x=0, z=0, along='X' }) {
  const wX = (along==='X') ? STEP : SLOT_W;
  const wZ = (along==='X') ? SLOT_W : STEP;
  const geo = new THREE.PlaneGeometry(wX,wZ);
  const fill = new THREE.MeshBasicMaterial({ color:0xe5e7eb, transparent:true, opacity:.55, side:THREE.DoubleSide, depthWrite:false });
  const m = new THREE.Mesh(geo,fill); m.rotation.x=-Math.PI/2; m.position.set(x,0.02,z);
  const edges = new THREE.EdgesGeometry(geo);
  const line = new THREE.LineSegments(edges,new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:.7 }));
  line.rotation.x=-Math.PI/2; line.position.copy(m.position);
  const g=new THREE.Group(); g.add(m,line); return g;
}

export default function createGround({ width=300, depth=180, color=0x9aa0a6 } = {}) {
  const g = new THREE.Group();

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness:.95, metalness:.02 })
  );
  plane.rotation.x = -Math.PI/2; g.add(plane);

  // ABC: 3 rânduri x 10 sloturi
  for (const row of ['A','B','C']) {
    const z = ROW_Z[row];
    for (let col=1; col<=10; col++) {
      const xCenter = -((col - 0.5) * STEP);
      g.add(paintSlotRect({ x:xCenter, z, along:'X' }));
    }
    const label = makePaintedText(row, { size:2.0 });
    label.position.set(-(10.8*STEP), 0.03, z);
    g.add(label);
  }
  // numerotare 1..10 (din 2 în 2)
  for (let col=1; col<=10; col+=2) {
    const n = makePaintedText(String(col), { size:1.4 });
    n.position.set(-((col-0.5)*STEP), 0.03, ROW_Z.C - 2.2);
    g.add(n);
  }

  // DEF: 3 coloane x 7 sloturi (vertical)
  for (const key of ['D','E','F']) {
    const x = COL_X[key];
    for (let r=1; r<=7; r++) {
      const zCenter = START_Z_DEF + (r - 0.5) * STEP - STEP*0.5;
      g.add(paintSlotRect({ x, z:zCenter, along:'Z' }));
    }
    const label = makePaintedText(key, { size:2.0 });
    label.position.set(x, 0.03, START_Z_DEF - 2.2);
    g.add(label);
  }
  for (let r=1; r<=7; r+=2) {
    const n = makePaintedText(String(r), { size:1.4 });
    n.position.set(COL_X.F + 2.2, 0.03, START_Z_DEF + (r - 0.5) * STEP - STEP*0.5);
    g.add(n);
  }

  return g;
}