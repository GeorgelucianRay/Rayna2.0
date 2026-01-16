// ASCII quotes only

export const TREE_LAYOUT_VERSION = 1;

// Layout curatat:
// - pastram X=47 cu Z din 3 in 3 (28 ... -28)
// - pastram Z=-32 cu X din 3 in 3 (46 ... -48)
// - scoatem toate [40,*,23] si [-27,*, -30]
// - corectam Y la [-38,*, -32] in 0.05
export const TREE_PROPS = [
  // Column: X=47
  { x: 47, y: 0.05, z: 28, rotY: 0 },
  { x: 47, y: 0.05, z: 25, rotY: 0 },
  { x: 47, y: 0.05, z: 22, rotY: 0 },
  { x: 47, y: 0.05, z: 19, rotY: 0 },
  { x: 47, y: 0.05, z: 17, rotY: 0 },
  { x: 47, y: 0.05, z: 14, rotY: 0 },
  { x: 47, y: 0.05, z: 11, rotY: 0 },
  { x: 47, y: 0.05, z: 8, rotY: 0 },
  { x: 47, y: 0.05, z: 5, rotY: 0 },
  { x: 47, y: 0.05, z: 2, rotY: 0 },
  { x: 47, y: 0.05, z: -1, rotY: 0 },
  { x: 47, y: 0.05, z: -4, rotY: 0 },
  { x: 47, y: 0.05, z: -7, rotY: 0 },
  { x: 47, y: 0.05, z: -10, rotY: 0 },
  { x: 47, y: 0.05, z: -13, rotY: 0 },
  { x: 47, y: 0.05, z: -16, rotY: 0 },
  { x: 47, y: 0.05, z: -19, rotY: 0 },
  { x: 47, y: 0.05, z: -22, rotY: 0 },
  { x: 47, y: 0.05, z: -25, rotY: 0 },
  { x: 47, y: 0.05, z: -28, rotY: 0 },

  // Row: Z=-32
  { x: 46, y: 0.05, z: -32, rotY: 0 },
  { x: 43, y: 0.05, z: -32, rotY: 0 },
  { x: 40, y: 0.05, z: -32, rotY: 0 },
  { x: 37, y: 0.05, z: -32, rotY: 0 },
  { x: 34, y: 0.05, z: -32, rotY: 0 },
  { x: 31, y: 0.05, z: -32, rotY: 0 },
  { x: 28, y: 0.05, z: -32, rotY: 0 },
  { x: 25, y: 0.05, z: -32, rotY: 0 },
  { x: 22, y: 0.05, z: -32, rotY: 0 },
  { x: 19, y: 0.05, z: -32, rotY: 0 },
  { x: 16, y: 0.05, z: -32, rotY: 0 },
  { x: 13, y: 0.05, z: -32, rotY: 0 },
  { x: 10, y: 0.05, z: -32, rotY: 0 },
  { x: 7, y: 0.05, z: -32, rotY: 0 },
  { x: 4, y: 0.05, z: -32, rotY: 0 },
  { x: 1, y: 0.05, z: -32, rotY: 0 },
  { x: -2, y: 0.05, z: -32, rotY: 0 },
  { x: -5, y: 0.05, z: -32, rotY: 0 },
  { x: -8, y: 0.05, z: -32, rotY: 0 },
  { x: -11, y: 0.05, z: -32, rotY: 0 },
  { x: -14, y: 0.05, z: -32, rotY: 0 },
  { x: -17, y: 0.05, z: -32, rotY: 0 },
  { x: -20, y: 0.05, z: -32, rotY: 0 },
  { x: -23, y: 0.05, z: -32, rotY: 0 },
  { x: -26, y: 0.05, z: -32, rotY: 0 },
  { x: -29, y: 0.05, z: -32, rotY: 0 },
  { x: -32, y: 0.05, z: -32, rotY: 0 },
  { x: -35, y: 0.05, z: -32, rotY: 0 },
  { x: -38, y: 0.05, z: -32, rotY: 0 }, // corectat din -0.05
  { x: -41, y: 0.05, z: -32, rotY: 0 },
  { x: -44, y: 0.05, z: -32, rotY: 0 },
  { x: -48, y: 0.05, z: -32, rotY: 0 }
];