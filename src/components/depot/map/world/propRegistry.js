// world/propRegistry.js
import { makeRoadSegment } from './prefabs/RoadSegment';
import { makeFencePanel } from './prefabs/FencePanel';
import { makeHillTile } from './prefabs/HillTile';
import { makeTree } from './prefabs/Tree';
import { makeBuildingBox } from './prefabs/BuildingBox';

export const PROP_TYPES = [
  { key:'road.segment', label:'Șosea 2×4m' },
  { key:'fence.panel', label:'Panou gard 2m' },
  { key:'hill.tile',   label:'Bucată munte' },
  { key:'tree',        label:'Copac' },
  { key:'building.box',label:'Clădire box' },
];

export function createMeshFor(type, params) {
  switch (type) {
    case 'road.segment': return makeRoadSegment(params);
    case 'fence.panel':  return makeFencePanel(params);
    case 'hill.tile':    return makeHillTile(params);
    case 'tree':         return makeTree(params);
    case 'building.box': return makeBuildingBox(params);
    default: return null;
  }
}