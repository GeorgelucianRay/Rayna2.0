// src/components/chat/actions/depot/parseDepotFilters.js
function norm(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // scoate diacritice (iOS-friendly)
    .toLowerCase()
    .trim();
}

export function parseDepotFilters(userText = "") {
  const raw = String(userText || "");
  const t = norm(raw);

  // 1) detect cod container -> nu e listă
  const compact = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (/[A-Z]{4}\d{7}/.test(compact)) {
    return { kind: "single", estado: null, size: null, naviera: null, wantExcel: false };
  }

  // 2) estado (ordine contează – „vacio” înainte de „lleno” etc.)
  let estado = null;
  if (/\bprogramad/.test(t)) estado = "programado";
  else if (/\brot[oa]s?\b|\bdefect/.test(t)) estado = "roto";
  else if (/\bvacios?\b/.test(t)) estado = "vacio";
  else if (/\bllenos?\b/.test(t)) estado = "lleno";

  // 3) size: 40hc | 40 | 20 (prinde și „40 alto/alto 40”)
  let size = null;
  if (/\b40\s*hc\b|\b40hc\b|\b40\s*alto\b/.test(t)) size = "40hc";
  else if (/\b40\b/.test(t)) size = "40";
  else if (/\b20\b/.test(t)) size = "20";

  // 4) naviera (din listă + fallback „de XYZ”)
  let naviera = null;
  const KNOWN = [
    "MAERSK","MSC","HAPAG","HMM","ONE","COSCO",
    "EVERGREEN","CMA","YANG MING","ZIM","MESSINA"
  ];
  const tn = t; // deja normalizat
  for (const k of KNOWN) {
    if (tn.includes(norm(k))) { naviera = k; break; }
  }
  if (!naviera) {
    // „de Maersk”, „de hapag lloyd”, etc.
    const m = raw.match(/\bde\s+([A-Za-z][\w\s-]{2,})/i);
    if (m) naviera = m[1].trim().toUpperCase();
  }

  // 5) excel?
  const wantExcel = /\bexcel\b|\bdescargar\b|\bdescarga\b/.test(t);

  return { kind: "list", estado, size, naviera, wantExcel };
}