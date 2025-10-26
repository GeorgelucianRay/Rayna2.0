// src/components/threeWorld/createGround.js
import * as THREE from 'three';

const TEX_ASPHALT = '/textures/lume/asphalt_curte_textura.PNG';

// mic cache pentru texturi
const _tcache = new Map();
function loadTex(path) {
  if (_tcache.has(path)) return _tcache.get(path);
  const tex = new THREE.TextureLoader().load(path);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  _tcache.set(path, tex);
  return tex;
}

/**
 * Creează suprafața curții + marcajele.
 * @param {{ width:number, depth:number, color?:number,
 *           abcOffsetX?:number, defOffsetX?:number, abcToDefGap?:number }} cfg
 */
export default function createGround(cfg) {
  const {
    width = 90,
    depth = 60,
    color = 0x9aa0a6,
    abcOffsetX = 0,   // poziția axului ABC față de centru (pe X)
    defOffsetX = 0,   // poziția axului DEF față de centru (pe X)
    abcToDefGap = 0,  // distanță fină între axele ABC și DEF (se aplică la DEF)
  } = cfg || {};

  const group = new THREE.Group();

  /* ---------- ASFALT ---------- */
  const asphaltTex = loadTex(TEX_ASPHALT);
  // repetăm textura ~ la 2.5 m ca să nu pară întinsă
  asphaltTex.repeat.set(Math.max(1, Math.round(width / 2.5)), Math.max(1, Math.round(depth / 2.5)));

  const groundGeo = new THREE.PlaneGeometry(width, depth, 1, 1);
  const groundMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.95,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  /* ---------- CHENAR SUBTIL ---------- */
  // Linie de contur discretă (nu e obligatorie, dar ajută la lizibilitate)
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(groundGeo),
    new THREE.LineBasicMaterial({ color: 0x0c1320, opacity: 0.6, transparent: true })
  );
  edge.rotation.x = -Math.PI / 2;
  group.add(edge);

  /* ---------- MARCAJE (benzi de parcare/lucru) ---------- */
  // Vom desena două dreptunghiuri lungi și deschise la culoare, unul pentru ABC și unul pentru DEF.
  // Sunt ușor ridicate (y = 0.01) ca să nu se “zbată” cu Z-fighting.
  const markLen = depth - 6;    // puțin mai scurte decât curtea, să rămână margini
  const markW   = 3.2;          // lățimea benzii
  const markY   = 0.01;         // ridicare minimă față de asfalt
  const markOpacity = 0.18;

  function makeMark() {
    const g = new THREE.PlaneGeometry(markW, markLen);
    const m = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: markOpacity,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = markY;
    return mesh;
  }

  // Banda ABC (pe X negativ de regulă, în funcție de configul tău)
  const markABC = makeMark();
  markABC.position.set(-abcOffsetX, markY, 0);
  group.add(markABC);

  // Banda DEF (poate avea un mic offset suplimentar din abcToDefGap)
  const markDEF = makeMark();
  markDEF.position.set(defOffsetX + abcToDefGap, markY, 0);
  group.add(markDEF);

  /* ---------- PISTE INTERIOARE (opțional, subțiri) ---------- */
  // Bare subțiri pe marginea celor două benzi — seamănă cu marcaje de lucru.
  const laneW = markW + 0.25;
  const laneH = 0.08; // grosime desen
  const laneColor = 0xbfd6ff;

  function makeLane() {
    const geo = new THREE.PlaneGeometry(laneW, laneH);
    const mat = new THREE.MeshBasicMaterial({
      color: laneColor,
      opacity: 0.25,
      transparent: true,
      depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = markY + 0.001;
    return m;
  }

  // câteva segmente rare pe lungime (nu încărcăm scena)
  const segCount = 8;
  for (let i = 0; i < segCount; i++) {
    const z = -markLen / 2 + (i + 1) * (markLen / (segCount + 1));
    const laneA = makeLane();
    laneA.scale.set(1, 1, 1);
    laneA.position.set(-abcOffsetX, markY + 0.001, z);
    group.add(laneA);

    const laneD = makeLane();
    laneD.position.set(defOffsetX + abcToDefGap, markY + 0.001, z);
    group.add(laneD);
  }

  /* ---------- ZONĂ CENTRALĂ (culoar manevră) ---------- */
  // Un dreptunghi central foarte discret, ca “pista” dintre rânduri.
  const midW = 5.0;
  const mid = new THREE.Mesh(
    new THREE.PlaneGeometry(midW, markLen * 0.9),
    new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.06, transparent: true, depthWrite: false })
  );
  mid.rotation.x = -Math.PI / 2;
  mid.position.set(0, markY, 0);
  group.add(mid);

  /* ---------- RETURN ---------- */
  // Centrăm pivotul pe mijlocul curții (compatibil cu restul scenei)
  group.position.set(0, 0, 0);
  return group;
}