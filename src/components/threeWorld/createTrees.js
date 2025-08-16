import * as THREE from 'three';

export default function createTrees({ width = 620, depth = 320, count = 24 } = {}) {
  const g = new THREE.Group();
  const w = width/2 + 10, d = depth/2 + 10;

  for (let i = 0; i < count; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const along = Math.random() < 0.5 ? 'x' : 'z';

    let x = (along === 'x') ? (Math.random()*width - width/2) : side * w;
    let z = (along === 'z') ? (Math.random()*depth - depth/2) : side * d;

    // trunchi
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.26, 2.2, 7),
      new THREE.MeshStandardMaterial({ color: 0x6b4f35, roughness: 1 })
    );
    trunk.position.set(x, 1.1, z);

    // coroană
    const crown = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.8, 0),
      new THREE.MeshStandardMaterial({ color: 0x2d8f4f, roughness: 0.9 })
    );
    crown.position.set(x, 2.6, z);

    g.add(trunk, crown);
  }
  return g;
}
