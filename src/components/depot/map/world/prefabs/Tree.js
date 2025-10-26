// src/components/depot/map/world/prefabs/Tree.js
import * as THREE from 'three';
export function makeTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 1.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x7a5a2a })
  );
  trunk.position.y = 0.6; g.add(trunk);
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x3a6d33, roughness: 1 })
  );
  crown.position.y = 1.5; g.add(crown);
  return g;
}
