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
  // Este un plan lung care trece prin fața curții.
  // O plasăm la marginea de vest a terenului.
  const roadWidth = 12; // Lățimea drumului (m)
  const roadLength = 200; // O facem destul de lungă
  const roadX = -yardWidth / 2 - roadWidth / 2 - 2; // Poziția pe axa X

  const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(roadX, 0.01, 0);
  g.add(road);

  // --- 2. Sensul Giratoriu ---
  // Îl poziționăm în dreptul porții, bazat pe gateConfig.
  const roundaboutRadius = 15; // Raza cercului exterior
  const islandRadius = 6; // Raza insulei verzi din centru
  
  // Poziția Z a sensului giratoriu este aliniată cu centrul porții
  const roundaboutZ = gateConfig.centerZ;

  // Cercul de asfalt
  const roundaboutGeo = new THREE.RingGeometry(islandRadius, roundaboutRadius, 64);
  const roundabout = new THREE.Mesh(roundaboutGeo, roadMat);
  roundabout.rotation.x = -Math.PI / 2;
  // Îl mutăm pe axa X ca să se intersecteze cu drumul principal
  roundabout.position.set(roadX, 0.01, roundaboutZ);
  g.add(roundabout);

  // Insula de iarbă din centru
  const islandGeo = new THREE.CircleGeometry(islandRadius, 64);
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x556b2f }); // Verde închis
  const island = new THREE.Mesh(islandGeo, islandMat);
  island.rotation.x = -Math.PI / 2;
  island.position.set(roadX, 0.02, roundaboutZ); // Puțin mai sus să nu clipească
  g.add(island);

  return g;
}
