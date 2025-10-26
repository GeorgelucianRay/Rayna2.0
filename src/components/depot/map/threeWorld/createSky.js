// src/components/threeWorld/createSky.js
import * as THREE from 'three';

const TEX_SKY = '/textures/lume/sky_textura.jpg';

export default function createSky() {
  const loader = new THREE.TextureLoader();
  const map = loader.load(TEX_SKY, t => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.repeat.set(1, 1);
  });

  // Sferă imensă inversată; MeshBasic => nu se întunecă
  const geo = new THREE.SphereGeometry(1500, 32, 16);
  geo.scale(-1, 1, 1);

  const mat = new THREE.MeshBasicMaterial({ map, depthWrite: false });
  const sky = new THREE.Mesh(geo, mat);
  sky.name = 'SkyDome';
  return sky;
}