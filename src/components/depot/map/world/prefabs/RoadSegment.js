// world/prefabs/RoadSegment.js
import * as THREE from 'three';

export function makeRoadSegment({ w = 12, d = 40, h = 0.02, y = 0.015 } = {}) {
  // folosim un plane foarte subțire, nu box, și îl rotim pe orizontală
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);

  const tex = new THREE.TextureLoader().load('/textures/lume/Drumuri.jpg');
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;

  // textura e desenată pentru 6×20 m; repetăm proporțional ca să nu se deformeze
  const repeatX = d / 20; // de-a lungul drumului
  const repeatY = w / 6;  // pe lățime
  tex.repeat.set(repeatX, repeatY);

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.9,
    metalness: 0.0
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = y;           // puțin deasupra solului
  mesh.receiveShadow = true;
  return mesh;
}