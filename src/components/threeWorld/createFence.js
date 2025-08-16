// src/components/threeWorld/createFence.js
import * as THREE from 'three';

export default function createFence({
  width = 80,     // ↔ interior gard (X)
  depth = 50,     // ↕ interior gard (Z)
  postEvery = 10,
  gate = { side: 'south', width: 8, centerX: 0 } // side: 'south'|'north'|'west'|'east'
} = {}) {
  const g = new THREE.Group();
  const w = width / 2;
  const d = depth / 2;

  const postMat = new THREE.MeshStandardMaterial({ color: 0x9aaabc, metalness: 0.15, roughness: 0.8 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xa7b4c8, metalness: 0.15, roughness: 0.8 });
  const postGeo = new THREE.BoxGeometry(0.22, 1.8, 0.22);

  const addPost = (x, z) => {
    const p = new THREE.Mesh(postGeo, postMat);
    p.position.set(x, 0.9, z);
    g.add(p);
  };

  // helper: rail orizontal cu „gol” pentru poartă pe o latură
  const addHorizontalRail = (z, side) => {
    if (gate.side === side) {
      const gapHalf = gate.width / 2;
      // stânga segment
      const leftLen = (w - (-w)) / 2 + (gate.centerX - gapHalf) / 2 + w;
      const left = new THREE.Mesh(new THREE.BoxGeometry((gate.centerX - gapHalf) - (-w), 0.1, 0.1), railMat);
      left.position.set((-w + (gate.centerX - gapHalf)) / 2, 1.5, z);
      g.add(left);
      // dreapta segment
      const right = new THREE.Mesh(new THREE.BoxGeometry((w) - (gate.centerX + gapHalf), 0.1, 0.1), railMat);
      right.position.set((gate.centerX + gapHalf + w) / 2, 1.5, z);
      g.add(right);
    } else {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, 0.1), railMat);
      rail.position.set(0, 1.5, z);
      g.add(rail);
    }
  };

  const addHorizontalRailMid = (z, side) => {
    if (gate.side === side) {
      const gapHalf = gate.width / 2;
      const left = new THREE.Mesh(new THREE.BoxGeometry((gate.centerX - gapHalf) - (-w), 0.1, 0.1), railMat);
      left.position.set((-w + (gate.centerX - gapHalf)) / 2, 0.8, z);
      g.add(left);
      const right = new THREE.Mesh(new THREE.BoxGeometry((w) - (gate.centerX + gapHalf), 0.1, 0.1), railMat);
      right.position.set((gate.centerX + gapHalf + w) / 2, 0.8, z);
      g.add(right);
    } else {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, 0.1), railMat);
      rail.position.set(0, 0.8, z);
      g.add(rail);
    }
  };

  // stâlpi perimetru
  for (let x = -w; x <= w; x += postEvery) { addPost(x, -d); addPost(x, d); }
  for (let z = -d; z <= d; z += postEvery) { addPost(-w, z); addPost(w, z); }

  // traverse orizontale + mijloc (sus/jos)
  addHorizontalRail(-d, 'south');
  addHorizontalRail(d, 'north');
  addHorizontalRailMid(-d, 'south');
  addHorizontalRailMid(d, 'north');

  // laterale (est/vest) – fără poartă
  const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, depth), railMat);
  sideRail.position.set(-w, 1.5, 0); g.add(sideRail.clone());
  sideRail.position.set(-w, 0.8, 0); g.add(sideRail.clone());
  const sideRailR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, depth), railMat);
  sideRailR.position.set(w, 1.5, 0); g.add(sideRailR.clone());
  sideRailR.position.set(w, 0.8, 0); g.add(sideRailR.clone());

  return g;
}