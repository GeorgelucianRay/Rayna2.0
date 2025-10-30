// src/components/depot/map/threeWorld/createFence.js
import * as THREE from 'three';

const TEX_FENCE = '/textures/lume/gard_textura.png';

/**
 * createFence
 * Params:
 *  - width, depth: dimensiunile curții (m)
 *  - margin: cât "în afară" față de contur
 *  - postEvery: distanța între stâlpi (0 => fără stâlpi)
 *  - openings: goluri de gard (porți), în coordonate lume:
 *      {
 *        west:  [{ z: -4, width: 4 }, { z: -7, width: 4 }, ...],
 *        east:  [{ z:  10, width: 6 }],
 *        north: [{ x:  12, width: 5 }],
 *        south: [{ x: -20, width: 5 }]
 *      }
 */
export default function createFence({
  width,
  depth,
  margin = 0.5,
  postEvery = 10,
  openings = { west: [], east: [], north: [], south: [] }
}) {
  const W = width, D = depth;
  const halfW = W / 2, halfD = D / 2;

  // — textură plasă —
  const loader = new THREE.TextureLoader();
  const fenceTex = loader.load(TEX_FENCE);
  fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping;

  const baseFenceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: fenceTex,
    alphaMap: fenceTex,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.0
  });

  const fenceH = 2;

  // util: din [ -L/2 , +L/2 ] scădem intervalele golurilor și returnăm segmente
  function splitByGaps(L, gaps) {
    // gaps: [{ c: center, w: width }] pe axa locală (X pentru nord/sud, Z pentru est/vest)
    // normalizăm la perechi [a, b] în intervalul [-L/2, +L/2]
    const ivs = (gaps || []).map(({ c, w }) => [c - w/2, c + w/2])
      .map(([a, b]) => [Math.max(a, -L/2), Math.min(b, L/2)])
      .filter(([a, b]) => b > a)
      .sort((A, B) => A[0] - B[0]);

    const segs = [];
    let cur = -L/2;
    for (const [a, b] of ivs) {
      if (a > cur) segs.push([cur, a]); // segment gard înainte de gol
      cur = Math.max(cur, b);
    }
    if (cur < L/2) segs.push([cur, L/2]); // segment după ultimul gol
    return segs;
  }

  // face o bucată (plane) de gard de lungime `len`, cu tiling corect
  function makeFencePlane(len) {
    const geo = new THREE.PlaneGeometry(len, fenceH);
    const mat = baseFenceMat.clone();
    mat.map = baseFenceMat.map.clone();
    mat.alphaMap = mat.map;
    mat.map.repeat.set(len / 6, 1); // tiling simplu: 1 unitate textură ~ 6m
    const m = new THREE.Mesh(geo, mat);
    m.position.y = fenceH / 2;
    m.userData.collider = 'solid';
    return m;
  }

  const group = new THREE.Group();
  group.name = 'Fence';
  group.userData.collider = 'solid';

  // === WEST (x = -halfW - margin), variază pe Z ∈ [-halfD, +halfD]
  // mapăm golurile în coordonate locale: c_local = z_world (același)
  {
    const gaps = (openings.west || []).map(({ z, width }) => ({ c: z, w: width }));
    const segs = splitByGaps(D, gaps);
    for (const [a, b] of segs) {
      const len = b - a;
      const m = makeFencePlane(len);
      m.rotation.y = Math.PI / 2;
      m.position.set(-halfW - margin, fenceH/2, (a + b) / 2);
      group.add(m);
    }
  }

  // === EAST (x = +halfW + margin), variază pe Z
  {
    const gaps = (openings.east || []).map(({ z, width }) => ({ c: z, w: width }));
    const segs = splitByGaps(D, gaps);
    for (const [a, b] of segs) {
      const len = b - a;
      const m = makeFencePlane(len);
      m.rotation.y = -Math.PI / 2;
      m.position.set(halfW + margin, fenceH/2, (a + b) / 2);
      group.add(m);
    }
  }

  // === NORTH (z = +halfD + margin), variază pe X
  {
    const gaps = (openings.north || []).map(({ x, width }) => ({ c: x, w: width }));
    const segs = splitByGaps(W, gaps);
    for (const [a, b] of segs) {
      const len = b - a;
      const m = makeFencePlane(len);
      m.rotation.y = Math.PI; // plasa corect orientată
      m.position.set((a + b) / 2, fenceH/2, halfD + margin);
      group.add(m);
    }
  }

  // === SOUTH (z = -halfD - margin), variază pe X
  {
    const gaps = (openings.south || []).map(({ x, width }) => ({ c: x, w: width }));
    const segs = splitByGaps(W, gaps);
    for (const [a, b] of segs) {
      const len = b - a;
      const m = makeFencePlane(len);
      // rotație implicită (0) e ok pentru sud
      m.position.set((a + b) / 2, fenceH/2, -halfD - margin);
      group.add(m);
    }
  }

  // === stâlpi opc. (la capete și la fiecare postEvery) ===
  if (postEvery > 0) {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 1 });
    const postGeo = new THREE.CylinderGeometry(0.03, 0.03, fenceH, 8);

    const addPost = (x, z) => {
      const p = new THREE.Mesh(postGeo, postMat);
      p.position.set(x, fenceH / 2, z);
      p.userData.collider = 'solid';
      group.add(p);
    };

    // helper: pune stâlpi de-a lungul unei laturi, respectând golurile
    function postsAlongX(zConst, gapsX) {
      const segs = splitByGaps(W, (gapsX || []).map(({ x, width }) => ({ c: x, w: width })));
      for (const [a, b] of segs) {
        for (let x = Math.ceil((a + halfW) / postEvery) * postEvery - halfW; x <= b; x += postEvery) {
          addPost(x, zConst);
        }
        // capetele segmentelor
        addPost(a, zConst); addPost(b, zConst);
      }
    }
    function postsAlongZ(xConst, gapsZ) {
      const segs = splitByGaps(D, (gapsZ || []).map(({ z, width }) => ({ c: z, w: width })));
      for (const [a, b] of segs) {
        for (let z = Math.ceil((a + halfD) / postEvery) * postEvery - halfD; z <= b; z += postEvery) {
          addPost(xConst, z);
        }
        addPost(xConst, a); addPost(xConst, b);
      }
    }

    postsAlongX( halfD + margin, openings.north);
    postsAlongX(-halfD - margin, openings.south);
    postsAlongZ( halfW + margin, openings.east);
    postsAlongZ(-halfW - margin, openings.west);
  }

  return group;
}