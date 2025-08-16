// src/components/threeWorld/createGround.js
import * as THREE from 'three';

export default function createGround({
  width = 180, depth = 120,
  color = 0x1f2937,          // gri-închis curat
  showGrid = false,          // fără “cuburi” by default
  showCenterLine = true
} = {}) {
  const g = new THREE.Group();

  // “asfalt” simplu, neted
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.02 })
  );
  plane.rotation.x = -Math.PI / 2;
  g.add(plane);

  if (showGrid) {
    // grid foarte subtil (opțional)
    const grid = new THREE.GridHelper(width, Math.round(width / 6), 0x94a3b8, 0x334155);
    grid.material.opacity = 0.15;
    grid.material.transparent = true;
    grid.position.y = 0.02;
    g.add(grid);
  }

  if (showCenterLine) {
    const lineMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.6 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-width/2, 0.03, 0),
      new THREE.Vector3( width/2, 0.03, 0),
    ]);
    const line = new THREE.Line(lineGeo, lineMat);
    g.add(line);
  }

  return g;
}