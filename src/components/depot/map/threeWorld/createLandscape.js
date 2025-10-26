// src/components/threeWorld/createLandscape.js
import * as THREE from 'three';

// mic "noise" determinist ca să nu depindem de lib-uri
function n2(x, z) {
  return Math.sin(x * 0.045) * Math.cos(z * 0.037) * 0.5
       + Math.sin((x + z) * 0.021) * 0.5;
}

/**
 * Creează o bandă înclinată (un "berm") care pornește de la nivelul curții (Y=0)
 * și urcă treptat spre exterior, dând impresia de deal / munte în jurul plăcii.
 */
function makeBerm({ length, bandWidth, peakH, rotY, pos, tex }) {
  // plane în X (lungime) și Z (lățimea benzii); îl rotim pe X ca să fie pe sol
  const segL = Math.max(80, Math.floor(length / 2));
  const segW = 24;

  const geo = new THREE.PlaneGeometry(length, bandWidth, segL, segW);
  geo.rotateX(-Math.PI / 2);

  // deformăm pe înălțime: la "interior" (v ~ -bandWidth/2) y=0,
  // iar spre exterior creștem până la "peakH" cu un pic de noise.
  const posAttr = geo.getAttribute('position');
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);        // -bandWidth/2 .. +bandWidth/2
    const t = (z + bandWidth / 2) / bandWidth; // 0 (lipit de curte) -> 1 (exterior)
    const base = Math.max(0, Math.pow(t, 1.25)); // curbă mai lină la început
    const h = base * peakH * (0.75 + 0.25 * n2(x, z));
    posAttr.setY(i, h);
  }
  geo.computeVertexNormals();

  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(length / 40, bandWidth / 40);

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    depthWrite: false,
  });

  const m = new THREE.Mesh(geo, mat);
  m.rotation.y = rotY || 0;
  m.position.copy(pos);
  m.renderOrder = -999; // după cer, înaintea scenei
  m.receiveShadow = true;
  return m;
}

export default function createLandscape({
  // dimensiunea curții (din createGround / CFG.ground)
  yardWidth = 90,
  yardDepth = 60,
  // cât spațiu liber păstrăm între bordura plăcii și berm (în metri)
  margin = 1.0,
  // lățimea benzii înclinate
  bandWidth = 55,
  // înălțimea maximă a "munților" la exteriorul benzii
  peakH = 38,
  texturePath = '/textures/lume/munte_textura.jpg'
} = {}) {
  const g = new THREE.Group();

  const tex = new THREE.TextureLoader().load(texturePath);
  tex.colorSpace = THREE.SRGBColorSpace;

  // coordonate ale marginii plăcii (createGround e centrat în (0,0))
  const halfW = yardWidth / 2;
  const halfD = yardDepth / 2;

  // Nord (spate): lungimea = yardWidth, banda pleacă din -halfD - margin
  g.add(makeBerm({
    length: yardWidth + 2 * margin,
    bandWidth, peakH, tex,
    rotY: 0,
    pos: new THREE.Vector3(0, 0, -(halfD + margin + bandWidth / 2))
  }));

  // Sud (față)
  g.add(makeBerm({
    length: yardWidth + 2 * margin,
    bandWidth, peakH, tex,
    rotY: Math.PI,
    pos: new THREE.Vector3(0, 0, (halfD + margin + bandWidth / 2))
  }));

  // Vest (stânga)
  g.add(makeBerm({
    length: yardDepth + 2 * margin,
    bandWidth, peakH, tex,
    rotY: -Math.PI / 2,
    pos: new THREE.Vector3(-(halfW + margin + bandWidth / 2), 0, 0)
  }));

  // Est (dreapta)
  g.add(makeBerm({
    length: yardDepth + 2 * margin,
    bandWidth, peakH, tex,
    rotY: Math.PI / 2,
    pos: new THREE.Vector3((halfW + margin + bandWidth / 2), 0, 0)
  }));

  return g;
}