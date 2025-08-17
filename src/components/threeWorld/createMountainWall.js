// src/components/threeWorld/createMountainWall.js
import * as THREE from 'three';

/**
 * Creează un perete montan solid, stilizat (low-poly), din blocuri.
 */
export default function createMountainWall({
  yardDepth = 60,
  fenceMargin = 2,
} = {}) {
  const g = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x8d8070,
    roughness: 1.0,
  });

  const northWallZ = yardDepth / 2 - fenceMargin;

  const mainBlockHeight = 50;
  const mainBlock = new THREE.Mesh(
    new THREE.BoxGeometry(100, mainBlockHeight, 30),
    mat
  );
  mainBlock.position.set(0, mainBlockHeight / 2, northWallZ + 10);
  g.add(mainBlock);

  const leftBlockHeight = 35;
  const leftBlock = new THREE.Mesh(
    new THREE.BoxGeometry(80, leftBlockHeight, 25),
    mat
  );
  leftBlock.position.set(-60, leftBlockHeight / 2, northWallZ + 5);
  leftBlock.rotation.y = 0.2;
  g.add(leftBlock);

  const rightBlockHeight = 42;
  const rightBlock = new THREE.Mesh(
    new THREE.BoxGeometry(90, rightBlockHeight, 28),
    mat
  );
  rightBlock.position.set(65, rightBlockHeight / 2, northWallZ + 8);
  rightBlock.rotation.y = -0.15;
  g.add(rightBlock);

  return g;
}
