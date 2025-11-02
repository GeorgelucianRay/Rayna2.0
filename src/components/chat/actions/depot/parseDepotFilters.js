// src/components/chat/actions/depot/parseDepotFilters.js

function norm(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // <- sigur pe iOS
    .toLowerCase()
    .trim();
}

export function parseDepotFilters(userText = "") {
  const raw = String(userText || "");
  const t = norm(raw);

  // cod container? => nu e listă
  const compact = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (/[A-Z]{4}\d{7}/.test(compact)) {
    return { kind: "single", estado: null, size: null, naviera: null, wantExcel: false };
  }

  // estado
  let estado = null;
  if (/\bprogramad/.test(t)) estado = "programado";
  else if (/\brot[oa]s?\b|\bdefect/.test(t)) estado = "roto";
  else if (/\blleno?s?\b/.test(t)) estado = "lleno";
  else if (/\bvacio?s?\b/.test(t)) estado = "vacio";

  // mărime
  let size = null;
  if (/\b40\s*hc\b|\b40hc\b/.test(t)) size = "40hc";
  else if (/\b40\b/.test(t))          size = "40";
  else if (/\b20\b/.test(t))          size = "20";

  // naviera
  let naviera = null;
  const KNOWN = [
    "MAERSK","MSC","HAPAG","HMM","ONE","COSCO",
    "EVERGREEN","CMA","YANG MING","ZIM","MESSINA"
  ];
  for (const k of KNOWN) {
    if (t.includes(norm(k))) { naviera = k; break; }
  }
  if (!naviera) {
    const m = raw.match(/\bde\s+([A-Za-z][\w\s-]{2,})/i);
    if (m) naviera = m[1].trim().toUpperCase();
  }

  const wantExcel = /\bexcel\b|\bdescargar\b|\bdescarga\b/.test(t);

  return { kind: "list", estado, size, naviera, wantExcel };
}