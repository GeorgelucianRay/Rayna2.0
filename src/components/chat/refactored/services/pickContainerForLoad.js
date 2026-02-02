// src/components/chat/refactored/services/pickContainerForLoad.js

/**
 * Pick a container for load:
 * - matches naviera + size (heuristics on fields)
 * - must NOT have another container above it
 * - positions like A1A, A1B, A1C (last letter = height)
 *
 * Returns a full DB row (selected container) or null.
 */

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
  return { base: s.slice(0, -1), level: s.slice(-1) };
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

  // acceptăm dacă oricare câmp conține "20"/"40"/"45"
  return (
    (tipo && tipo.includes(s)) ||
    (sizeField && sizeField === s) ||
    (iso && iso.includes(s)) ||
    (descripcion && descripcion.includes(s))
  );
}

function matchesNaviera(row, naviera) {
  const nav = String(naviera || "").trim().toLowerCase();
  if (!nav) return true;

  const v = String(row?.naviera || row?.shipping_line || row?.linea || "").trim().toLowerCase();
  if (!v) return false;

  // dacă DB are exact, ok; dacă are "Maersk Line" etc, ok
  return v.includes(nav);
}

export async function pickContainerForLoad({ supabase, naviera, size }) {
  try {
    if (!supabase) return null;

    const nav = String(naviera || "").trim();
    const s = normalizeSize(size);

    // Query tabelă (după ce ai zis că handleDepotChat folosește "contenedores")
    // NOTĂ: nu folosim q.filter(fn) (invalid în Supabase).
    let q = supabase.from("contenedores").select("*");

    // Filtru naviera în SQL dacă există coloana "naviera"
    // (dacă nu există, Supabase va da error și îl logăm -> return null)
    if (nav) {
      q = q.ilike("naviera", `%${nav}%`);
    }

    // Luăm un batch rezonabil și filtrăm local pentru size/posicion/etc.
    const { data, error } = await q.limit(500);

    if (error) {
      try {
        window.__raynaLog?.("PickContainer/QueryError", { error, naviera: nav, size: s }, "error");
      } catch {}
      return null;
    }

    if (!Array.isArray(data) || data.length === 0) return null;

    // Candidați: trebuie să aibă posicion și să corespundă naviera+size (local heuristics)
    const candidates = data
      .filter((r) => r && r.posicion)
      .filter((r) => matchesNaviera(r, nav))
      .filter((r) => matchesSize(r, s));

    if (candidates.length === 0) return null;

    // Pregătim candidate info (base+level+rank)
    const rows = candidates
      .map((r) => {
        const p = parsePosition(r.posicion);
        if (!p.base || !p.level) return null;
        const rank = levelRank(p.level);
        if (!rank) return null;
        return { row: r, base: p.base, level: p.level, rank };
      })
      .filter(Boolean);

    if (rows.length === 0) return null;

    // Un container e "accesibil" dacă NU există un alt container cu aceeași bază și rank mai mare
    // Observație: verificăm în tot setul "data" ca să prindem și containerele care nu sunt în candidates
    // (dar au aceeași bază și sunt deasupra).
    const topCandidates = rows.filter((c) => {
      const hasAbove = data.some((other) => {
        if (!other?.posicion) return false;
        const p = parsePosition(other.posicion);
        if (!p.base || !p.level) return false;
        if (p.base !== c.base) return false;
        return levelRank(p.level) > c.rank;
      });
      return !hasAbove;
    });

    if (topCandidates.length === 0) return null;

    // Alegem cel mai bun:
    // - preferăm cel mai sus (rank maxim) pentru că e top-of-stack și accesibil
    // - dacă sunt mai multe, îl luăm pe primul după sortare
    topCandidates.sort((a, b) => b.rank - a.rank);

    return topCandidates[0].row || null;
  } catch (e) {
    try {
      window.__raynaLog?.("PickContainer/Error", { message: e?.message || String(e) }, "error");
    } catch {}
    return null;
  }
}

export default { pickContainerForLoad };
