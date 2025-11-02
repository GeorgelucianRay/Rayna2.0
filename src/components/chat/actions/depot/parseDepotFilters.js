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
  const t = norm(raw); // ex: 'qué contenedores vacíos hay?' -> 'que contenedores vacios hay'

  // 1) Dacă e cod container ISO -> nu e listă
  const compact = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (/[A-Z]{4}\d{7}/.test(compact)) {
    return { kind: "single", estado: null, size: null, naviera: null, wantExcel: false };
  }

  // 2) Estado (ordine contează)
  let estado = null;
  if (/\bprogramad/.test(t)) estado = "programado";
  else if (/\brot[oa]s?\b|\bdefect/.test(t)) estado = "roto";
  else if (/\bllenos?\b/.test(t)) estado = "lleno";
  else if (/\bvacios?\b|\bvacio\b/.test(t)) estado = "vacio"; // 'vacio' sau 'vacios'

  // 3) Mărime: 40hc | 40 | 20
  let size = null;
  if (/\b40\s*hc\b|\b40hc\b|\b40\s*alto\b/.test(t)) size = "40hc";
  else if (/\b40\b/.test(t)) size = "40";
  else if (/\b20\b/.test(t)) size = "20";

  // 4) Naviera (listă cunoscută + fallback “de XYZ”)
  let naviera = null;
  const KNOWN = [
    "MAERSK","MSC","HAPAG","HMM","ONE","COSCO",
    "EVERGREEN","CMA","YANG MING","ZIM","MESSINA"
  ];
  for (const k of KNOWN) {
    const rx = new RegExp(`\\b${norm(k)}\\b`);
    if (rx.test(t)) { naviera = k; break; }
  }
  if (!naviera) {
    const m = raw.match(/\bde\s+([A-Za-z0-9][\w\s-]{2,})/i);
    if (m) naviera = m[1].trim().toUpperCase();
  }

  // 5) Vrea Excel?
  const wantExcel = /\bexcel\b|\bdescargar\b|\bdescarga\b/.test(t);

  return { kind: "list", estado, size, naviera, wantExcel };
}