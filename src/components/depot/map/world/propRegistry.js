import { makeRoundabout } from './prefabs/Roundabout.js';

export const PROP_TYPES = [
  { key: 'road.segment', label: 'Șosea 12×40 m' },
  { key: 'road.roundabout', label: 'Sens giratoriu Ø40 / bandă 12' },
  { key: 'fence.panel', label: 'Panou gard 2 m' },
  { key: 'hill.tile', label: 'Bucată munte' },
  { key: 'tree', label: 'Copac' },
  { key: 'building.box', label: 'Clădire (box)' },
];

export function createMeshFor(type, opts = {}) {
  switch (type) {
    case 'road.segment':
      return makeRoadSegment({ w: 12, d: 40, h: 0.02, ...opts });
    case 'road.roundabout':
      return makeRoundabout({ outerR: 20, ringW: 12, h: 0.02, ...opts });

    case 'fence.panel':
      return makeFencePanel({ L: 2, H: 1.6, ...opts });
    case 'hill.tile':
      return makeHillTile({ size: 2, h: 0.6, asRock: false, ...opts });
    case 'tree':
      return makeTree();
    case 'building.box':
      return makeBuildingBox({ w: 4, d: 6, h: 3, ...opts });

    default: {
      const axes = new THREE.AxesHelper(1);
      axes.userData.__unknownType = type;
      return axes;
    }
  }
}