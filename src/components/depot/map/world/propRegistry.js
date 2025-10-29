// src/components/depot/map/world/propRegistry.js
import * as THREE from 'three';

// Prefab-uri – importă TOT ce folosești mai jos
import { makeRoadSegment }  from './prefabs/RoadSegment.js';
import { makeFencePanel }   from './prefabs/FencePanel.js';
import { makeHillTile }     from './prefabs/HillTile.js';
import { makeTree }         from './prefabs/Tree.js';
import { makeBuildingBox }  from './prefabs/BuildingBox.js';
import { makeRoundabout }   from './prefabs/Roundabout.js';
import { makeSlopeRamp }    from './prefabs/SlopeRamp.js';
import { makeRampSlopeGrass } from './prefabs/RampSlopeGrass.js';
import { makeGrassPatch }   from './prefabs/GrassPatch.js';
import { makeTORQBuilding } from './prefabs/TORQBuilding.js';

export const PROP_TYPES = [
  { key: 'road.segment',     label: 'Șosea 12×40 m' },
  { key: 'road.roundabout',  label: 'Sens giratoriu Ø40 / bandă 12' },
  { key: 'road.ramp',        label: 'Pantă 90×12 (10%)' },
  { key: 'ramp.grass',       label: 'Rampă iarbă 12×90 (10%)' },
  { key: 'fence.panel',      label: 'Panou gard 2 m' },
  { key: 'hill.tile',        label: 'Bucată munte' },
  { key: 'tree',             label: 'Copac' },
  { key: 'building.box',     label: 'Clădire (box)' },
  { key: 'vegetation.grass', label: 'Pâlc de iarbă (x50)' },
  { key: 'building.torq',    label: 'Clădire TORQ' },
];

export const ROT_STEP = Math.PI / 2;

export function createMeshFor(type, opts = {}) {
  switch (type) {
    case 'road.segment':
      return makeRoadSegment({ w: 12, d: 40, h: 0.02, ...opts });

    case 'road.roundabout':
      return makeRoundabout({ outerR: 20, ringW: 12, h: 0.02, ...opts });

    case 'road.ramp':
      return makeSlopeRamp({ L: 90, W: 12, angleDeg: 5.7105931375, ...opts });

    case 'ramp.grass':
      return makeRampSlopeGrass({ w: 12, len: 90, slopeFactor: 0.10, h: 0.5, y: 0.05, ...opts });

    case 'vegetation.grass':
      return makeGrassPatch({ count: 50, spread: 6 });

    case 'fence.panel':
      return makeFencePanel({ L: 2, H: 1.6, ...opts });

    case 'hill.tile':
      return makeHillTile({ size: 2, h: 0.6, asRock: false, ...opts });

    case 'tree':
      return makeTree();

    case 'building.box':
      return makeBuildingBox({ w: 4, d: 6, h: 3, ...opts });

    case 'building.torq':
      // Lăsăm toate texturile și parametrii să fie decideți în prefab.
      // Dacă vrei să treci altele dinamic, folosește `opts`.
      return makeTORQBuilding({ ...opts });

    default: {
      const axes = new THREE.AxesHelper(1);
      axes.userData.__unknownType = type;
      return axes;
    }
  }
}