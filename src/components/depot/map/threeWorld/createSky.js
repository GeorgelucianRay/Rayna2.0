import * as THREE from 'three';

const loader = new THREE.TextureLoader();

export default function createSky({
  radius = 320,
  texturePath = '/textures/lume/sky_textura.jpg'
} = {}) {
  const g = new THREE.Group();

  const tex = loader.load(texturePath);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;

  const geo = new THREE.SphereGeometry(radius, 64, 48);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.BackSide,
    depthWrite: false
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.renderOrder = -1000;
  g.add(sky);

  // luminile tale
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(80, 120, 40);
  g.add(sun);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xcad2e1, 0.6);
  g.add(hemi);

  return g;
}