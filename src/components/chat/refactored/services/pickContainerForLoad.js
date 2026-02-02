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

async function debugCounts(supabase, nav, size) {
  try {
    const { count: cSize } = await supabase
      .from("contenedores")
      .select("id", { count: "exact", head: true })
      .ilike("tipo", `%${size}%`);

    const { count: cNav } = await supabase
      .from("contenedores")
      .select("id", { count: "exact", head: true })
      .ilike("naviera", `%${nav}%`);

    // Fetch sample rows to find top values
    const { data: sampleData } = await supabase
      .from("contenedores")
      .select("naviera, tipo")
      .limit(200);

    let topNav = [];
    let topTip = [];

    if (sampleData && sampleData.length > 0) {
      const navCounts = {};
      const tipCounts = {};

      sampleData.forEach(r => {
        const n = String(r.naviera || "null").trim();
        const t = String(r.tipo || "null").trim();
        navCounts[n] = (navCounts[n] || 0) + 1;
        tipCounts[t] = (tipCounts[t] || 0) + 1;
      });

      topNav = Object.entries(navCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([val, cnt]) => `${val} (${cnt})`);

      topTip = Object.entries(tipCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([val, cnt]) => `${val} (${cnt})`);
    }

    window.__raynaLog?.("PickLoad/DEBUG_COUNTS", { size, naviera: nav, cSize, cNav });
    window.__raynaLog?.("PickLoad/DEBUG_TOP", { topNaviera: topNav, topTipo: topTip });

  } catch (e) {
    window.__raynaLog?.("PickLoad/DebugError", { message: e.message });
  }
}

export async function pickContainerForLoad({ supabase, naviera, size }) {
  try {
    if (!supabase) return null;

    const nav = String(naviera || "").trim();
    const s = normalizeSize(size);

    window.__raynaLog?.("PickContainer/Start", { naviera: nav, size: s }, "info");

    // Query tabelă using ilike for naviera AND tipo
    let q = supabase.from("contenedores").select("*");

    // 1. Filtru Naviera (loose match)
    if (nav) {
      q = q.ilike("naviera", `%${nav}%`);
    }

    // 2. Filtru Tipo/Size (loose match)
    // NOTE: 'tipo' in DB holds sizes like "20DV", "40HC" usually.
    if (s) {
      q = q.ilike("tipo", `%${s}%`);
    }

    // 3. Must have a position
    q = q.not("posicion", "is", null);

    // No estado filter for now (PASUL A)

    // Limit
    const { data: candidates, error } = await q.limit(500);

    if (error) {
      window.__raynaLog?.("PickContainer/QueryError", { error, naviera: nav, size: s }, "error");
      return null;
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      window.__raynaLog?.("PickContainer/NoCandidates", { naviera: nav, size: s }, "warn");

      // PASUL B: Debug Queries
      await debugCounts(supabase, nav, s);
      return null;
    }

    // Calculate blockers for each candidate
    const candidatesWithBlockers = candidates
      .map((r) => {
        const blockers = calculateBlockers(r.posicion, candidates); // Use fetched batch to resolve blockers (approx)
        // Optimization: ideally we query ALL containers to find valid blockers, but strictly speaking 
        // blockers should be in the same stack. The fetched batch filtered by Nav/Size might NOT include 
        // the containers on top if they are different Nav/Size.
        // HOWEVER, user instruction says "Nu modifica blockers/poziție încă". 
        // We will stick to using 'candidates' or maybe we need to query 'all' for blockers?
        // Current implementation uses 'candidates', which is flawed if blockers are diff type.
        // BUT let's stick to the current logic which uses passed array.
        // WAIT: In previous steps we passed 'data' (the fetched batch).
        // Let's use 'candidates' here (which IS the data from query).
        // NOTE: This IS a logic flaw (blockers might be missing from batch), but requested "Nu modifica blockers... Reparăm întâi candidații."

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

    // Sort
    candidatesWithBlockers.sort((a, b) => {
      // Primary: min blockers
      if (a.blockersCount !== b.blockersCount) {
        return a.blockersCount - b.blockersCount;
      }
      // Tie-break 1: higher position descending
      if (a.rank !== b.rank) {
        return b.rank - a.rank;
      }
      // Tie-break 2: older created_at ascending
      if (a.created_at && b.created_at) {
        return new Date(a.created_at) - new Date(b.created_at);
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
    window.__raynaLog?.("PickContainer/Error", { message: e?.message || String(e) }, "error");
    return null;
  }
}

export default { pickContainerForLoad };
