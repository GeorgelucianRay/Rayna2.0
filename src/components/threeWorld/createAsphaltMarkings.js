// src/components/threeWorld/createAsphaltMarkings.js
import * as THREE from 'three';

export default function createAsphaltMarkings({
  abcCenterX = -18,
  defCenterX = +18,
  startZ = -32,
  laneWidth = 2.44,
  gapX = 0.20,
  gapZ = 0.40,
  slotLen = 12.2,              // slot vizual (40ft)
  color = 0x111111,
  alpha = 0.55,
} = {}) {
  const g = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: alpha });

  const drawRect = (x, z, w, l) => {
    const geo = new THREE.BufferGeometry();
    const y = 0.02;
    const pts = [
      new THREE.Vector3(x - w/2, y, z - l/2),
      new THREE.Vector3(x + w/2, y, z - l/2),
      new THREE.Vector3(x + w/2, y, z + l/2),
      new THREE.Vector3(x - w/2, y, z + l/2),
      new THREE.Vector3(x - w/2, y, z - l/2),
    ];
    geo.setFromPoints(pts);
    g.add(new THREE.Line(geo, mat));
  };

  const drawBlock = (centerX, slots) => {
    const xs = [
      centerX + (0 - 1) * (laneWidth + gapX),
      centerX + (1 - 1) * (laneWidth + gapX),
      centerX + (2 - 1) * (laneWidth + gapX),
    ];
    for (let li = 0; li < 3; li++) {
      const x = xs[li];
      for (let s = 0; s < slots; s++) {
        const z = startZ + s * (slotLen + gapZ);
        drawRect(x, z, laneWidth, slotLen);
      }
    }
  };

  // ABC = 3×10, DEF = 3×7
  drawBlock(abcCenterX, 10);
  drawBlock(defCenterX, 7);

  return g;
}
