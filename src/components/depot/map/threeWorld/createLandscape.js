import * as THREE from 'three';
const loader = new THREE.TextureLoader();

export default function createLandscape({
  size = 1600,
  texturePath = '/textures/lume/munte_textura.jpg'
} = {}) {
  const g = new THREE.Group();

  const map = loader.load(texturePath);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(size / 64, size / 64); // tiling; ajustează după gust
  map.anisotropy = 4;

  const mat = new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0 });
  const geo = new THREE.PlaneGeometry(size, size);
  const plane = new THREE.Mesh(geo, mat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.51; // puțin sub asfalt ca să nu z-fighteze
  plane.receiveShadow = true;

  g.add(plane);
  return g;
}