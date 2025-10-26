// src/components/depot/map/world/prefabs/BuildingBox.js
import * as THREE from 'three';
export function makeBuildingBox({ w=4, d=6, h=3 } = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, h/2, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.8, metalness: 0.1 });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}