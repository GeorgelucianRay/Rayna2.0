import * as THREE from 'three';

/**
 * Creează un sens giratoriu (inel + insulă centrală)
 * outerR = raza exterioară, ringW = lățimea benzii
 */
export function makeRoundabout({
  outerR = 20,
  ringW = 12,
  h = 0.02,
  texturePath = '/textures/lume/Drumuri.jpg'
} = {}) {
  // protecție dacă parametrii nu sunt numerici
  outerR = Number(outerR) || 20;
  ringW  = Number(ringW) || 12;

  const innerR = Math.max(outerR - ringW, 0.5);

  // === INELUL DRUMULUI ===
  const ringGeo = new THREE.RingGeometry(innerR, outerR, 128, 1);
  ringGeo.rotateX(-Math.PI / 2);

  const tex = new THREE.TextureLoader().load(texturePath);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;

  // Repetare textură după circumferință
  const circumference = 2 * Math.PI * ((innerR + outerR) / 2);
  tex.repeat.set(circumference / 10, 1);

  const roadMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const ringMesh = new THREE.Mesh(ringGeo, roadMat);
  ringMesh.rotation.x = 0;
  ringMesh.position.y = h + 0.02;
  ringMesh.receiveShadow = true;

  // === INSULĂ CENTRALĂ ===
  const islandR = innerR * 0.6;
  const islandGeo = new THREE.CylinderGeometry(islandR, islandR, 0.15, 48);
  const islandMat = new THREE.MeshStandardMaterial({
    color: 0x5a6b2f,
    roughness: 1,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const island = new THREE.Mesh(islandGeo, islandMat);
  island.position.y = 0.075;

  // === GRUP FINAL ===
  const g = new THREE.Group();
  g.add(ringMesh);
  g.add(island);

  return g;
}