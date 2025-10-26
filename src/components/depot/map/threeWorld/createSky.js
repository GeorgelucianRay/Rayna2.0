import * as THREE from 'three';

const SKY_TEX = '/textures/lume/sky_textura.jpg';

/**
 * Creează o sferă uriașă inversată pentru cer.
 * Textura este aplicată pe interiorul sferei.
 */
export default function createSky() {
  const loader = new THREE.TextureLoader();
  const skyTex = loader.load(SKY_TEX);
  skyTex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide, // important: textura se vede din interior
  });

  const geom = new THREE.SphereGeometry(2000, 64, 64);
  const sky = new THREE.Mesh(geom, mat);
  sky.rotation.y = Math.PI; // opțional, dacă textura are o direcție preferată

  return sky;
}