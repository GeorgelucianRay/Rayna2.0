import * as THREE from 'three';

const TEX_FENCE = '/textures/lume/gard_textura.png';

export default function createFence({ width, depth, margin = 0.5, postEvery = 10 }) {
  const W = width, D = depth;
  const halfW = W / 2, halfD = D / 2;

  const loader = new THREE.TextureLoader();
  const fenceTex = loader.load(TEX_FENCE);
  fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping;
  fenceTex.repeat.set(W / 6, 1); // tile pe lungime

  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: fenceTex,
    alphaMap: fenceTex,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.0
  });

  const fenceHeight = 2;
  const fenceThickness = 0.01;

  function makeSide(len) {
    const geo = new THREE.PlaneGeometry(len, fenceHeight);
    const mesh = new THREE.Mesh(geo, fenceMat);
    mesh.position.y = fenceHeight / 2;
    return mesh;
  }

  const group = new THREE.Group();
  group.name = 'Fence';

  // NORD (spre +Z)
  const north = makeSide(W);
  north.rotation.y = Math.PI; // plasa “răsucită” corect
  north.position.set(0, 0, halfD + margin);
  group.add(north);

  // SUD (spre -Z)
  const south = makeSide(W);
  south.position.set(0, 0, -halfD - margin);
  group.add(south);

  // EST (+X)
  const east = makeSide(D);
  east.rotation.y = -Math.PI / 2;
  east.position.set(halfW + margin, 0, 0);
  group.add(east);

  // VEST (-X)
  const west = makeSide(D);
  west.rotation.y = Math.PI / 2;
  west.position.set(-halfW - margin, 0, 0);
  group.add(west);

  // Stâlpi (opțional)
  const postMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 1 });
  const postGeo = new THREE.CylinderGeometry(0.03, 0.03, fenceHeight, 8);
  function addPostsAlongX(z) {
    for (let x = -halfW; x <= halfW; x += postEvery) {
      const p = new THREE.Mesh(postGeo, postMat);
      p.position.set(x, fenceHeight / 2, z);
      group.add(p);
    }
  }
  function addPostsAlongZ(x) {
    for (let z = -halfD; z <= halfD; z += postEvery) {
      const p = new THREE.Mesh(postGeo, postMat);
      p.position.set(x, fenceHeight / 2, z);
      group.add(p);
    }
  }
  addPostsAlongX(halfD + margin);
  addPostsAlongX(-halfD - margin);
  addPostsAlongZ(halfW + margin);
  addPostsAlongZ(-halfW - margin);

  return group;
}