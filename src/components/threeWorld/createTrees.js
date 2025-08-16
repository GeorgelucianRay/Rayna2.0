// src/components/threeWorld/createTrees.js
import * as THREE from 'three';

export default function createTrees({ width = 190, depth = 130, count = 10 } = {}) {
  const g = new THREE.Group();
  const w = width/2 + 6, d = depth/2 + 6;

  for (let i = 0; i < count; i++) {
    const alongX = Math.random() < 0.5;
    const side = Math.random() < 0.5 ? -1 : 1;

    const x = alongX ? (Math.random()*width - width/2) : side * w;
    const z = !alongX ? (Math.random()*depth - depth/2) : side * d;

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
  }
  return g;
}