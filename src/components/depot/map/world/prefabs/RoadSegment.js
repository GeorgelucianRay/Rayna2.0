// src/components/depot/map/world/prefabs/RoadSegment.js
import * as THREE from 'three';

export function makeRoadSegment({ w = 6, h = 0.05, d = 20 } = {}) {
  // 🧱 geometrie mai lungă (6×20 m)
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, h / 2, 0);

  // 🧩 textura drumului
  const tex = new THREE.TextureLoader().load('/textures/lume/Drumuri.jpg');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

  // 🧮 proporție: vrem textura să se întindă corect pe suprafața 6×20
  // dacă imaginea e dreptunghiulară, poți regla ușor aceste valori:
  tex.repeat.set(d / 10, w / 6); // mai multe “pietre” pe lungime

  // ✨ material realist
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.9,
    metalness: 0.05,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.isRoad = true;

  return mesh;
}