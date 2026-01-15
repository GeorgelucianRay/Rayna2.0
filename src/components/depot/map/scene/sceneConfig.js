// src/components/depot/map/scene/sceneConfig.js
import * as THREE from "three";

export const YARD_WIDTH = 90;
export const YARD_DEPTH = 60;
export const YARD_COLOR = 0x9aa0a6;

const SLOT_LEN = 6.06;
const SLOT_GAP = 0.06;
const STEP = SLOT_LEN + SLOT_GAP;
const ABC_CENTER_OFFSET_X = 5 * STEP;

export const CFG = {
  ground: {
    width: YARD_WIDTH,
    depth: YARD_DEPTH,
    color: YARD_COLOR,
    abcOffsetX: ABC_CENTER_OFFSET_X,
    defOffsetX: 32.3,
    abcToDefGap: -6.2,
    abcNumbersReversed: true,
  },
  fence: {
    margin: 2,
    postEvery: 10,
    gate: { side: "west", width: 10, centerZ: -6.54, tweakZ: 0 },
  },
};

export function makeBounds() {
  return {
    minX: -YARD_WIDTH / 2 + 2,
    maxX: YARD_WIDTH / 2 - 2,
    minZ: -YARD_DEPTH / 2 + 2,
    maxZ: YARD_DEPTH / 2 - 2,
  };
}

export function makeOrbitClamp() {
  const yardPad = 0.5;
  const yardMinX = -YARD_WIDTH / 2 + yardPad;
  const yardMaxX = YARD_WIDTH / 2 - yardPad;
  const yardMinZ = -YARD_DEPTH / 2 + yardPad;
  const yardMaxZ = YARD_DEPTH / 2 - yardPad;

  return function clampOrbit(camera, controls) {
    if (!camera || !controls) return;
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, yardMinX, yardMaxX);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, yardMinZ, yardMaxZ);
    if (camera.position.y < 0.5) camera.position.y = 0.5;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, yardMinX, yardMaxX);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, yardMinZ, yardMaxZ);
  };
}

export function makeAutoOrbit() {
  return {
    angle: 0,
    speed: Math.PI / 28,
    radius: Math.hypot(YARD_WIDTH, YARD_DEPTH) * 0.55,
    height: 10,
    target: new THREE.Vector3(0, 1, 0),
    clockwise: true,
  };
}