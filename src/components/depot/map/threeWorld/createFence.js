import * as THREE from 'three';

/**
 * Creează gardul împrejurul plăcii.
 * @param {object} opt
 *  - width, depth: dimensiunile interioare (în metri)
 *  - margin: distanța de la marginea plăcii (default 0.5)
 *  - postEvery: distanța între stâlpi (default 5m)
 *  - height: înălțimea plasei (default 1.8m)
 *  - texturePath: PNG cu transparență pentru plasă
 */
export default function createFence(opt = {}) {
  const {
    width = 90,
    depth = 60,
    margin = 0.5,
    postEvery = 5,
    height = 1.8,
    texturePath = '/textures/lume/gard_textura.png'
  } = opt;

  const group = new THREE.Group();

  // ── TEXTURA PLASEI ─────────────────────────────────────────────
  const tex = new THREE.TextureLoader().load(texturePath);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;

  // materialul panoului de plasă (fundal transparent)
  const meshMat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,       // respectă canalul alpha din PNG
    alphaTest: 0.25,         // elimină complet pixelii aproape transparenți
    roughness: 0.9,
    metalness: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false        // reduce artefactele de sortare pentru forme subțiri
  });

  // ── STÂLPI ────────────────────────────────────────────────────
  const postGeom = new THREE.CylinderGeometry(0.04, 0.04, height + 0.2, 8);
  const postMat  = new THREE.MeshStandardMaterial({
    color: 0x9aa0a6, metalness: 0.6, roughness: 0.4
  });

  function addPost(x, z) {
    const m = new THREE.Mesh(postGeom, postMat);
    m.position.set(x, (height + 0.2) / 2, z);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  }

  // ── PANOURI DE PLASĂ ──────────────────────────────────────────
  // panoul este un plane pe axa X (lungime = distanța dintre stâlpi), înălțime = height
  function addPanel(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);

    const geom = new THREE.PlaneGeometry(len, height, 1, 1);

    // repetăm textura în funcție de lungime ca să nu se întindă inestetic
    const repX = Math.max(1, Math.round(len / 2.0)); // ~2m per tile (ajustează la nevoie)
    tex.repeat.set(repX, Math.max(1, Math.round(height / 1.0)));

    const panel = new THREE.Mesh(geom, meshMat.clone());
    panel.material.map = tex.clone();   // fiecare panou își poate seta repeat-ul propriu
    panel.material.map.needsUpdate = true;

    // poziție & rotație
    panel.position.set((x1 + x2) / 2, height / 2, (z1 + z2) / 2);
    panel.rotation.y = Math.atan2(dx, dz); // orientăm plane-ul pe direcția segmentului

    group.add(panel);
  }

  // ── CONTUR ────────────────────────────────────────────────────
  const halfW = width / 2 + margin;
  const halfD = depth / 2 + margin;

  // parcurgem fiecare latură și așezăm stâlpi + panouri între ei
  function edge(xa, za, xb, zb, total) {
    const seg = postEvery;
    const steps = Math.max(1, Math.round(total / seg));
    const dx = (xb - xa) / steps;
    const dz = (zb - za) / steps;

    let prevX = xa, prevZ = za;
    addPost(prevX, prevZ);

    for (let i = 1; i <= steps; i++) {
      const x = xa + dx * i;
      const z = za + dz * i;
      addPost(x, z);
      addPanel(prevX, prevZ, x, z);
      prevX = x; prevZ = z;
    }
  }

  // latura N (z = -halfD)
  edge(-halfW, -halfD,  halfW, -halfD, 2 * halfW);
  // latura E (x =  halfW)
  edge( halfW, -halfD,  halfW,  halfD, 2 * halfD);
  // latura S (z =  halfD)
  edge( halfW,  halfD, -halfW,  halfD, 2 * halfW);
  // latura V (x = -halfW)
  edge(-halfW,  halfD, -halfW, -halfD, 2 * halfD);

  return group;
}