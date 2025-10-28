// src/components/depot/map/world/prefabs/RoadSegment.js
import * as THREE from 'three';

export function makeRoadSegment({ w = 6, d = 20, y = 0.03 } = {}) {
  // 6 (X) × 20 (Z) road surface as a single plane, laid flat on the ground.
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2); // make it horizontal

  const tex = new THREE.TextureLoader().load('/textures/lume/Drumuri.jpg');
  // Safe defaults across three versions
  if ('SRGBColorSpace' in THREE) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // If your image is already authored for 6×20 meters, keep (1,1)
  // Increase these if you want more tiling detail (e.g. tex.repeat.set(2,1))
  tex.repeat.set(1, 1);

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.9,
    metalness: 0.05,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = y; // slight lift to avoid z-fighting with asphalt slab
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.userData.isRoad = true;

  return mesh;
}