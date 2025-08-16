// src/components/threeWorld/createTrees.js
import * as THREE from 'three';

/**
 * mode: 'ring' → copaci pe contur (în exteriorul asfaltului)
 *       'random' → poziții aleatoare în jur
 * width/depth: dimensiunea ASFALTULUI (nu a gardului)
 */
export default function createTrees({
  width = 90,
  depth = 60,
  mode = 'ring',
  offset = 6.0,   // cât în afara asfaltului
  every = 4.0,    // distanță între copaci pe contur (aprox)
} = {}) {
  const g = new THREE.Group();
  const hw = width / 2 + offset;
  const hd = depth / 2 + offset;

  const makeTree = (x, z) => {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.2, 1.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x6b4f35, roughness: 1 })
    );
    trunk.position.set(x, 0.8, z);
    const crown = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.2, 0),
      new THREE.MeshStandardMaterial({ color: 0x2e7d46, roughness: 0.9 })
    );
    crown.position.set(x, 1.9, z);
    g.add(trunk, crown);
  };

  if (mode === 'ring') {
    // conturul dreptunghiului: mergem pe fiecare latură și plasăm copaci
    const perimX = Math.ceil((width + 2 * offset) / every);
    const perimZ = Math.ceil((depth + 2 * offset) / every);

    // sud (z = -hd)
    for (let i = 0; i <= perimX; i++) {
      const x = -hw + (i * every);
      makeTree(x, -hd);
    }
    // nord (z = +hd)
    for (let i = 0; i <= perimX; i++) {
      const x = -hw + (i * every);
      makeTree(x, hd);
    }
    // vest (x = -hw)
    for (let i = 0; i <= perimZ; i++) {
      const z = -hd + (i * every);
      makeTree(-hw, z);
    }
    // est (x = +hw)
    for (let i = 0; i <= perimZ; i++) {
      const z = -hd + (i * every);
      makeTree(hw, z);
    }
  } else {
    // fallback random (dacă îl vrei vreodată)
    for (let i = 0; i < 18; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const alongX = Math.random() < 0.5;
      const x = alongX ? (Math.random() * width - width / 2) : side * hw;
      const z = !alongX ? (Math.random() * depth - depth / 2) : side * hd;
      makeTree(x, z);
    }
  }

  return g;
}