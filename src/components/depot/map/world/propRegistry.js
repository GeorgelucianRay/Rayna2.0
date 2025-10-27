// Registry-ul obiectelor plasabile + fabricile de mesh-uri.
// IMPORTANT: exportăm *named* `createMeshFor` (fix pentru eroarea din Vercel).

import * as THREE from 'three';

// Prefab-uri – atenție la numele și literele din căi (Linux e case-sensitive)
import { makeRoadSegment }  from './prefabs/RoadSegment.js';
import { makeFencePanel }   from './prefabs/FencePanel.js';
import { makeHillTile }     from './prefabs/HillTile.js';
import { makeTree }         from './prefabs/Tree.js';
import { makeBuildingBox }  from './prefabs/BuildingBox.js';

// Lista de tipuri afișată în UI (BuildPalette)
export const PROP_TYPES = [
  { key: 'road.segment', label: 'Șosea 2×4 m' },
  { key: 'fence.panel',  label: 'Panou gard 2 m' },
  { key: 'hill.tile',    label: 'Bucată munte' },
  { key: 'tree',         label: 'Copac' },
  { key: 'building.box', label: 'Clădire (box)' },
];

// Pasul de rotație folosit de controller (90°)
export const ROT_STEP = Math.PI / 2;

/**
 * Creează mesh-ul pentru un tip dat.
 * @param {string} type  – cheie din PROP_TYPES
 * @param {object} opts  – opțiuni specifice prefab-ului
 * @returns {THREE.Object3D}
 */
export function createMeshFor(type, opts = {}) {
  switch (type) {
    case 'road.segment':
      // 2×4 m, foarte jos (ca să nu "iasă" din asfalt)
      return makeRoadSegment({ w: 2, d: 4, h: 0.05, ...opts });

    case 'fence.panel':
      return makeFencePanel({ L: 2, H: 1.6, ...opts });

    case 'hill.tile':
      return makeHillTile({ size: 2, h: 0.6, asRock: false, ...opts });

    case 'tree':
      return makeTree();

    case 'building.box':
      return makeBuildingBox({ w: 4, d: 6, h: 3, ...opts });

    default: {
      // Fallback vizibil: un AxesHelper, ca să știi dacă ai o cheie greșită
      const axes = new THREE.AxesHelper(1);
      axes.userData.__unknownType = type;
      return axes;
    }
  }
}