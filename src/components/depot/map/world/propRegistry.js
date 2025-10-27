// src/components/depot/map/world/propRegistry.js
import * as THREE from 'three';

// Prefab-uri existente (exact cum le ai tu – exporturi NUMITE)
import { makeRoadSegment } from './prefabs/RoadSegment';
import { makeFencePanel }  from './prefabs/FencePanel';
import { makeHillTile }    from './prefabs/HillTile';
import { makeTree }        from './prefabs/Tree';
import { makeBuildingBox } from './prefabs/BuildingBox';

// 1) Lista pentru UI (Build Palette)
export const PROP_TYPES = [
  { key: 'road.segment',  label: 'Șosea 2×4 m' },
  { key: 'fence.panel',   label: 'Panou gard 2 m' },
  { key: 'hill.tile',     label: 'Bucată munte' },
  { key: 'tree',          label: 'Copac' },
  { key: 'building.box',  label: 'Clădire (box)' },
];

// 2) Parametri impliciți pentru fiecare tip
export function defaultParams(type) {
  switch (type) {
    case 'road.segment': return { w: 2, d: 4, h: 0.05 };
    case 'fence.panel':  return { L: 2, H: 1.6 };
    case 'hill.tile':    return { size: 2, h: 0.6, asRock: false };
    case 'tree':         return {};
    case 'building.box': return { w: 4, d: 6, h: 3 };
    default:             return {};
  }
}

// 3) Factory – returnează un THREE.Object3D pentru tipul cerut
export function createMeshForType(type, params = {}) {
  const p = { ...defaultParams(type), ...params };

  switch (type) {
    case 'road.segment': {
      const m = makeRoadSegment(p);
      m.userData.__type = type;
      return m;
    }
    case 'fence.panel': {
      const g = makeFencePanel(p);
      g.userData.__type = type;
      return g;
    }
    case 'hill.tile': {
      const m = makeHillTile(p);
      m.userData.__type = type;
      return m;
    }
    case 'tree': {
      const g = makeTree();
      g.userData.__type = type;
      return g;
    }
    case 'building.box': {
      const m = makeBuildingBox(p);
      m.userData.__type = type;
      return m;
    }
    default: {
      // fallback – un marker mic (să nu crape nimic)
      const geo = new THREE.SphereGeometry(0.2, 12, 10);
      const mat = new THREE.MeshStandardMaterial({ color: 0xff0077 });
      const m = new THREE.Mesh(geo, mat);
      m.userData.__type = 'unknown';
      return m;
    }
  }
}