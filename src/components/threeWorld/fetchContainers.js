// src/components/threeWorld/createFence.js
import * as THREE from 'three';

export default function createFence({ width = 170, depth = 110, postEvery = 12 } = {}) {
  const g = new THREE.Group();
  const w = width/2, d = depth/2;

  const postMat = new THREE.MeshStandardMaterial({ color: 0x9aaabc, metalness: 0.15, roughness: 0.8 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xa7b4c8, metalness: 0.15, roughness: 0.8 });

  const postGeo = new THREE.BoxGeometry(0.22, 1.8, 0.22);
  const placePost = (x, z) => {
    const p = new THREE.Mesh(postGeo, postMat);
    p.position.set(x, 0.9, z);
    g.add(p);
  };

  for (let x = -w; x <= w; x += postEvery) { placePost(x, -d); placePost(x, d); }
  for (let z = -d; z <= d; z += postEvery) { placePost(-w, z); placePost(w, z); }

  const railGeoH = new THREE.BoxGeometry(width, 0.1, 0.1);
  const rTop = new THREE.Mesh(railGeoH, railMat); rTop.position.set(0, 1.5, -d); g.add(rTop);
  const rMid = new THREE.Mesh(railGeoH, railMat); rMid.position.set(0, 0.8, -d); g.add(rMid);
  const rTop2 = rTop.clone(); rTop2.position.z = d; g.add(rTop2);
  const rMid2 = rMid.clone(); rMid2.position.z = d; g.add(rMid2);

  const railGeoV = new THREE.BoxGeometry(0.1, 0.1, depth);
  const l1 = new THREE.Mesh(railGeoV, railMat); l1.position.set(-w, 1.5, 0); g.add(l1);
  const l2 = new THREE.Mesh(railGeoV, railMat); l2.position.set(-w, 0.8, 0); g.add(l2);
  const r1 = l1.clone(); r1.position.x = w; g.add(r1);
  const r2 = l2.clone(); r2.position.x = w; g.add(r2);

  return g;
}