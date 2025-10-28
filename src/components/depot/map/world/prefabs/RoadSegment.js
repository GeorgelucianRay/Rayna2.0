// src/components/depot/map/world/prefabs/RoadSegment.js
import * as THREE from 'three';

export function makeRoadSegment({ w = 6, h = 0.06, d = 20 } = {}) {
  // Geometrie 6 (lățime) × 20 (lungime) cu o grosime mică
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, h / 2, 0); // stă pe sol

  // Textura drumului doar pe fața de sus (+Y = index 2)
  const roadTex = new THREE.TextureLoader().load('/textures/lume/Drumuri.jpg');
  roadTex.colorSpace = THREE.SRGBColorSpace;
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;

  // Dacă imaginea Drumuri.jpg ESTE deja proiectată pentru exact 6×20 m,
  // vrem un singur "tile" pe fața de sus → repeat(1,1)
  // (dacă ți se pare prea “mare/mică”, ajustezi aici, de ex. set(2,1) etc.)
  roadTex.repeat.set(1, 1);
  roadTex.anisotropy = 8;

  // Materialele pe fețe: px, nx, py(top), ny(bottom), pz, nz
  const sideMat = new THREE.MeshStandardMaterial({
    color: 0x2c2c2c, roughness: 0.95, metalness: 0.02,
  });
  const topMat = new THREE.MeshStandardMaterial({
    map: roadTex, roughness: 0.9, metalness: 0.05,
  });
  const bottomMat = sideMat;

  const materials = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];

  const mesh = new THREE.Mesh(geo, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.isRoad = true;

  return mesh;
}