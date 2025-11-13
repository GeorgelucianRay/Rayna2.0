// src/components/depot/utils/computeOccupiedSlots.js

/**
 * Calculează ce sloturi sunt ocupate de un container,
 * inclusiv cazul 40'/45' (2 poziții).
 *
 * Exemplu:
 *  - 20' pe A2A      -> ["A2A"]
 *  - 40' pe A2A (ABC)-> ["A2A", "A1A"]
 *  - 40' pe D1A (DEF)-> ["D1A", "D2A"]
 */
export function computeOccupiedSlots(posRaw, tipoRaw) {
  const pos = String(posRaw || '').trim().toUpperCase();
  const tipo = String(tipoRaw || '').trim();

  if (!pos || pos === 'PENDIENTE') return [];

  const m = /^([A-F])(10|[1-9])([A-E])$/.exec(pos);
  if (!m) {
    // format necunoscut -> tratăm ca un singur slot exact
    return [pos];
  }

  const fila = m[1];          // A-F
  const num  = Number(m[2]);  // 1-10 sau 1-7
  const nivel = m[3];         // A-E

  const isABC = ['A', 'B', 'C'].includes(fila);
  const max = isABC ? 10 : 7;

  const slots = [pos];

  // doar 40/45 ocupă două sloturi
  if (tipo !== '40' && tipo !== '45') {
    return slots;
  }

  let otherNum;
  if (isABC) {
    // ABC: containerul lung ocupă poziția aleasă + vecinul din stânga (sau dreapta dacă e 1)
    if (num === 1) {
      otherNum = 2;
    } else {
      otherNum = num - 1;
    }
  } else {
    // DEF: containerul lung ocupă poziția aleasă + vecinul din dreapta (sau stânga dacă e ultimul)
    if (num === max) {
      otherNum = max - 1;
    } else {
      otherNum = num + 1;
    }
  }

  slots.push(`${fila}${otherNum}${nivel}`);

  // eliminăm eventualele duplicate
  return Array.from(new Set(slots));
}