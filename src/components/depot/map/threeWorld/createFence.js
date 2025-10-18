import * as THREE from 'three';

/**
 * Creează gardul perimetral, cu opțiunea de a exclude o latură.
 */
export default function createFence({
  width = 80,
  depth = 50,
  postEvery = 10,
  excludeSide = null, // Opțiune: 'north', 'south', 'east', 'west'
  gate = { side: 'south', width: 8, centerX: 0, centerZ: 0 },
} = {}) {
  const g = new THREE.Group();
  const w = width / 2;
  const d = depth / 2;

  const postMat = new THREE.MeshStandardMaterial({ color: 0x9aaabc, metalness: 0.15, roughness: 0.8 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xa7b4c8, metalness: 0.15, roughness: 0.8 });
  const postGeo = new THREE.BoxGeometry(0.22, 1.8, 0.22);

  const addPost = (x, z) => {
    const p = new THREE.Mesh(postGeo, postMat);
    p.position.set(x, 0.9, z);
    p.castShadow = true;
    g.add(p);
  };

  if (excludeSide !== 'south') { for (let x = -w; x <= w; x += postEvery) addPost(x, -d); }
  if (excludeSide !== 'north') { for (let x = -w; x <= w; x += postEvery) addPost(x, d); }
  if (excludeSide !== 'west') { for (let z = -d; z <= d; z += postEvery) addPost(-w, z); }
  if (excludeSide !== 'east') { for (let z = -d; z <= d; z += postEvery) addPost(w, z); }

  const createRail = (len, isVertical) => {
    const railGeo = isVertical ? new THREE.BoxGeometry(0.1, 0.1, len) : new THREE.BoxGeometry(len, 0.1, 0.1);
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.castShadow = true;
    return rail;
  };
  
  const addSideRails = (side) => {
    if (excludeSide === side) return;

    const isGateSide = gate.side === side;
    const isVertical = side === 'west' || side === 'east';
    const totalLength = isVertical ? depth : width;
    const center = isVertical ? gate.centerZ : gate.centerX;
    const halfDim = isVertical ? d : w;

    const createAndAddRail = (pos, len, y) => {
        const rail = createRail(len, isVertical);
        if (isVertical) {
            rail.position.set(side === 'west' ? -w : w, y, pos);
        } else {
            rail.position.set(pos, y, side === 'south' ? -d : d);
        }
        g.add(rail);
    };

    if (!isGateSide || gate.width <= 0) {
        createAndAddRail(0, totalLength, 1.5);
        createAndAddRail(0, totalLength, 0.8);
    } else {
        const halfGate = gate.width / 2;
        const firstSegmentLen = Math.max(0.01, center - halfGate - (-halfDim));
        const secondSegmentLen = Math.max(0.01, halfDim - (center + halfGate));

        const firstSegmentPos = (-halfDim + (center - halfGate)) / 2;
        const secondSegmentPos = ((center + halfGate) + halfDim) / 2;

        if (firstSegmentLen > 0.01) {
            createAndAddRail(firstSegmentPos, firstSegmentLen, 1.5);
            createAndAddRail(firstSegmentPos, firstSegmentLen, 0.8);
        }
        if (secondSegmentLen > 0.01) {
            createAndAddRail(secondSegmentPos, secondSegmentLen, 1.5);
            createAndAddRail(secondSegmentPos, secondSegmentLen, 0.8);
        }
    }
  };

  addSideRails('south');
  addSideRails('north');
  addSideRails('west');
  addSideRails('east');

  return g;
}