// src/components/chat/actions/depot/parseDepotFilters.js
function norm(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip accente (safe pe iOS)
    .toLowerCase()
    .trim();
}

export function parseDepotFilters(userText = "") {
  const raw = String(userText || "");
  const t = norm(raw);

  // ——— dacă a introdus un cod exact de container, nu e listă
  const compact = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (/[A-Z]{4}\d{7}/.test(compact)) {
    return { kind: "single", estado: null, size: null, naviera: null, wantExcel: false };
  }

  // ——— estado
  let estado = null;
  if (/\bprogramad/.test(t))               estado = "programado";         // programado/a(s)
  else if (/\brot[oa]s?\b|\bdefect/.test(t)) estado = "roto";             // roto/a(s), defectos
  else if (/\bllenos?\b/.test(t))          estado = "lleno";              // 'lleno' sau 'llenos'
  else if (/\bvacios?\b/.test(t))          estado = "vacio";              // 'vacio' sau 'vacios'

  // ——— mărime
  let size = null;
  if (/\b40\s*hc\b|\b40hc\b/.test(t))      size = "40hc";
  else if (/\b40\b/.test(t))               size = "40";
  else if (/\b20\b/.test(t))               size = "20";

  // ——— naviera (aliasuri frecvente)
  let naviera = null;
  const KNOWN = [
    "MAERSK","MAERSK LINE",
    "MSC",
    "HAPAG","HAPAG-LLOYD",
    "HMM",
    "ONE",
    "COSCO",
    "EVERGREEN",
    "CMA","CMA CGM",
    "YANG MING",
    "ZIM",
    "MESSINA"
  ];
  for (const k of KNOWN) {
    if (t.includes(norm(k))) { naviera = k; break; }
  }
  if (!naviera) {
    // „de Maersk”, „de hapag-lloyd”, etc.
    const m = raw.match(/\bde\s+([A-Za-z][\w\s-]{2,})/i);
    if (m) naviera = m[1].trim().toUpperCase();
  }

  const wantExcel = /\bexcel\b|\bdescargar\b|\bdescarga\b/.test(t);

  return { kind: "list", estado, size, naviera, wantExcel };
}