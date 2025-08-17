// src/components/threeWorld/createRoad.js
import * as THREE from 'three';

/**
 * Creează drumul principal și sensul giratoriu.
 * Se bazează pe configurația din MapPage pentru a se alinia corect.
 */
export default function createRoad({
  yardWidth = 90,  // Lățimea totală a terenului de asfalt
  gateConfig       // Configurația porții din CFG.fence.gate
} = {}) {
  const g = new THREE.Group();
  const roadColor = 0x6b7280; // O culoare de asfalt mai închisă

  const roadMat = new THREE.MeshStandardMaterial({
    color: roadColor,
    roughness: 0.9
  });

  // --- 1. Șoseaua principală (Pol. Ind. de Constant) ---
  const roadWidth = 12;
  const roadLength = 200;

  // ########## LINIA MODIFICATĂ ##########
  // Am mutat drumul mult mai la stânga pentru a face loc sensului giratoriu.
  // Calculul anterior era (-53), acum este (-61).
  const roadX = -61; 
  // #####################################

  const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(roadX, 0.01, 0);
  g.add(road);

  // --- 2. Sensul Giratoriu ---
  const roundaboutRadius = 15;
  const islandRadius = 6;
  const roundaboutZ = gateConfig.centerZ;

  const roundaboutGeo = new THREE.RingGeometry(islandRadius, roundaboutRadius, 64);
  const roundabout = new THREE.Mesh(roundaboutGeo, roadMat);
  roundabout.rotation.x = -Math.PI / 2;
  roundabout.position.set(roadX, 0.01, roundaboutZ);
  g.add(roundabout);

  const islandGeo = new THREE.CircleGeometry(islandRadius, 64);
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x556b2f });
  const island = new THREE.Mesh(islandGeo, islandMat);
  island.rotation.x = -Math.PI / 2;
  island.position.set(roadX, 0.02, roundaboutZ);
  g.add(island);

  return g;
}
