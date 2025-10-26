// world/prefabs/RoadSegment.js
import * as THREE from 'three';
export function makeRoadSegment({ w=2, h=0.05, d=4 }={}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const tex = new THREE.TextureLoader().load('/textures/lume/asphalt_curte_textura.PNG');
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false; mesh.receiveShadow = true;
  return mesh;
}