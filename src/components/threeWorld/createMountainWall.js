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

  const baseWidth = yardWidth * 2.5;
  const baseHeight = 30;

  for (let i = 0; i < 3; i++) {
    const currentHeight = baseHeight + (i * 15);
    const zOffset = i * 8;
    
    // Geometria este creată ca un plan vertical (în planul XY)
    const geo = new THREE.PlaneGeometry(baseWidth, currentHeight, 100, 30);
    const pos = geo.attributes.position;

    const randomFactor = 1 + i * 0.5;
    for (let j = 0; j < pos.count; j++) {
      const y = pos.getY(j);
      const x = pos.getX(j);
      
      // Adăugăm zgomot pe adâncime (axa Z) pentru a nu fi un perete perfect plat
      const depthNoise = Math.random() * 4 * randomFactor;
      pos.setZ(j, pos.getZ(j) + depthNoise);

      // Deformăm linia de sus a muntelui (vârfurile)
      if (y > currentHeight * 0.4) {
        const peakNoise = Math.sin(x / (20 + i * 5)) * Math.random() * 4 * randomFactor;
        pos.setY(j, y + peakNoise);
      }
    }
    geo.computeVertexNormals();

    const baseColor = new THREE.Color(0x8d8070);
    const finalColor = baseColor.lerp(new THREE.Color(0x000000), i * 0.15);

    const mat = new THREE.MeshStandardMaterial({
      color: finalColor,
      roughness: 0.95,
      side: THREE.DoubleSide,
    });

    const mountainLayer = new THREE.Mesh(geo, mat);

    // ########## AICI ERA GREȘEALA ##########
    // Am șters complet rotațiile care stricau geometria.
    // Acum ajustăm poziția corect.
    
    const northFenceZ = yardDepth / 2 - fenceMargin;
    
    // Poziționăm muntele:
    // Y: Îl ridicăm la jumătate din înălțimea sa, ca baza să fie la nivelul solului (y=0)
    // Z: Îl mutăm în spatele curții, aliniat cu gardul + offset-ul de strat
    mountainLayer.position.set(0, currentHeight / 2, northFenceZ + zOffset);
    // #####################################
    
    g.add(mountainLayer);
  }

  return g;
}
