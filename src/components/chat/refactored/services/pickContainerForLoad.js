// src/components/chat/refactored/services/pickContainerForLoad.js

/**
 * Pick a container for load:
 * - matches naviera + size
 * - calculates blockers (containers above on same row+col)
 * - selects container with minimum blockers
 * - tie-break: prefer higher position (easier access) OR older created_at
 *
 * Returns: { container, blockers: [...], blockersCount: N } or null
 */

function levelRank(ch) {
  if (!ch) return 0;
  const m = String(ch).toUpperCase();
  if (m === "A") return 1;
  if (m === "B") return 2;
  if (m === "C") return 3;
  if (m === "D") return 4;
  if (m === "E") return 5;
  // extend as needed
  return 0;
}

function parsePosition(pos) {
  if (!pos || typeof pos !== "string") return { base: null, level: null, row: null, col: null };
  const s = pos.trim().toUpperCase();
  if (s.length < 2) return { base: s, level: null, row: null, col: null };

  // Position format: A1A, A1B, B2C, etc.
  // row = first letter (A, B, C...)
  // col = middle number(s) (1, 2, 10, 23...)
  // height = last letter (A, B, C...)

  const match = s.match(/^([A-Z])(\d+)([A-Z])$/);
  if (!match) return { base: s, level: null, row: null, col: null };

  const row = match[1];
  const col = match[2];
  const level = match[3];
  const base = row + col; // e.g., "A1"

  return { base, level, row, col };
}

function normalizeSize(size) {
  const s = String(size || "").trim();
  if (!s) return "";
  // acceptăm 20/40/45 doar
  if (s === "20" || s === "40" || s === "45") return s;
  // dacă vine "20ft" etc:
  const m = s.match(/\b(20|40|45)\b/);
  return m ? m[1] : "";
}

function matchesSize(row, size) {
  const s = normalizeSize(size).toLowerCase();
  if (!s) return true;

  const tipo = String(row?.tipo || "").toLowerCase();
  const sizeField = String(row?.size || "").toLowerCase();
  const iso = String(row?.iso || "").toLowerCase();
  const descripcion = String(row?.descripcion || row?.description || "").toLowerCase();

  // Loose matching: "20" matches "20DV", "20GP", "20ft", etc.
  return (
    (tipo && tipo.includes(s)) ||
    (sizeField && sizeField.includes(s)) || // Changed strict equality to includes
    (iso && iso.includes(s)) ||
    (descripcion && descripcion.includes(s))
  );
}

function matchesNaviera(row, naviera) {
  const nav = String(naviera || "").trim().toLowerCase();
  if (!nav) return true;

  const v = String(row?.naviera || row?.shipping_line || row?.linea || "").trim().toLowerCase();
  if (!v) return false;

  // Partial match: "maersk" matches "MAERSK", "MAERSK LINE", "APM-MAERSK"
  return v.includes(nav);
}

/**
 * Calculate blockers for a given position
 * Blockers = containers above on same row+col (higher level)
 */
function calculateBlockers(position, allContainers) {
  const parsed = parsePosition(position);
  if (!parsed.base || !parsed.level) return [];

  const myRank = levelRank(parsed.level);
  if (!myRank) return [];

  const blockers = [];

  for (const other of allContainers) {
    if (!other?.posicion) continue;
    const otherParsed = parsePosition(other.posicion);
    if (!otherParsed.base || !otherParsed.level) continue;

    // Same base (row+col)?
    if (otherParsed.base !== parsed.base) continue;

    // Higher level?
    const otherRank = levelRank(otherParsed.level);
    if (otherRank > myRank) {
      blockers.push({
        code: other.matricula_contenedor || other.matricula || other.posicion,
        position: other.posicion,
        level: otherParsed.level,
        rank: otherRank,
      });
    }
  }

  return blockers;
}

export async function pickContainerForLoad({ supabase, naviera, size }) {
  try {
    if (!supabase) return null;

    const nav = String(naviera || "").trim();
    const s = normalizeSize(size);

    window.__raynaLog?.("PickContainer/Start", { naviera: nav, size: s }, "info");

    // Query tabelă using ilike for naviera
    let q = supabase.from("contenedores").select("*");

    // Filtru naviera în SQL (case-insensitive partial match)
    if (nav) {
      q = q.ilike("naviera", `%${nav}%`);
    }

    // Optional: Filter by 'estado' loosely if needed, currently leaving permissive logic
    // Acceptamos cualquer estado que no sea explícitamente "entregado" o "salida" o nul
    // But for now, let's keep it broad and filter later if needed.

    // Limit to get a good candidate pool
    const { data, error } = await q.limit(500);

    if (error) {
      try {
        window.__raynaLog?.("PickContainer/QueryError", { error, naviera: nav, size: s }, "error");
      } catch { }
      return null;
    }

    if (!Array.isArray(data) || data.length === 0) {
      window.__raynaLog?.("PickContainer/NoDataFromDB", { naviera: nav }, "warn");
      return null;
    }

    // Local filtering
    const candidates = data
      .filter((r) => r && r.posicion)
      .filter((r) => matchesSize(r, s));
    // Naviera handled by SQL ilike and verified by matchesNaviera implicitly if ilike works
    // But we can double check locally just in case SQL ilike behaves unexpectedly with some chars
    // .filter((r) => matchesNaviera(r, nav)); // Redundant if SQL is correct, but safe

    if (candidates.length === 0) {
      // DEBUG: Log why we found 0 candidates
      const debugTypes = [...new Set(data.map(r => r.tipo))].slice(0, 10);
      const debugSizes = [...new Set(data.map(r => r.size))].slice(0, 10);
      const debugNavieras = [...new Set(data.map(r => r.naviera))].slice(0, 10);

      window.__raynaLog?.("PickContainer/NoCandidatesAfterFilter", {
        requestedSize: s,
        foundTypes: debugTypes,
        foundSizes: debugSizes,
        foundNavieras: debugNavieras,
        totalRowsFetched: data.length
      }, "warn");

      return null;
    }

    // Calculate blockers for each candidate
    const candidatesWithBlockers = candidates
      .map((r) => {
        const blockers = calculateBlockers(r.posicion, data);
        const blockersCount = blockers.length;
        const parsed = parsePosition(r.posicion);
        const rank = levelRank(parsed.level);

        return {
          container: r,
          blockers,
          blockersCount,
          rank,
          created_at: r.created_at || null,
        };
      })
      .filter((c) => c.rank > 0); // Only valid positions

    if (candidatesWithBlockers.length === 0) {
      window.__raynaLog?.("PickContainer/NoValidPositions", { count: candidates.length }, "warn");
      return null;
    }

    // Sort by:
    // 1. Minimum blockers (ascending)
    // 2. Tie-break: Higher position (rank descending) = easier access
    // 3. Tie-break: Older created_at (ascending) = first in, first out
    candidatesWithBlockers.sort((a, b) => {
      // Primary: min blockers
      if (a.blockersCount !== b.blockersCount) {
        return a.blockersCount - b.blockersCount;
      }

      // Tie-break 1: prefer higher position (easier to access)
      if (a.rank !== b.rank) {
        return b.rank - a.rank; // descending
      }

      // Tie-break 2: prefer older created_at (FIFO)
      if (a.created_at && b.created_at) {
        return new Date(a.created_at) - new Date(b.created_at); // ascending
      }

      return 0;
    });

    const best = candidatesWithBlockers[0];

    window.__raynaLog?.("PickContainer/Selected", {
      code: best.container.matricula_contenedor || best.container.matricula,
      position: best.container.posicion,
      blockersCount: best.blockersCount,
      rank: best.rank,
    });

    return {
      container: best.container,
      blockers: best.blockers,
      blockersCount: best.blockersCount,
    };
  } catch (e) {
    try {
      window.__raynaLog?.("PickContainer/Error", { message: e?.message || String(e) }, "error");
    } catch { }
    return null;
  }
}

export default { pickContainerForLoad };
