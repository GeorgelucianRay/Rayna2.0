import * as THREE from 'three';

function createHillSegment(options) {
  const { width = 200, baseHeight = 5, peakHeight = 25, depth = 150, segments = 30 } = options;

  const geometry = new THREE.BoxGeometry(width, baseHeight, depth, segments, 5, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x78904c,
    flatShading: true,
  });

  const positionAttribute = geometry.getAttribute('position');
  const topFaceY = baseHeight / 2;

  for (let i = 0; i < positionAttribute.count; i++) {
    const originalY = positionAttribute.getY(i);
    if (originalY >= topFaceY - 0.1) {
      const x = positionAttribute.getX(i);
      const z = positionAttribute.getZ(i);
      const noise = Math.sin(x * 0.02) * Math.cos(z * 0.03);
      positionAttribute.setY(i, originalY + noise * peakHeight);
    }
  }
  geometry.computeVertexNormals();
  
  const hill = new THREE.Mesh(geometry, material);
  hill.receiveShadow = true;
  return hill;
}

export default function createLandscape() {
  const landscape = new THREE.Group();
  
  const backWall = createHillSegment({ width: 500 });
  backWall.position.set(0, 0, -150);
  landscape.add(backWall);

  const leftWall = createHillSegment({ width: 400 });
  leftWall.position.set(-250, 0, 0);
  leftWall.rotation.y = Math.PI / 2;
  landscape.add(leftWall);

  const rightWall = createHillSegment({ width: 400 });
  rightWall.position.set(250, 0, 0);
  rightWall.rotation.y = -Math.PI / 2;
  landscape.add(rightWall);

  return landscape;
}