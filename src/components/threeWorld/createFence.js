import * as THREE from 'three';

export default function createFence({ width = 560, depth = 260, postEvery = 16 } = {}) {
  const g = new THREE.Group();
  const w = width/2, d = depth/2;

  const postMat = new THREE.MeshStandardMaterial({ color: 0x93a3b5, metalness: 0.1, roughness: 0.8 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x9aaabc, metalness: 0.1, roughness: 0.8 });

  // stâlpi
  const postGeo = new THREE.BoxGeometry(0.25, 2.0, 0.25);
  const placePost = (x, z) => {
    const p = new THREE.Mesh(postGeo, postMat);
    p.position.set(x, 1.0, z);
    g.add(p);
  };

  for (let x = -w; x <= w; x += postEvery) { placePost(x, -d); placePost(x, d); }
  for (let z = -d; z <= d; z += postEvery) { placePost(-w, z); placePost(w, z); }

  // șine
  const railGeoH = new THREE.BoxGeometry(width, 0.12, 0.12);
  const railTop = new THREE.Mesh(railGeoH, railMat); railTop.position.set(0, 1.6, -d); g.add(railTop);
  const railMid = new THREE.Mesh(railGeoH, railMat); railMid.position.set(0, 0.8, -d); g.add(railMid);
  const railTop2 = railTop.clone(); railTop2.position.z = d; g.add(railTop2);
  const railMid2 = railMid.clone(); railMid2.position.z = d; g.add(railMid2);

  const railGeoV = new THREE.BoxGeometry(0.12, 0.12, depth);
  const railL1 = new THREE.Mesh(railGeoV, railMat); railL1.position.set(-w, 1.6, 0); g.add(railL1);
  const railL2 = new THREE.Mesh(railGeoV, railMat); railL2.position.set(-w, 0.8, 0); g.add(railL2);
  const railR1 = railL1.clone(); railR1.position.x = w; g.add(railR1);
  const railR2 = railL2.clone(); railR2.position.x = w; g.add(railR2);

  return g;
}
