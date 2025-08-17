// src/components/threeWorld/createFence.js
import * as THREE from 'three';

/**
 * Creează gardul perimetral, cu opțiunea de a exclude o latură.
 */
export default function createFence({
  width = 80,
  depth = 50,
  postEvery = 10,
  excludeSide = null, // Opțiune nouă: 'north', 'south', 'east', 'west'
  gate = { side: 'south', width: 8, centerX: 0, centerZ: 0 },
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

  // --- Stâlpi --- (Am adăugat condiții pentru excludere)
  if (excludeSide !== 'south') { for (let x = -w; x <= w; x += postEvery) addPost(x, -d); }
  if (excludeSide !== 'north') { for (let x = -w; x <= w; x += postEvery) addPost(x, d); }
  if (excludeSide !== 'west') { for (let z = -d; z <= d; z += postEvery) addPost(-w, z); }
  if (excludeSide !== 'east') { for (let z = -d; z <= d; z += postEvery) addPost(w, z); }

  // --- Helperi pentru traverse ---
  const cutHorizontal = (z, y, side) => {
    if (excludeSide === side) return; // <-- NU desena traversa dacă latura e exclusă
    // ... restul funcției cutHorizontal rămâne la fel
    const cx = (gate.centerX ?? 0) + (gate.tweakX ?? 0);
    const half = (gate.width ?? 0) / 2;
    if (gate.side !== side) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, 0.1), railMat);
      rail.position.set(0, y, z);
      g.add(rail);
      return;
    }
    const leftLen  = Math.max(0.001, cx - half - (-w));
    const rightLen = Math.max(0.001, w - (cx + half));
    const left = new THREE.Mesh(new THREE.BoxGeometry(leftLen, 0.1, 0.1), railMat);
    left.position.set((-w + (cx - half)) / 2, y, z);
    g.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(rightLen, 0.1, 0.1), railMat);
    right.position.set((cx + half + w) / 2, y, z);
    g.add(right);
  };

  const cutVertical = (x, y, side) => {
    if (excludeSide === side) return; // <-- NU desena traversa dacă latura e exclusă
    // ... restul funcției cutVertical rămâne la fel
    const cz = (gate.centerZ ?? 0) + (gate.tweakZ ?? 0);
    const half = (gate.width ?? 0) / 2;
    if (gate.side !== side) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, depth), railMat);
      rail.position.set(x, y, 0);
      g.add(rail);
      return;
    }
    const bottomLen = Math.max(0.001, cz - half - (-d));
    const topLen    = Math.max(0.001, d - (cz + half));
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, bottomLen), railMat);
    bottom.position.set(x, y, (-d + (cz - half)) / 2);
    g.add(bottom);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, topLen), railMat);
    top.position.set(x, y, (cz + half + d) / 2);
    g.add(top);
  };

  // --- Traverse ---
  cutHorizontal(-d, 1.5, 'south');
  cutHorizontal( d, 1.5, 'north');
  cutHorizontal(-d, 0.8, 'south');
  cutHorizontal( d, 0.8, 'north');
  cutVertical(-w, 1.5, 'west');
  cutVertical( w, 1.5, 'east');
  cutVertical(-w, 0.8, 'west');
  cutVertical( w, 0.8, 'east');

  return g;
}
