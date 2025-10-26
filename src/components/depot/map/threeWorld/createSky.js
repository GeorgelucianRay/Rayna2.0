// Cer simplu, sigur: o “cutie” uriașă cu textura ta pe interior.
import * as THREE from 'three';

const TEX = '/textures/lume/sky_textura.jpg';

export default function createSky() {
  const loader = new THREE.TextureLoader();
  const map = loader.load(TEX);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, 1);

  const geo = new THREE.BoxGeometry(4000, 4000, 4000);
  const mat = new THREE.MeshBasicMaterial({
    map,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.renderOrder = -10;     // asigurăm randarea în spate
  return sky;
}