import * as THREE from 'three';

const MOUNTAIN_TEX = '/textures/lume/munte_textura.jpg';

/**
 * Creează peisajul montan din jurul curții.
 * Folosește o textură aplicată pe un mesh mare, ușor modelat.
 */
export default function createLandscape() {
  const group = new THREE.Group();

  const loader = new THREE.TextureLoader();
  const tex = loader.load(MOUNTAIN_TEX);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 4); // Ajustează densitatea texturii pe munți

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 1,
    metalness: 0,
  });

  // Un teren mare, curbat ușor
  const geom = new THREE.PlaneGeometry(2000, 2000, 64, 64);
  geom.rotateX(-Math.PI / 2);

  // Modelăm puțin terenul ca să pară valuri de dealuri
  for (let i = 0; i < geom.attributes.position.count; i++) {
    const y = Math.sin(i / 5) * 2 + Math.random() * 1.5;
    geom.attributes.position.setY(i, y);
  }

  geom.computeVertexNormals();

  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.y = -0.3; // puțin sub curte
  mesh.receiveShadow = true;
  group.add(mesh);

  return group;
}