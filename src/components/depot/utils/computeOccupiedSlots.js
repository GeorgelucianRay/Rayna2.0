// src/components/depot/utils/computeOccupiedSlots.js

/**
 * Calculează sloturile ocupate de un container (inclusiv 40'/45' care ocupă 2 poziții).
 *
 * Exemple:
 *  - 20' pe A2A      -> ["A2A"]
 *  - 40' pe A2A (ABC)-> ["A2A", "A1A"]
 *  - 40' pe D1A (DEF)-> ["D1A", "D2A"]
 */
export function computeOccupiedSlots(posRaw, tipoRaw) {
  try {
    const pos = String(posRaw || "").trim().toUpperCase();
    const tipo = String(tipoRaw || "").trim();

    if (!pos || pos === "PENDIENTE") return [];

    const m = /^([A-F])(10|[1-9])([A-E])$/.exec(pos);
    if (!m) {
      // format necunoscut -> tratăm ca un singur slot exact
      return [pos];
    }

    const fila = m[1];          // A-F
    const num  = Number(m[2]);  // 1-10 sau 1-7
    const nivel = m[3];         // A-E

    const isABC = ["A", "B", "C"].includes(fila);
    const max = isABC ? 10 : 7;

    const slots = [pos];

    // doar 40/45 ocupă două sloturi
    if (tipo !== "40" && tipo !== "45") {
      return slots;
    }

    let otherNum;
    if (isABC) {
      // ABC: containerul lung ocupă poziția aleasă + vecinul din stânga (sau dreapta dacă e 1)
      otherNum = num === 1 ? 2 : num - 1;
    } else {
      // DEF: containerul lung ocupă poziția aleasă + vecinul din dreapta (sau stânga dacă e ultimul)
      otherNum = num === max ? max - 1 : num + 1;
    }

    slots.push(`${fila}${otherNum}${nivel}`);

    return Array.from(new Set(slots)); // fără duplicate
  } catch (err) {
    console.error("[computeOccupiedSlots] ERROR:", err, {
      posRaw,
      tipoRaw,
    });
    // fallback: nu omorâm UI-ul, doar zicem „niciun slot”
    return [];
  }
}

/**
 * Export default ca să fie compatibil și cu:
 *   import computeOccupiedSlots from '../utils/computeOccupiedSlots'
 * și cu:
 *   import { computeOccupiedSlots } from '../utils/computeOccupiedSlots'
 */
export default computeOccupiedSlots;