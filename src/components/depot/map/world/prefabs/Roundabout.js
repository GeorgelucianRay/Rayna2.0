// world/prefabs/Roundabout.js
import * as THREE from 'three';

/**
 * Sens giratoriu “ring”:
 * - outerR = 20m (diametru 40)
 * - ringW  = 12m  (lățimea carosabilului, egală cu lățimea drumului)
 * - h      = 0.02m (foarte subțire, peste asfalt)
 */
export function makeRoundabout({
  outerR = 20,
  ringW  = 12,
  h = 0.02,
  texturePath = '/textures/lume/Drumuri.jpg',
} = {}) {
  const innerR = Math.max(outerR - ringW, 0.1);

  // Geometrie “inel” (carosabilul)
  const ringGeo = new THREE.RingGeometry(innerR, outerR, 128, 1);
  ringGeo.rotateX(-Math.PI / 2);

  // Textura drumului
  const tex = new THREE.TextureLoader().load(texturePath);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

  // Repetiția pe circumferință, aproximăm după perimetru
  const circumf = 2 * Math.PI * ((innerR + outerR) / 2);
  // ~ 1 repet la fiecare 10m ca să nu fie întins/distorsionat
  tex.repeat.set(circumf / 10, 1);

  const roadMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
    // anti z-fighting cu asfaltul curții
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const ring = new THREE.Mesh(ringGeo, roadMat);
  ring.receiveShadow = true;
  ring.castShadow = false;
  ring.position.y = h + 0.03; // puțin peste placa de asfalt, ca marcajele

  // Insulă centrală simplă (opțional)
  const islandR = Math.max(innerR * 0.6, 2);
  const islandGeo = new THREE.CylinderGeometry(islandR, islandR, 0.15, 48);
  const islandMat = new THREE.MeshStandardMaterial({
    color: 0x556b2f, roughness: 1, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const island = new THREE.Mesh(islandGeo, islandMat);
  island.position.y = 0.075; // un pic peste asfalt

  const g = new THREE.Group();
  g.add(ring, island);
  return g;
}