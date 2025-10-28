// SlopeRamp.js – rampă plină, asfalt pe sus (rotit 90°), munte pe laterale
import * as THREE from 'three';

/**
 * L  - lungimea (pe axa X)
 * W  - lățimea (pe axa Z)
 * angleDeg  - unghiul real al pantei (grade). Pentru 10%: ~5.71°
 * y         - offset față de sol (ridicăm puțin ca să nu „palpite” cu solul)
 */
export function makeSlopeRamp({
  L = 90,
  W = 12,
  angleDeg = 5.7105931375,  // ~= atan(0.10) * 180/PI
  y = 0.05
} = {}) {

  const angleRad = THREE.MathUtils.degToRad(angleDeg);
  const H = Math.tan(angleRad) * L;         // înălțimea la capătul rampei
  const group = new THREE.Group();

  // ---------- 1) CORPUL (PRISMĂ CU SECȚIUNE TRIUNGHIULARĂ) ----------
  // Triunghi 2D în planul X–Y: (0,0) -> (L,0) -> (L,H)
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(L, 0);
  shape.lineTo(L, H);
  shape.lineTo(0, 0);

  const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: W,            // extrudăm pe Z = lățimea
    steps: 1,
    bevelEnabled: false
  });
  // Centrăm pe X/Z dar păstrăm baza jos (minY = 0)
  extrudeGeo.translate(-L / 2, 0, -W / 2);
  extrudeGeo.computeVertexNormals();

  const mountainTex = new THREE.TextureLoader().load('/textures/lume/munte_textura.jpg');
  mountainTex.wrapS = mountainTex.wrapT = THREE.RepeatWrapping;
  mountainTex.repeat.set(L / 6, W / 6);
  mountainTex.anisotropy = 8;

  const bodyMat = new THREE.MeshStandardMaterial({
    map: mountainTex,
    roughness: 1.0,
    metalness: 0.0
  });

  const body = new THREE.Mesh(extrudeGeo, bodyMat);
  body.castShadow = false;
  body.receiveShadow = true;
  body.position.y = y;              // stă pe sol
  group.add(body);

  // ---------- 2) SUPRAFAȚA ASFALTATĂ (PLAN UȘOR DEASUPRA) ----------
  // Facem un plan LxW și ridicăm fiecare vârf după x ⇒ y(x) = (x+L/2)/L * H
  const topGeo = new THREE.PlaneGeometry(L, W, 1, 1);
  topGeo.rotateX(-Math.PI / 2);     // îl punem în XZ
  {
    const pos = topGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);        // în [-L/2, +L/2]
      const ySlope = ((x + L / 2) / L) * H;
      pos.setY(i, ySlope + 0.0008); // puțin peste corp, anti z-fighting
    }
    pos.needsUpdate = true;
    topGeo.computeVertexNormals();
  }

  const roadTex = new THREE.TextureLoader().load('/textures/lume/Drumuri.jpg');
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.center.set(0.5, 0.5);
  roadTex.rotation = Math.PI / 2;   // 🔁 rotim 90° ca să „curgă” pe lățime (Z)
  // tile finuț (ajustează după gust)
  roadTex.repeat.set(L / 20, W / 6);
  roadTex.anisotropy = 8;

  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.9,
    metalness: 0.0
  });

  const top = new THREE.Mesh(topGeo, roadMat);
  top.castShadow = false;
  top.receiveShadow = true;
  top.position.y = y;
  group.add(top);

  // Pentru raycast/selectare mai ușoară
  group.userData.__ramp = { L, W, H, angleDeg };

  return group;
}