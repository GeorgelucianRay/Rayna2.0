// src/pages/Depot/threeWorld/createLandscape.js
import * as THREE from 'three';

// mic generator de "zgomot" (fără librării externe)
function hash(n){ return Math.sin(n) * 43758.5453 % 1; }
function noise2(x,y){
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix,       fy = y - iy;
  const a = hash(ix*157.0 + iy*113.0);
  const b = hash((ix+1)*157.0 + iy*113.0);
  const c = hash(ix*157.0 + (iy+1)*113.0);
  const d = hash((ix+1)*157.0 + (iy+1)*113.0);
  const ux = fx*fx*(3.0-2.0*fx);
  const uy = fy*fy*(3.0-2.0*fy);
  return a*(1-ux)*(1-uy) + b*ux*(1-uy) + c*(1-ux)*uy + d*ux*uy;
}

/**
 * Creează un "inel" de dealuri în jurul curții.
 * - innerRadius: puțin mai mare decât diagonala curții (ca să NU atingă asfaltul)
 * - outerRadius: cât de departe vrei dealurile
 * - height: înălțimea maximă a dealurilor
 *
 * Folosește /public/textures/lume/munte_textura.jpg
 */
export default function createLandscape(
  {
    yardWidth = 90,
    yardDepth = 60,
    innerPadding = 8,   // distanța liberă până la gard/asfalt
    outerRadius = 220,  // cât de departe e marginea "lumii"
    height = 14
  } = {}
){
  const group = new THREE.Group();

  // Raza interioară = jumătate din diagonală + padding
  const halfDiag = 0.5 * Math.hypot(yardWidth, yardDepth);
  const innerRadius = halfDiag + innerPadding;

  // Inel: folosim RingGeometry și împingem vârfurile în sus prin "noise"
  const ringGeom = new THREE.RingGeometry(innerRadius, outerRadius, 256, 1);
  ringGeom.rotateX(-Math.PI/2); // să stea pe sol

  // Displace pe Y (creează dealuri care cresc spre exterior)
  const pos = ringGeom.attributes.position;
  for (let i = 0; i < pos.count; i++){
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);

    // 0 la inner, 1 la outer
    const t = THREE.MathUtils.clamp((r - innerRadius) / (outerRadius - innerRadius), 0, 1);

    // zgomot + "falloff" spre interior ca să nu atingă curtea
    const n = noise2(x*0.05, z*0.05) * 0.6 + noise2(x*0.12, z*0.12) * 0.4;
    const y = Math.pow(t, 1.2) * (0.4 + 0.6*n) * height;

    pos.setY(i, y);
  }
  pos.needsUpdate = true;
  ringGeom.computeVertexNormals();

  // material cu textura ta
  const tex = new THREE.TextureLoader().load('/textures/lume/munte_textura.jpg');
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // repetăm în funcție de circumferință
  const repeatU = (2 * Math.PI * outerRadius) / 64; // ajustează 64 dacă vrei scală diferită
  tex.repeat.set(repeatU, 6);

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.95,
    metalness: 0.0,
  });

  const ring = new THREE.Mesh(ringGeom, mat);
  ring.receiveShadow = true;
  ring.castShadow = false;

  group.add(ring);
  return group;
}