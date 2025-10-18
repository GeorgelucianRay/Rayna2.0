import * as THREE from 'three';

/**
 * Creează un lanț montan stilizat (low-poly) care acționează ca un fundal.
 * - Folosește 'depthWrite: false' și 'renderOrder' pentru a se asigura
 * că este mereu desenat în spatele celorlalte obiecte.
 */
export default function createMountainWall({
  yardDepth = 60,
  width = 500,        // Lățime foarte mare pentru a acoperi tot orizontul
  baseHeight = 15,    // Înălțimea de bază a muntelui
  peakHeight = 60,    // Vârfuri înalte și dramatice
  depth = 100,        // O grosime vizuală
  segments = 80,      // Detaliul reliefului
} = {}) {
  const g = new THREE.Group();

  const geometry = new THREE.BoxGeometry(width, baseHeight, depth, segments, segments / 4, 1);

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    flatShading: true,
    depthWrite: false, // Previne blocarea altor obiecte
  });

  const positionAttribute = geometry.getAttribute('position');
  const colors = [];
  const colorRock = new THREE.Color(0x8d8070);
  const colorSnow = new THREE.Color(0xffffff);
  const topFaceY = baseHeight / 2;

  for (let i = 0; i < positionAttribute.count; i++) {
    const originalY = positionAttribute.getY(i);
    let finalY = originalY;

    if (originalY >= topFaceY - 0.1) {
      const x = positionAttribute.getX(i);
      const noise1 = Math.sin(x * 0.04) * Math.cos(x * 0.015);
      const noise2 = Math.sin(x * 0.01) * 0.5;
      const noiseHeight = (noise1 + noise2) * peakHeight;
      finalY = originalY + noiseHeight;
      positionAttribute.setY(i, finalY);
    }
    
    const altitudeFactor = Math.max(0, finalY) / (baseHeight + peakHeight);
    const finalColor = colorRock.clone().lerp(colorSnow, Math.pow(altitudeFactor, 1.5));
    colors.push(finalColor.r, finalColor.g, finalColor.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const mountainMesh = new THREE.Mesh(geometry, material);

  // Se desenează după cer, dar înaintea restului scenei.
  mountainMesh.renderOrder = -999;
  
  // Poziționăm muntele departe în zare, la o coordonată Z negativă mare.
  mountainMesh.position.set(0, baseHeight / 2 + 10, -150);

  g.add(mountainMesh);
  return g;
}