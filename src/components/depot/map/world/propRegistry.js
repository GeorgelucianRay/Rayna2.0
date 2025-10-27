// src/components/depot/map/world/propRegistry.js

// ===== MODIFICARE: Am scos "prefabs/" din căile de import =====
import { makeRoadSegment } from './RoadSegment';
import { makeFencePanel } from './FencePanel';
import { makeHillTile }   from './HillTile';
import { makeTree }       from './Tree';
import { makeBuildingBox }from './BuildingBox';
// ===== SFÂRȘIT MODIFICARE =====

/** Tipurile care apar în UI (Navbar3D) */
export const PROP_TYPES = [
  { key: 'road.segment',  label: 'Șosea 2×4 m' },
  { key: 'fence.panel',   label: 'Panou gard 2 m' },
  { key: 'hill.tile',     label: 'Bucată munte' },
  { key: 'tree',          label: 'Copac' },
  { key: 'building.box',  label: 'Clădire (box)' },
];

/** Mapare key -> factory */
const FACTORIES = {
  'road.segment':  (params) => makeRoadSegment(params),
  'fence.panel':   (params) => makeFencePanel(params),
  'hill.tile':     (params) => makeHillTile?.(params),
  'tree':          (params) => makeTree?.(params),
  'building.box':  (params) => makeBuildingBox?.(params)
};

/** Creează mesh pentru un tip */
export function createMeshFor(type, params = {}) {
  const f = FACTORIES[type];
  return f ? f(params) : null;
}

/** Pentru UI: listează tipuri + etichete */
export function listPropTypes() {
  return PROP_TYPES.map(t => t.key);
}
export function getLabelFor(type) {
  return PROP_TYPES.find(t => t.key === type)?.label ?? type;
}
