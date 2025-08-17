// src/components/threeWorld/createMountainWall.js
import * as THREE from 'three';

/**
 * Creează un perete montan pe latura de nord a depozitului.
 */
export default function createMountainWall({
  yardWidth = 90,
  yardDepth = 60,
  fenceMargin = 2,
} = {}) {
  const g = new THREE.Group();

  const mountainWidth = yardWidth * 2; // Îl facem mult mai lat decât curtea
  const mountainHeight = 35;           // Înălțimea muntelui
  
  // Folosim un PlaneGeometry cu multe segmente pentru a-l putea deforma
  const geo = new THREE.PlaneGeometry(mountainWidth, mountainHeight, 100, 30);
  const pos = geo.attributes.position;

  // Deformăm vârfurile pentru a crea un aspect de munte/stâncă
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    
    // Adăugăm zgomot pe adâncime (axa Z)
    // Zgomotul este mai mare la bază și mai mic spre vârf
    const noise = (1 - (y / mountainHeight)) * Math.random() * 8;
    pos.setZ(i, pos.getZ(i) + noise);

    // Deformăm și linia de sus a muntelui (axa Y)
    if (y > mountainHeight * 0.4) {
      const peakNoise = Math.sin(x / 20) * Math.random() * 4;
      pos.setY(i, y + peakNoise);
    }
  }
  geo.computeVertexNormals(); // Recalculăm normalele pentru o iluminare corectă

  const mat = new THREE.MeshStandardMaterial({
    color: 0x8d8070, // O culoare de stâncă
    roughness: 0.95,
    side: THREE.DoubleSide,
  });

  const mountain = new THREE.Mesh(geo, mat);

  // Poziționăm muntele
  mountain.rotation.x = -Math.PI / 2; // Îl rotim să stea culcat pe planul XZ
  mountain.rotation.y = Math.PI;      // Îl întoarcem cu fața spre noi

  // Linia gardului de nord este la (yardDepth / 2 - fenceMargin)
  const northFenceZ = yardDepth / 2 - fenceMargin;
  mountain.position.set(0, 0, northFenceZ); // Aliniem baza muntelui cu linia gardului

  g.add(mountain);
  return g;
}
