// src/components/threeWorld/createSurroundingBuildings.js
import * as THREE from 'three';

function createBuilding(options) {
  const { width, height, depth, color = 0xd1d5db, position, rotationY = 0 } = options;
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 });
  const building = new THREE.Mesh(geometry, material);
  building.position.set(position.x, height / 2, position.z);
  building.rotation.y = rotationY;
  building.castShadow = true;
  building.receiveShadow = true;
  return building;
}

export default function createSurroundingBuildings() {
  const g = new THREE.Group();

  // Clădirea mare, albă, din stânga (vest)
  g.add(createBuilding({
    width: 60, height: 12, depth: 80,
    color: 0xffffff,
    position: { x: -90, z: 20 },
  }));

  // Clădirea din spate (nord)
  g.add(createBuilding({
    width: 150, height: 10, depth: 40,
    position: { x: 30, z: -100 },
  }));

  // Clădirea din dreapta (est) - vizavi de depozit
  g.add(createBuilding({
    width: 50, height: 9, depth: 50,
    position: { x: 160, z: 50 },
  }));

  return g;
}