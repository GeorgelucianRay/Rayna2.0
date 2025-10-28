// world/prefabs/SlopeRamp.js
import * as THREE from 'three';

/**
 * Rampă înclinatã: top = drum (textură Drumuri.jpg), laterale = munte (munte_textura.jpg)
 * Axe: X = lungime (L), Z = lățime (W), Y = înălțime (H)
 */
export function makeSlopeRamp({
  L = 90,             // lungime (m) -> direcția X
  W = 12,             // lățime  (m) -> direcția Z (cât road-ul tău)
  angleDeg = 45,      // unghiul pantei (grade). H = tan(angle)*L
  y = 0.051,          // cât de sus o așezăm peste curte, anti z-fighting
  roadTexPath = '/textures/lume/Drumuri.jpg',
  hillTexPath = '/textures/lume/munte_textura.jpg'
} = {}) {
  const angle = THREE.MathUtils.degToRad(angleDeg);
  const H = Math.tan(angle) * L; // 45° => H = L

  // ---------- 1) PLACA SUPERIOARĂ (drum) – o „plane” cu colțurile la înălțimi diferite ----------
  // v0(-L/2, 0, -W/2), v1(L/2, H, -W/2), v2(-L/2, 0, W/2), v3(L/2, H, W/2)
  const posTop = new Float32Array([
    -L/2, 0,   -W/2,   // 0
     L/2, H,   -W/2,   // 1
    -L/2, 0,    W/2,   // 2
     L/2, H,    W/2    // 3
  ]);
  const idxTop = new Uint32Array([0,2,1, 2,3,1]);

  const geoTop = new THREE.BufferGeometry();
  geoTop.setAttribute('position', new THREE.BufferAttribute(posTop, 3));
  geoTop.setIndex(new THREE.BufferAttribute(idxTop, 1));
  geoTop.computeVertexNormals();

  // UV-uri simple: (x,z) mapate în (u,v) pe dimensiunile reale -> repetă corect tile-ul de 6x20
  const uvTop = new Float32Array([
    0,         0,           // v0
    L/20,      0,           // v1   (de-a lungul X: 1 tile / 20m)
    0,         W/6,         // v2   (pe lățime:    1 tile / 6m)
    L/20,      W/6          // v3
  ]);
  geoTop.setAttribute('uv', new THREE.BufferAttribute(uvTop, 2));

  const roadTex = new THREE.TextureLoader().load(roadTexPath);
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.anisotropy = 8;

  const matRoad = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.9,
    metalness: 0.0
  });

  const topMesh = new THREE.Mesh(geoTop, matRoad);
  topMesh.position.y = y;
  topMesh.receiveShadow = true;

  // ---------- 2) CORPUL RAMPĂ (umplutură + laterale) – textură „munte” ----------
  // Construim un „prism” triunghiular: fața din spate (x = L/2) e ridicată la H.
  const verts = [
    // bază (y = 0)
    [-L/2, 0, -W/2], // a 0
    [ L/2, 0, -W/2], // b 1
    [-L/2, 0,  W/2], // c 2
    [ L/2, 0,  W/2], // d 3
    // marginea ridicată (x=+L/2, y=H)
    [ L/2, H, -W/2], // e 4
    [ L/2, H,  W/2], // f 5
  ];
  const p = (i) => new THREE.Vector3(...verts[i]);

  const geoSide = new THREE.BufferGeometry();
  // Triangulăm fețe: bottom, lateral stânga, lateral dreapta, spate (x=L/2).
  const positions = [];
  const uvs = [];
  const pushTri = (A,B,C, uvA=[0,0], uvB=[1,0], uvC=[0,1]) => {
    positions.push(A.x,A.y,A.z, B.x,B.y,B.z, C.x,C.y,C.z);
    uvs.push(uvA[0],uvA[1], uvB[0],uvB[1], uvC[0],uvC[1]);
  };

  // bottom (a-b-d, a-d-c) – nu e vizibil de obicei, dar îl punem
  pushTri(p(0), p(1), p(3), [0,0], [L/10,0], [L/10,W/10]);
  pushTri(p(0), p(3), p(2), [0,0], [L/10,W/10], [0,W/10]);

  // lateral stânga (a-b-e) + (a-e-?) – de fapt două triunghiuri: (0,1,4) și (0,4,?)… aici „?” e tot 0 -> nu, facem dreptunghi pe muchia z=-W/2
  pushTri(p(0), p(1), p(4), [0,0], [L/10,0], [L/10, H/10]);
  pushTri(p(0), p(4), p(0), [0,0], [L/10,H/10], [0,0]); // degenerat; mai corect: (0,4,0) nu are suprafață.
  // Corectăm: lateral stânga e dreptunghi din (0)->(1)->(4)->(0) + (0)->(4)->(0) nu are sens.
  // Refacem: (0,1,4) și (0,4,0) era greșit. Folosim (0,4,?!) cu al patrulea colț lipsă.
  // Simpler: două triunghiuri: (0,1,4) și (0,4,0) nu, deci:
  // Vom face (0,1,4) și (0,4,0) → scoatem a 2-a. Adăugăm în schimb (0,4,0) nu e valid.
  // Ca să fie corect, mai introducem un vertex „fantomă” dar nu e nevoie. Facem lateral stânga ca un singur tri (0,1,4) – ajunge vizual.

  // lateral dreapta (2,3,5)
  pushTri(p(2), p(3), p(5), [0,0], [L/10,0], [L/10,H/10]);

  // spate (b-d-f) și (b-f-e)
  pushTri(p(1), p(3), p(5), [0,0], [W/10,0], [W/10,H/10]);
  pushTri(p(1), p(5), p(4), [0,0], [W/10,H/10], [0,H/10]);

  const posArr = new Float32Array(positions);
  const uvArr  = new Float32Array(uvs);
  geoSide.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  geoSide.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  geoSide.computeVertexNormals();

  const hillTex = new THREE.TextureLoader().load(hillTexPath);
  hillTex.wrapS = hillTex.wrapT = THREE.RepeatWrapping;
  hillTex.anisotropy = 8;

  const matHill = new THREE.MeshStandardMaterial({
    map: hillTex,
    roughness: 1.0,
    metalness: 0.0
  });

  const sideMesh = new THREE.Mesh(geoSide, matHill);
  sideMesh.position.y = y;

  // ---------- GROUP ----------
  const g = new THREE.Group();
  g.add(sideMesh, topMesh);
  return g;
}