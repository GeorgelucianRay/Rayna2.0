// RampSlopeGrass.js – rampă solidă (paralelipiped înclinat) cu iarbă
import * as THREE from 'three';
// <-- doar dacă vrei să folosești normal map .exr
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

/**
 * @param {object} o
 * @param {number} o.w    lățime (default 12 m – cât drumul)
 * @param {number} o.len  lungime (default 90 m – cât curtea)
 * @param {number} o.slopeFactor  panta (0.10 = 10%)
 * @param {number} o.h    grosime/înălțime “miez” (0.5 m – ca să fie plină)
 * @param {number} o.y    nivelul faței de jos în partea “de jos” a rampei
 */
export function makeRampSlopeGrass({
  w = 12,
  len = 90,
  slopeFactor = 0.10,  // ≈ 10%
  h = 0.5,
  y = 0.05
} = {}) {

  // 1) Geometrie: pornim de la o BoxGeometry și o "înclinăm" pe axa Z
  const rise = len * slopeFactor; // cât urcă pe lungime
  const geo = new THREE.BoxGeometry(w, h, len, 1, 1, 1);

  // mutăm vârfurile: y += f(z) => obținem un paralelipiped înclinat (solid)
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    // z este în [-len/2, +len/2]; normalizăm la [0..1] și înmulțim cu rise
    const factor = (z + len / 2) / len;
    const extraY = factor * rise;
    pos.setY(i, pos.getY(i) + extraY);
  }
  pos.needsUpdate = true;

  // fața de jos (la capătul “de jos” al rampei) să stea pe y = 0 + offset mic
  geo.translate(0, h / 2 + y, 0);

  // 2) Texturi – iarbă (culoare) + opțional normal map din .exr
  const loader = new THREE.TextureLoader();
  const color = loader.load('/textures/lume/Iarba.jpg');
  color.wrapS = color.wrapT = THREE.RepeatWrapping;
  // scalează tilingul ca să arate natural pe 12×90; ajustează după gust
  color.repeat.set(len / 3, w / 3);
  color.anisotropy = 8;
  color.colorSpace = THREE.SRGBColorSpace;

  // normal map .exr (opțional). Dacă nu vrei EXR, comentează blocul și folosește un .jpg/.png
  let normal = null;
  try {
    normal = new EXRLoader().load('/textures/lume/Iarba_nor.exr');
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
    normal.repeat.copy(color.repeat);
    // EXR-urile sunt already-linear
    normal.colorSpace = THREE.LinearSRGBColorSpace || THREE.NoColorSpace;
    normal.anisotropy = 8;
    // uneori EXR vine cu axa Y inversată – dacă vezi artefacte, încearcă:
    // normal.flipY = false;
  } catch (e) {
    console.warn('[RampSlopeGrass] normal EXR nu a putut fi încărcat, continui fără.', e);
  }

  const mat = new THREE.MeshStandardMaterial({
    map: color,
    normalMap: normal || null,
    roughness: 1.0,
    metalness: 0.0
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  // Mic “bias” ca să nu se zbată cu asfaltul la intersecție (dacă o pui peste curte)
  mesh.position.y += 0.0001;

  return mesh;
}