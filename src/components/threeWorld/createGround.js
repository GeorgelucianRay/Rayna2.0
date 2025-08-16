import * as THREE from 'three';

export default function createGround({ width = 600, depth = 300 } = {}) {
  const g = new THREE.Group();

  // asfalt
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color: 0x2a2f35, roughness: 1 })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = false;
  g.add(plane);

  // grilă discretă (ajută orientarea)
  const grid = new THREE.GridHelper(width, Math.round(width / 10), 0x2dd4bf, 0x374151);
  grid.position.y = 0.02;
  g.add(grid);

  // culoar central cyan (orientare ABC | DEF)
  const lineMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.55 });
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-width/2, 0.05, 0),
    new THREE.Vector3(width/2, 0.05, 0),
  ]);
  const line = new THREE.Line(lineGeo, lineMat);
  g.add(line);

  return g;
}
