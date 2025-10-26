import * as THREE from 'three';

const ASPHALT_TEX = '/textures/lume/asphalt_curte_textura.PNG';

/**
 * Creează placa de curte cu textura de asfalt.
 * Apelezi: createGround({ width, depth, color?, abcOffsetX?, defOffsetX?, abcToDefGap? })
 *  - width/depth sunt folosite și ca tiling pentru textură (cu repeat automat).
 */
export default function createGround({
  width,
  depth,
  color = 0x9aa0a6,     // nefolosit când avem map, dar îl păstrăm ca fallback
  abcOffsetX = 0,
  defOffsetX = 0,
  abcToDefGap = 0
} = {}) {
  const group = new THREE.Group();

  // textură asfalt
  const loader = new THREE.TextureLoader();
  const asphalt = loader.load(ASPHALT_TEX);
  asphalt.colorSpace = THREE.SRGBColorSpace;
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;

  // tiling automat în funcție de dimensiunile plăcii (≈ o dală la 2m)
  const repeatX = Math.max(1, Math.round((width  ?? 100) / 2));
  const repeatY = Math.max(1, Math.round((depth  ?? 100) / 2));
  asphalt.repeat.set(repeatX, repeatY);

  const mat = new THREE.MeshStandardMaterial({
    map: asphalt,
    roughness: 1.0,
    metalness: 0.0
  });

  const geo = new THREE.PlaneGeometry(width, depth, 1, 1);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;    // orizontal
  mesh.receiveShadow = true;

  group.add(mesh);
  return group;
}