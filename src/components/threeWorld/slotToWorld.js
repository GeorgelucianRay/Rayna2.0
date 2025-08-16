// src/components/threeWorld/slotToWorld.js
import * as THREE from 'three';

/**
 * Conversie “slot” (A..F + index + nivel) -> coordonate lume (x,y,z,rotation).
 * Respectă exact marcajele pictate în createGround.js.
 *
 * Notare slot:
 *   lane: 'A'|'B'|'C' (orizontale) sau 'D'|'E'|'F' (verticale)
 *   index: 1..10 pt ABC, 1..7 pt DEF (poziția pe bandă/coloană)
 *   tier: 'A' = la sol, 'B' = etaj 2, 'C' = etaj 3, ... (opțional; default 'A')
 *   sizeFt: 20 sau 40 (lungimea containerului)
 *
 * Opțiuni (trebuie să le dai din MapPage -> CFG.ground):
 *   abcOffsetX, defOffsetX, abcToDefGap  (aceleași valori ca în createGround)
 *   abcNumbersReversed: true dacă pe asfalt ABC este numerotat invers (10..1)
 *
 * Returnează:
 *   { position: THREE.Vector3, rotationY: number, sizeMeters: {len, wid, ht} }
 */
export function slotToWorld(
  { lane, index, tier = 'A', sizeFt = 20 },
  {
    abcOffsetX = 0,
    defOffsetX = 0,
    abcToDefGap = -10,
    abcNumbersReversed = false,
  } = {}
) {
  // --- dimensiuni identice cu createGround ---
  const SLOT_LEN = 6.06;   // 20'
  const SLOT_W   = 2.44;
  const SLOT_GAP = 0.06;
  const STEP     = SLOT_LEN + SLOT_GAP; // 6.12m
  const ABC_BASE_Z = -4.0; // idem createGround

  // pozițiile benzi ABC (pe Z) – lipite între ele
  const ABC_ROW_Z = {
    A: ABC_BASE_Z,
    B: ABC_BASE_Z - (SLOT_W + 0.10),
    C: ABC_BASE_Z - 2 * (SLOT_W + 0.10),
  };

  // poziții coloane DEF (pe X) – lipite între ele
  const DEF_BASE_X = +4.0 + defOffsetX;
  const DEF_COL_X = {
    D: DEF_BASE_X,
    E: DEF_BASE_X + (SLOT_W + 0.10),
    F: DEF_BASE_X + 2 * (SLOT_W + 0.10),
  };

  // începutul DEF pe Z (formă de T)
  const START_Z_DEF = ABC_ROW_Z.C + abcToDefGap;

  // conversie “nivel” (A=0, B=1, …)
  const tierIndex = Math.max(0, (tier?.toUpperCase().charCodeAt(0) ?? 65) - 65);
  const CONT_H = 2.59; // înălțime container ~8’6’’ (ajustează dacă modelul tău e altfel)

  // dacă ai numerotare ABC inversă pe asfalt (10..1), mapăm indexul vizual
  const idxABC = abcNumbersReversed ? (11 - index) : index;

  // dimensiune container (m)
  const lenMeters = sizeFt === 40 ? 2 * SLOT_LEN + SLOT_GAP : SLOT_LEN;
  const widMeters = SLOT_W;
  const sizeMeters = { len: lenMeters, wid: widMeters, ht: CONT_H };

  // poziție + rotație pe Y
  const pos = new THREE.Vector3();
  let rotY = 0;

  if (lane === 'A' || lane === 'B' || lane === 'C') {
    // ABC = orizontale (de-a lungul axei X, spre stânga)
    const originX = 0 + abcOffsetX; // vezi createGround: ABC_BASE_X = 0 + abcOffsetX
    const z = ABC_ROW_Z[lane];      // fix pe banda aleasă

    if (sizeFt === 20) {
      // centrul celulei idxABC
      const x = originX - (idxABC - 0.5) * STEP;
      pos.set(x, CONT_H * (tierIndex + 0.5), z);
      rotY = 0; // pe X
    } else {
      // 40' ocupă două celule: idx și idx+1. Centrul e între ele.
      // centrele sunt la (i-0.5)*STEP și (i+0.5)*STEP -> media => i*STEP
      const x = originX - idxABC * STEP;
      pos.set(x, CONT_H * (tierIndex + 0.5), z);
      rotY = 0;
    }
  } else if (lane === 'D' || lane === 'E' || lane === 'F') {
    // DEF = verticale (de-a lungul axei Z, "în jos")
    const x = DEF_COL_X[lane];

    if (sizeFt === 20) {
      const z = START_Z_DEF + (index - 0.5) * STEP;
      pos.set(x, CONT_H * (tierIndex + 0.5), z);
      rotY = Math.PI / 2; // pe Z
    } else {
      // 40' ocupă r și r+1 -> centrul la START_Z_DEF + r*STEP
      const z = START_Z_DEF + index * STEP;
      pos.set(x, CONT_H * (tierIndex + 0.5), z);
      rotY = Math.PI / 2;
    }
  } else {
    throw new Error(`lane invalid: ${lane}`);
  }

  return { position: pos, rotationY: rotY, sizeMeters };
}
