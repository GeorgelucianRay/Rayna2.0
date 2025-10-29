// src/components/depot/map/threeWorld/createBaseWorld.js
import * as THREE from 'three';
import { createMeshFor } from '../world/propRegistry';

/**
 * Creează lumea statică bazată pe JSON-ul tău din Build Mode.
 * Obiectele sunt plasate direct în scenă (fără localStorage).
 */
export default function createBaseWorld() {
  const g = new THREE.Group();
  g.name = 'BaseWorld';

  const staticProps = [
    { type: 'road.segment', pos: [-51, 0.05, -10], rotY: 0 },
    { type: 'road.segment', pos: [-51, 0.05, 30], rotY: 0 },
    { type: 'road.roundabout', pos: [-55, 0.05, 49], rotY: 0 },
    { type: 'road.ramp', pos: [0, 0.05, 36], rotY: 0 },
    { type: 'road.ramp', pos: [-1, 0.05, 60], rotY: 0 },
    // poți adăuga și rampă iarbă aici (centrul)
    { type: 'ramp.grass', pos: [-1, 0.05, 60], rotY: 0 },
  ];

  for (const p of staticProps) {
    const mesh = createMeshFor(p.type);
    if (!mesh) continue;
    mesh.position.set(...p.pos);
    mesh.rotation.y = p.rotY || 0;
    g.add(mesh);
  }

  return g;
}