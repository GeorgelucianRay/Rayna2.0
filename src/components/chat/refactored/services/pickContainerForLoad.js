import { supabase } from "../../../../supabaseClient";

function levelRank(ch) {
  if (!ch) return 0;
  const m = String(ch).toUpperCase();
  if (m === "A") return 1;
  if (m === "B") return 2;
  if (m === "C") return 3;
  return 0;
}

function parsePosition(pos) {
  if (!pos || typeof pos !== "string") return { base: null, level: null };
  const s = pos.trim().toUpperCase();
  if (s.length < 2) return { base: s, level: null };
  const base = s.slice(0, -1);
  const level = s.slice(-1);
  return { base, level };
}

export async function pickContainerForLoad({ supabase: sb = supabase, naviera, size }) {
  try {
    // Query primary table used by handleDepotChat: 'contenedores'
    let q = sb.from("contenedores").select("*");

    if (naviera) {
      q = q.ilike("naviera", `%${naviera}%");
    }

    if (size) {
      // attempt to match common size fields
      q = q.filter((row) => true); // placeholder to chain
    }

    const { data, error } = await q.limit(200);
    if (error) {
      try {
        window.__raynaLog?.("PickContainer/QueryError", { error }, "error");
      } catch {}
      return null;
    }

    if (!Array.isArray(data) || data.length === 0) return null;

    // Filter by size heuristics: prefer rows where 'tipo' or 'size' matches
    const candidates = data.filter((r) => {
      if (!r) return false;
      const tipo = String(r.tipo || "").toLowerCase();
      const s = String(size || "").toLowerCase();
      if (s && (tipo.includes(s) || String(r.size || "").toLowerCase() === s)) return true;
      if (!s) return true;
      return false;
    }).filter(r => r.posicion);

    // For each candidate, ensure no container exists above it (same base, higher level)
    const groups = {};
    for (const r of candidates) {
      const pos = parsePosition(r.posicion);
      if (!pos.base || !pos.level) continue;
      groups[r.posicion] = { row: r, base: pos.base, level: pos.level, rank: levelRank(pos.level) };
    }

    const rows = Object.values(groups);
    if (rows.length === 0) return null;

    // For each candidate, check if any other row in data has same base and higher level
    const topCandidates = rows.filter((c) => {
      const higher = data.find((other) => {
        if (!other?.posicion) return false;
        const p = parsePosition(other.posicion);
        if (!p.base || !p.level) return false;
        if (p.base !== c.base) return false;
        return levelRank(p.level) > c.rank;
      });
      return !higher;
    });

    if (topCandidates.length === 0) return null;

    // pick the one with maximum level (highest letter), accessible top of stack
    topCandidates.sort((a, b) => b.rank - a.rank);
    return topCandidates[0].row;
  } catch (e) {
    try { window.__raynaLog?.("PickContainer/Error", { message: e?.message || String(e) }, "error"); } catch {}
    return null;
  }
}

export default { pickContainerForLoad };
