// src/components/threeWorld/createGround.js
import * as THREE from 'three';

const TEX_ASPHALT = '/textures/lume/asphalt_curte_textura.PNG';

export default function createGround({ width, depth, color }) {
  const group = new THREE.Group();

  // „pământ” sub curte, ușor mai jos (nu se vede prin asfalt)
  const soil = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
    new THREE.MeshStandardMaterial({ color: 0x78904c, roughness: 1 })
  );
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = -0.06;
  soil.receiveShadow = true;
  group.add(soil);

  // asfalt
  const tex = new THREE.TextureLoader().load(TEX_ASPHALT, t => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    // tile ușor pentru detaliu
    t.repeat.set(Math.max(1, width / 10), Math.max(1, depth / 10));
    t.anisotropy = 4;
  });

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.95,
    metalness: 0.0
  });

  const slab = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mat);
  slab.rotation.x = -Math.PI / 2;
  slab.position.y = -0.01; // puțin peste „soil” → fără z-fighting
  slab.receiveShadow = true;
  group.add(slab);

  return group;
}