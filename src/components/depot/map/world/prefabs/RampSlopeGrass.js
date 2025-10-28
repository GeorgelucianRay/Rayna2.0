// RampSlopeGrass.js – rampă solidă cu iarbă, direcție configurabilă
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

export function makeRampSlopeGrass({
  w = 12,          // lățime
  len = 90,        // lungime
  slopeFactor = 0.10, // ~10%
  h = 0.5,         // grosime (solid)
  y = 0.05,        // offset față de 0
  axis = 'z',      // 'z' (față-spate) sau 'x' (stânga-dreapta)
  reverse = false  // true = urcă spre -Z / -X
} = {}) {

  const rise = len * slopeFactor;
  const geo = new THREE.BoxGeometry(w, h, len, 1, 1, 1);

  // înclinare pe axa aleasă
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const coord = (axis === 'x') ? pos.getX(i) : pos.getZ(i);     // X sau Z
    // coord e în [-dim/2, +dim/2]
    const factor = reverse
      ? ( (len / 2) - coord ) / len   // urcă spre -axis
      : ( (coord + len / 2) / len );  // urcă spre +axis
    const extraY = factor * rise;
    pos.setY(i, pos.getY(i) + extraY);
  }
  pos.needsUpdate = true;

  // sprijină „talpa” jos pe y + offset
  geo.translate(0, h / 2 + y, 0);

  // TEXTURI (iarbă)
  const tLoader = new THREE.TextureLoader();
  const color = tLoader.load('/textures/lume/Iarba.jpg');
  color.wrapS = color.wrapT = THREE.RepeatWrapping;
  // tiling ok pentru 12×90; ajustează după gust
  // dacă rampa e pe X, întoarcem repeat-urile
  if (axis === 'x') color.repeat.set(w / 3, len / 3);
  else              color.repeat.set(len / 3, w / 3);
  color.anisotropy = 8;
  color.colorSpace = THREE.SRGBColorSpace;

  let normal = null;
  try {
    normal = new EXRLoader().load('/textures/lume/Iarba_nor.exr');
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
    if (axis === 'x') normal.repeat.set(w / 3, len / 3);
    else              normal.repeat.set(len / 3, w / 3);
    // normal.flipY = false; // dacă vezi artefacte, încearcă true/false
  } catch {}

  const mat = new THREE.MeshStandardMaterial({
    map: color,
    normalMap: normal || null,
    roughness: 1.0,
    metalness: 0.0
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.position.y += 0.0001; // mic bias anti-z-fight
  return mesh;
}