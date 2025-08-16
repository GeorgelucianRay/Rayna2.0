// src/components/threeWorld/createFence.js
import * as THREE from 'three';

export default function createFence({
  width = 80,        // ↔ interior gard (X)
  depth = 50,        // ↕ interior gard (Z)
  postEvery = 10,
  // Poarta: side = 'south' | 'north' | 'west' | 'east'
  // centerX / centerZ = poziția centrului golului de poartă pe axa relevantă
  // tweakX / tweakZ = reglaj fin (metri)
  gate = { side: 'south', width: 8, centerX: 0, centerZ: 0, tweakX: 0, tweakZ: 0 }
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

  // --- stâlpi pe contur ---
  for (let x = -w; x <= w; x += postEvery) { addPost(x, -d); addPost(x, d); }
  for (let z = -d; z <= d; z += postEvery) { addPost(-w, z); addPost(w, z); }

  // helper pt. rail orizontal (N/S) cu gol de poartă
  const addHorizontalRail = (z, y, side) => {
    if (gate.side === side) {
      const cx = (gate.centerX ?? 0) + (gate.tweakX ?? 0);
      const half = Math.max(0, Math.min(gate.width / 2, w));   // clamp
      const leftLen  = (cx - half) - (-w);
      const rightLen = w - (cx + half);
      if (leftLen > 0) {
        const left = new THREE.Mesh(new THREE.BoxGeometry(leftLen, 0.1, 0.1), railMat);
        left.position.set(-w + leftLen / 2, y, z);
        g.add(left);
      }
      if (rightLen > 0) {
        const right = new THREE.Mesh(new THREE.BoxGeometry(rightLen, 0.1, 0.1), railMat);
        right.position.set(w - rightLen / 2, y, z);
        g.add(right);
      }
    } else {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, 0.1), railMat);
      rail.position.set(0, y, z);
      g.add(rail);
    }
  };

  // helper pt. rail vertical (W/E) cu gol de poartă – util dacă vreodată vrei poarta pe laterale
  const addVerticalRail = (x, y, side) => {
    if (gate.side === side) {
      const cz = (gate.centerZ ?? 0) + (gate.tweakZ ?? 0);
      const half = Math.max(0, Math.min(gate.width / 2, d));
      const topLen    = (cz - half) - (-d);
      const bottomLen = d - (cz + half);
      if (topLen > 0) {
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, topLen), railMat);
        top.position.set(x, y, -d + topLen / 2);
        g.add(top);
      }
      if (bottomLen > 0) {
        const bot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, bottomLen), railMat);
        bot.position.set(x, y, d - bottomLen / 2);
        g.add(bot);
      }
    } else {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, depth), railMat);
      rail.position.set(x, y, 0);
      g.add(rail);
    }
  };

  // --- traverse orizontale N/S (sus și la mijloc) ---
  addHorizontalRail(-d, 1.5, 'south');
  addHorizontalRail( d, 1.5, 'north');
  addHorizontalRail(-d, 0.8, 'south');
  addHorizontalRail( d, 0.8, 'north');

  // --- laterale W/E (fără poartă în mod normal; dar suportă dacă setezi gate.side='west'/'east') ---
  addVerticalRail(-w, 1.5, 'west');
  addVerticalRail(-w, 0.8,  'west');
  addVerticalRail( w, 1.5,  'east');
  addVerticalRail( w, 0.8,  'east');

  return g;
}