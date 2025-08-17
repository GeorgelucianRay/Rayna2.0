// src/components/threeWorld/slotToWorld.js
import * as THREE from 'three';

/**
 * Enhanced slot-to-world conversion with better error handling and consistency
 */

// Shared constants - consider moving to a shared config file
const SLOT_DIMENSIONS = {
  LENGTH_20: 6.06,      // 20' container length
  LENGTH_40: 12.19,     // 40' container length  
  WIDTH: 2.44,          // Container width
  HEIGHT: 2.59,         // Standard container height
  GAP: 0.06,           // Gap between slots
  LANE_GAP: 0.10       // Gap between lanes
};

const STEP = SLOT_DIMENSIONS.LENGTH_20 + SLOT_DIMENSIONS.GAP;

export function slotToWorld(
  { lane, index, tier = 'A', sizeFt = 20 },
  {
    abcOffsetX = 0,
    defOffsetX = 0,
    abcToDefGap = -10,
    abcNumbersReversed = false,
  } = {}
) {
  // Validate inputs
  if (!lane || !index) {
    throw new Error(`Invalid slot: lane=${lane}, index=${index}`);
  }
  
  const laneUpper = lane.toUpperCase();
  
  // Validate lane
  if (!'ABCDEF'.includes(laneUpper)) {
    throw new Error(`Invalid lane: ${lane}. Must be A-F`);
  }
  
  // Validate index ranges
  const isABC = 'ABC'.includes(laneUpper);
  const maxIndex = isABC ? 10 : 7;
  
  if (index < 1 || index > maxIndex) {
    throw new Error(`Invalid index ${index} for lane ${laneUpper}. Range: 1-${maxIndex}`);
  }
  
  // Base positions (synchronized with createGround.js)
  const ABC_BASE_Z = -4.0;
  const ABC_BASE_X = abcOffsetX;
  
  // ABC lanes Z positions (horizontal lanes)
  const ABC_ROW_Z = {
    A: ABC_BASE_Z,
    B: ABC_BASE_Z - (SLOT_DIMENSIONS.WIDTH + SLOT_DIMENSIONS.LANE_GAP),
    C: ABC_BASE_Z - 2 * (SLOT_DIMENSIONS.WIDTH + SLOT_DIMENSIONS.LANE_GAP),
  };
  
  // DEF columns X positions (vertical lanes)
  const DEF_BASE_X = 4.0 + defOffsetX;
  const DEF_COL_X = {
    D: DEF_BASE_X,
    E: DEF_BASE_X + (SLOT_DIMENSIONS.WIDTH + SLOT_DIMENSIONS.LANE_GAP),
    F: DEF_BASE_X + 2 * (SLOT_DIMENSIONS.WIDTH + SLOT_DIMENSIONS.LANE_GAP),
  };
  
  // DEF starting position on Z
  const START_Z_DEF = ABC_ROW_Z.C + abcToDefGap;
  
  // Calculate tier height
  const tierIndex = Math.max(0, (tier?.toUpperCase().charCodeAt(0) ?? 65) - 65);
  const tierHeight = SLOT_DIMENSIONS.HEIGHT * (tierIndex + 0.5);
  
  // Container dimensions
  const containerLength = sizeFt === 40 ? SLOT_DIMENSIONS.LENGTH_40 : SLOT_DIMENSIONS.LENGTH_20;
  const sizeMeters = {
    len: containerLength,
    wid: SLOT_DIMENSIONS.WIDTH,
    ht: SLOT_DIMENSIONS.HEIGHT
  };
  
  const position = new THREE.Vector3();
  let rotationY = 0;
  
  if (isABC) {
    // ABC lanes - horizontal orientation
    const z = ABC_ROW_Z[laneUpper];
    
    // Handle reversed numbering if enabled
    const effectiveIndex = abcNumbersReversed ? (11 - index) : index;
    
    if (sizeFt === 20) {
      // 20' container - centered in single slot
      const x = ABC_BASE_X - (effectiveIndex - 0.5) * STEP;
      position.set(x, tierHeight, z);
    } else {
      // 40' container - spans two slots
      if (effectiveIndex >= maxIndex) {
        console.warn(`40' container at index ${index} may extend beyond lane boundary`);
      }
      const x = ABC_BASE_X - effectiveIndex * STEP;
      position.set(x, tierHeight, z);
    }
    
    rotationY = 0; // Aligned with X axis
    
  } else {
    // DEF lanes - vertical orientation
    const x = DEF_COL_X[laneUpper];
    
    if (sizeFt === 20) {
      // 20' container - centered in single slot
      const z = START_Z_DEF + (index - 0.5) * STEP;
      position.set(x, tierHeight, z);
    } else {
      // 40' container - spans two slots
      if (index >= maxIndex) {
        console.warn(`40' container at index ${index} may extend beyond lane boundary`);
      }
      const z = START_Z_DEF + index * STEP;
      position.set(x, tierHeight, z);
    }
    
    rotationY = Math.PI / 2; // Aligned with Z axis
  }
  
  return {
    position,
    rotationY,
    sizeMeters,
    // Additional debug info
    debug: {
      lane: laneUpper,
      index,
      tier,
      sizeFt,
      effectiveIndex: isABC && abcNumbersReversed ? (11 - index) : index
    }
  };
}

/**
 * Reverse conversion: world position to slot
 * Useful for hit testing and debugging
 */
export function worldToSlot(position, config = {}) {
  // Implementation for reverse lookup
  // This would help with debugging positioning issues
  // ... implementation details ...
}