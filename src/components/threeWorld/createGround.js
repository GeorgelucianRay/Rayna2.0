// src/components/threeWorld/createGround.js
import * as THREE from 'three';

/**
 * ------------------------------------------------------------
 * createGround(options)
 * ------------------------------------------------------------
 * Creează „asfaltul” (planul) + marcajele 2D pentru benzile ABC (orizontale)
 * și coloanele DEF (verticale).
 *
 * CONTROALE PRINCIPALE (apelezi din MapPage):
 * - width, depth      → DIMENSIUNEA ASFALTULUI (lățime X, lungime Z)
 * - color             → culoarea asfaltului
 * - abcOffsetX        → deplasarea blocului ABC pe axa X (stânga/dreapta)
 * - defOffsetX        → deplasarea blocului DEF pe axa X (stânga/dreapta)
 * - abcToDefGap       → distanța (pe Z) dintre ABC și DEF (culoarul de trecere)
 *
 * EXEMPLE:
 *   createGround({ width: 360, depth: 220, abcToDefGap: -18, abcOffsetX: 0, defOffsetX: 44 })
 *
 * NOTĂ: Dimensiunile sloturilor sunt sincronizate cu containerele (20ft = ~6.06m).
 * Dacă schimbi SLOT_LEN/SLOT_W/SLOT_GAP, actualizează și poziționarea containerelor
 * în stratul de containere ca să rămână aliniate perfect cu marcajele.
 * ------------------------------------------------------------
 */

/* ——— DIMENSIUNI SLOTURI (sincronizate cu containerele) ——— */
const SLOT_LEN = 6.06;   // lungime slot pentru un container de 20'
const SLOT_W   = 2.44;   // lățimea containerului (pe axa „lată”)
const SLOT_GAP = 0.06;   // spațiu foarte mic între sloturi (~6 cm), doar ca să fie vizibile benzi separate
const STEP     = SLOT_LEN + SLOT_GAP; // pasul dintre două sloturi de 20' (pe lungime)

/* ——— HELPER: text „vopsit” pe asfalt (2D) ———
 * Desenează o literă/număr pe un canvas și îl mapează pe un plane subțire.
 * Folosit pentru A/B/C/D/E/F și numerotări 1..10 / 1..7.
 */
function makePaintedText(text, { size = 1.6, color = '#e5e7eb', opacity = 0.75 } = {}) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(S * 0.7)}px sans-serif`;
  ctx.fillText(text, S / 2, S / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false, // să nu „taie” alte elemente
  });
  const geo = new THREE.PlaneGeometry(size, size);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2; // culcat pe asfalt
  m.position.y = 0.03;         // foarte puțin deasupra asfaltului ca să nu zbată Z-fight
  return m;
}

/* ——— HELPER: un slot pictat (dreptunghi alb subtil) ———
 * along = 'X'  → slot orientat pe axa X (benzi ABC)
 * along = 'Z'  → slot orientat pe axa Z (coloane DEF)
 */
function paintSlot({ x = 0, z = 0, along = 'X' }) {
  const sizeX = along === 'X' ? STEP : SLOT_W;
  const sizeZ = along === 'X' ? SLOT_W : STEP;

  const geo = new THREE.PlaneGeometry(sizeX, sizeZ);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.25,             // subtil, ca vopsea uzată
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  return m;
}

/* ——— EXPORT PRINCIPAL ——— */
export default function createGround({
  /* DIMENSIUNEA ASFALTULUI: schimbă aici cât „de mare” e curtea */
  width = 200,            // LĂȚIMEA (pe X)
  depth = 100,            // LUNGIMEA (pe Z)
  color = 0x9aa0a6,       // culoarea asfaltului

  /* OFFSET-URI PE X: poziționează blocurile față de centrul scenei */
  abcOffsetX = 10,        // mută benzile ABC stânga/dreapta
  defOffsetX = 50,        // mută coloanele DEF stânga/dreapta

  /* DISTANȚA PE Z DINTRE ABC ȘI DEF (culoarul mare) */
  abcToDefGap = -10.0,    // valori mai negative → DEF mai „jos” (mai departe de ABC) → culoar mai lat
} = {}) {
  const g = new THREE.Group();

  /* ——— ASFALT (plan mare) ———
   * width, depth controlează mărimea.
   */
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.02 })
  );
  plane.rotation.x = -Math.PI / 2;
  g.add(plane);

  /* ——— ABC (3 benzi orizontale, aproape lipite între ele) ———
   * Control pe Z între benzi (ABC_BASE_Z + 0.10 distanță între lățimi).
   * Coloană (1..10) merge spre X negativ (stânga), câte un „STEP” pe 20'.
   */
  const ABC_BASE_Z = -4.0; // poziția benzii A pe Z; B și C se deduc mai jos
  const ABC_ROW_Z = {
    A: ABC_BASE_Z,
    B: ABC_BASE_Z - (SLOT_W + 0.10),                 // puțin sub A
    C: ABC_BASE_Z - 2 * (SLOT_W + 0.10),            // puțin sub B
  };

  /* ——— DEF (3 coloane verticale) ———
   * START_Z_DEF este „mai jos” decât C, ca să obții forma de T. Reglat din abcToDefGap.
   */
  const START_Z_DEF = ABC_ROW_Z.C + abcToDefGap;

  /* ——— POZIȚII PE X ———
   * ABC_BASE_X și DEF_BASE_X aplică offseturile lateral.
   */
  const ABC_BASE_X = 0 + abcOffsetX;   // punctul de pornire pentru ABC
  const DEF_BASE_X = +4.0 + defOffsetX;
  const DEF_COL_X = {
    D: DEF_BASE_X,
    E: DEF_BASE_X + (SLOT_W + 0.10),   // „lipite” între ele (poți micșora/crește 0.10)
    F: DEF_BASE_X + 2 * (SLOT_W + 0.10),
  };

  /* ——— DESENARE ABC: 3 benzi × 10 sloturi ——— */
  for (const row of ['A', 'B', 'C']) {
    const z = ABC_ROW_Z[row];
    for (let col = 1; col <= 10; col++) {
      // sloturile ABC merg spre stânga (X negativ), centrate pe fiecare pas STEP
      const xCenter = ABC_BASE_X - (col - 0.5) * STEP;
      g.add(paintSlot({ x: xCenter, z, along: 'X' }));
    }
    // litera „A/B/C” înaintea primei coloane
    const label = makePaintedText(row, { size: 2.0 });
    label.position.set(ABC_BASE_X - 10.8 * STEP, 0.03, z);
    g.add(label);
  }
  // numerotare 1..10 (din 2 în 2) pe banda C, ușor mai jos
  for (let col = 1; col <= 10; col += 2) {
    const n = makePaintedText(String(col), { size: 1.2 });
    n.position.set(ABC_BASE_X - (col - 0.5) * STEP, 0.03, ABC_ROW_Z.C - 1.6);
    g.add(n);
  }

  /* ——— DESENARE DEF: 3 coloane × 7 sloturi ——— */
  for (const key of ['D', 'E', 'F']) {
    const x = DEF_COL_X[key];
    for (let r = 1; r <= 7; r++) {
      // sloturile DEF merg în jos (spre Z pozitiv), centrate pe fiecare pas STEP
      const zCenter = START_Z_DEF + (r - 0.5) * STEP;
      g.add(paintSlot({ x, z: zCenter, along: 'Z' }));
    }
    // litera „D/E/F” deasupra primei celule
    const label = makePaintedText(key, { size: 2.0 });
    label.position.set(x, 0.03, START_Z_DEF - 1.6);
    g.add(label);
  }
  // numerotare 1..7 (din 2 în 2) la dreapta de coloana F
  for (let r = 1; r <= 7; r += 2) {
    const n = makePaintedText(String(r), { size: 1.2 });
    n.position.set(DEF_COL_X.F + 1.6, 0.03, START_Z_DEF + (r - 0.5) * STEP);
    g.add(n);
  }

  return g;
}