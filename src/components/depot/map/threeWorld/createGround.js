// Asfaltul curții + “benzi” simple ca marcaje
import * as THREE from 'three';

const TEX = '/textures/lume/asphalt_curte_textura.png';

export default function createGround({ width, depth, color, abcOffsetX, defOffsetX, abcToDefGap }) {
  const group = new THREE.Group();

  // — ASFALT —
  const geo = new THREE.PlaneGeometry(width, depth, 1, 1);
  const map = new THREE.TextureLoader().load(TEX);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  // tile ușor ca să pară realist
  map.repeat.set(width / 6, depth / 6);
  map.anisotropy = 4;

  const mat = new THREE.MeshStandardMaterial({
    map,
    roughness: 1,
    metalness: 0,
  });
  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;

  // Ramă subțire la margine (opțional)
  const frame = new THREE.Mesh(
    new THREE.PlaneGeometry(width + 2, depth + 2),
    new THREE.MeshBasicMaterial({ color: 0x5c7a37 })
  );
  frame.rotation.x = -Math.PI / 2;
  frame.position.y = -0.03;

  // — MARCAJE SIMPLE (benzi semitransparente), ca în captura ta —
  const markMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 });
  const bandW = 4, bandL = depth - 10;
  const leftBand = new THREE.Mesh(new THREE.PlaneGeometry(bandL, 1), markMat);
  leftBand.rotation.x = -Math.PI / 2;
  leftBand.rotation.z = Math.PI / 2;
  leftBand.position.set(-width * 0.33, 0.001, 0);

  const rightBand = leftBand.clone();
  rightBand.position.x = width * 0.33;

  group.add(frame, ground, leftBand, rightBand);
  return group;
}