// src/components/threeWorld/createMountainWall.js
import * as THREE from 'three';

/**
 * Creează un perete montan stratificat pe latura de nord a depozitului.
 */
export default function createMountainWall({
  yardWidth = 90,
  yardDepth = 60,
  fenceMargin = 2,
} = {}) {
  const g = new THREE.Group();

  const baseWidth = yardWidth * 2.5; // Le facem și mai late
  const baseHeight = 30; // Înălțimea de bază a primului strat

  // Vom crea 3 straturi de munți
  for (let i = 0; i < 3; i++) {
    const isFirstLayer = i === 0;
    
    // Fiecare strat este mai înalt și mai în spate
    const currentHeight = baseHeight + (i * 15); // Creștem înălțimea cu 15m la fiecare pas
    const zOffset = i * 8; // Mutăm fiecare strat cu 8m mai în spate
    
    const geo = new THREE.PlaneGeometry(baseWidth, currentHeight, 100, 30);
    const pos = geo.attributes.position;

    // Deformăm vârfurile (cu un factor aleatoriu diferit pentru fiecare strat)
    const randomFactor = 1 + i * 0.5;
    for (let j = 0; j < pos.count; j++) {
      const y = pos.getY(j);
      const x = pos.getX(j);
      
      const noise = (1 - (y / currentHeight)) * Math.random() * 8 * randomFactor;
      pos.setZ(j, pos.getZ(j) + noise);

      if (y > currentHeight * 0.4) {
        const peakNoise = Math.sin(x / (20 + i*5)) * Math.random() * 4 * randomFactor;
        pos.setY(j, y + peakNoise);
      }
    }
    geo.computeVertexNormals();

    // Fiecare strat este puțin mai întunecat pentru a simula adâncimea
    const baseColor = new THREE.Color(0x8d8070);
    const finalColor = baseColor.lerp(new THREE.Color(0x000000), i * 0.15);

    const mat = new THREE.MeshStandardMaterial({
      color: finalColor,
      roughness: 0.95,
      side: THREE.DoubleSide,
    });

    const mountainLayer = new THREE.Mesh(geo, mat);

    mountainLayer.rotation.x = -Math.PI / 2;
    mountainLayer.rotation.y = Math.PI;

    // Poziționăm stratul. Primul strat este lipit de gard, celelalte mai în spate.
    const northFenceZ = yardDepth / 2 - fenceMargin;
    mountainLayer.position.set(0, 0, northFenceZ + zOffset);
    
    g.add(mountainLayer);
  }

  return g;
}
