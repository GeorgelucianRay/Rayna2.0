// src/components/depot/map/world/prefabs/HillTile.js
import * as THREE from 'three';
export function makeHillTile({ size=2, h=0.6, asRock=false } = {}) {
  const geom = new THREE.PlaneGeometry(size, size, 1, 1);
  geom.rotateX(-Math.PI/2);
  // o mică variație (tile simplu)
  const mat = new THREE.MeshStandardMaterial({ color: asRock ? 0x8d7f6d : 0x6f7f49, roughness: 1 });
  const m = new THREE.Mesh(geom, mat); m.position.y = 0.01;
  return m;
}