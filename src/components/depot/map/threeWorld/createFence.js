import * as THREE from 'three';

const TEX_FENCE = '/textures/lume/gard_textura.png';

export default function createFence({
  width,
  depth,
  margin = 0.5,
  postEvery = 10,
  openings = { west: [], east: [], north: [], south: [] }, // 👈 NOU
}) {
  const W = width, D = depth;
  const halfW = W / 2, halfD = D / 2;

  const loader = new THREE.TextureLoader();
  const fenceTex = loader.load(TEX_FENCE);
  fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping;

  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: fenceTex,
    alphaMap: fenceTex,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.0
  });

  const fenceHeight = 2;

  function makeSide(len) {
    const geo = new THREE.PlaneGeometry(len, fenceHeight);
    const mesh = new THREE.Mesh(geo, fenceMat);
    mesh.position.y = fenceHeight / 2;
    return mesh;
  }

  // taie o latură după o listă de goluri [{center,width}]
  function buildSideWithOpenings(totalLen, gaps, axis = 'z') {
    // convertim la segmente fără gard între (center - width/2) și (center + width/2)
    const sorted = (gaps || []).slice().sort((a,b) => a.z - b.z);
    const segs = [];
    let cursor = -totalLen / 2;

    for (const g of sorted) {
      const gapStart = Math.max(-totalLen/2, g.z - g.width/2);
      const gapEnd   = Math.min( totalLen/2, g.z + g.width/2);
      // segment înaintea golului
      const beforeLen = gapStart - cursor;
      if (beforeLen > 0.001) {
        const m = makeSide(beforeLen);
        // textură: tiling pe lungime
        fenceTex.repeat.set(beforeLen / 6, 1);
        if (axis === 'z') m.position[axis] = cursor + beforeLen / 2;
        else              m.position[axis] = cursor + beforeLen / 2;
        segs.push(m);
      }
      // sărim peste gol
      cursor = gapEnd;
    }

    // segment după ultimul gol
    const afterLen = totalLen/2 - cursor;
    if (afterLen > 0.001) {
      const m = makeSide(afterLen);
      fenceTex.repeat.set(afterLen / 6, 1);
      m.position[axis] = cursor + afterLen / 2;
      segs.push(m);
    }
    return segs;
  }

  const group = new THREE.Group();
  group.name = 'Fence';

  // NORD (+Z) — fără goluri (poți extinde analog cu openings.north)
  {
    const north = makeSide(W);
    fenceTex.repeat.set(W / 6, 1);
    north.rotation.y = Math.PI;
    north.position.set(0, 0, halfD + margin);
    group.add(north);
  }

  // SUD (-Z)
  {
    const south = makeSide(W);
    fenceTex.repeat.set(W / 6, 1);
    south.position.set(0, 0, -halfD - margin);
    group.add(south);
  }

  // EST (+X)
  {
    const east = makeSide(D);
    fenceTex.repeat.set(D / 6, 1);
    east.rotation.y = -Math.PI / 2;
    east.position.set(halfW + margin, 0, 0);
    group.add(east);
  }

  // VEST (-X) — cu goluri (openings.west, definite în coordonate Z)
  {
    const westSegs = buildSideWithOpenings(D, openings.west, 'z');
    for (const seg of westSegs) {
      seg.rotation.y = Math.PI / 2;
      seg.position.x = -halfW - margin;
      group.add(seg);
    }
  }

  // Stâlpi (opțional) – lasă-i dacă vrei, dar NU vor apărea în goluri
  const postMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 1 });
  const postGeo = new THREE.CylinderGeometry(0.03, 0.03, fenceHeight, 8);

  // stâlpi pe latura VEST, cu sărit peste goluri
  (function addWestPosts() {
    const gaps = (openings.west || []).slice().sort((a,b)=>a.z-b.z);
    const isInGap = (z) => gaps.some(g => z >= g.z - g.width/2 && z <= g.z + g.width/2);
    for (let z = -halfD; z <= halfD; z += postEvery) {
      if (isInGap(z)) continue;
      const p = new THREE.Mesh(postGeo, postMat);
      p.position.set(-halfW - margin, fenceHeight/2, z);
      group.add(p);
    }
  })();

  // stâlpi pentru celelalte laturi (fără goluri – simplu)
  for (let x = -halfW; x <= halfW; x += postEvery) {
    const pN = new THREE.Mesh(postGeo, postMat);
    pN.position.set(x, fenceHeight/2, halfD + margin);
    group.add(pN);
    const pS = new THREE.Mesh(postGeo, postMat);
    pS.position.set(x, fenceHeight/2, -halfD - margin);
    group.add(pS);
  }
  for (let z = -halfD; z <= halfD; z += postEvery) {
    const pE = new THREE.Mesh(postGeo, postMat);
    pE.position.set(halfW + margin, fenceHeight/2, z);
    group.add(pE);
  }

  return group;
}