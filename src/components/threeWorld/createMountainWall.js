// src/components/threeWorld/createMountainWall.js
import * as THREE from 'three';

/**
 * Creează un perete montan solid, stilizat (low-poly), din blocuri.
 * Această metodă este simplă și nu poate produce erori grafice.
 */
export default function createMountainWall({
  yardDepth = 60,
  fenceMargin = 2,
} = {}) {
  const g = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x8d8070, // Culoare de stâncă
    roughness: 1.0,
  });

  const northWallZ = yardDepth / 2 - fenceMargin;

  // --- Bloc 1 (Central, cel mai înalt) ---
  const mainBlockHeight = 50;
  const mainBlock = new THREE.Mesh(
    new THREE.BoxGeometry(100, mainBlockHeight, 30), // Lățime, Înălțime, Adâncime
    mat
  );
  mainBlock.position.set(
    0,                  // Centrat pe X
    mainBlockHeight / 2, // Baza la sol
    northWallZ + 10     // Puțin în spatele gardului
  );
  g.add(mainBlock);

  // --- Bloc 2 (Stânga, mai scund) ---
  const leftBlockHeight = 35;
  const leftBlock = new THREE.Mesh(
    new THREE.BoxGeometry(80, leftBlockHeight, 25),
    mat
  );
  leftBlock.position.set(
    -60,                // Deplasat la stânga
    leftBlockHeight / 2,
    northWallZ + 5
  );
  leftBlock.rotation.y = 0.2; // Rotit puțin ca să nu fie perfect drept
  g.add(leftBlock);

  // --- Bloc 3 (Dreapta, mediu) ---
  const rightBlockHeight = 42;
  const rightBlock = new THREE.Mesh(
    new THREE.BoxGeometry(90, rightBlockHeight, 28),
    mat
  );
  rightBlock.position.set(
    65,                 // Deplasat la dreapta
    rightBlockHeight / 2,
    northWallZ + 8
  );
  rightBlock.rotation.y = -0.15; // Rotit în direcția opusă
  g.add(rightBlock);

  return g;
}
