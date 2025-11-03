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
  const t = norm(raw); // ex.: “vacíos” -> “vacios”

  // 1) detect cod container -> nu e listă
  const compact = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (/[A-Z]{4}\d{7}/.test(compact)) {
    return { kind: "single", estado: null, size: null, naviera: null, wantExcel: false };
  }

  // 2) ESTADO (ordine contează)
  let estado = null;
  // programado / programada / programados / programadas
  if (/\bprogramad(?:o|a|os|as)\b/.test(t)) {
    estado = "programado";
  }
  // roto / rota / rotos / rotas + “defect…”
  else if (/\brot(?:o|a|os|as)\b|\bdefect\w*\b/.test(t)) {
    estado = "roto";
  }
  // vacio / vacios / vacia / vacias + forme scurte (“vaci”) + sinonime de bază
  else if (/\bvac(?:io|ios|ia|ias)?\b|\bvaci\b|\bempty\b|\bdesocupad\w*\b/.test(t)) {
    estado = "vacio";
  }
  // lleno / llenos / llena / llenas + “full”
  else if (/\bllen(?:o|os|a|as)\b|\bfull\b/.test(t)) {
    estado = "lleno";
  }

  // 3) SIZE: 40hc | 40 | 20 (acceptă “alto”, “high cube”)
  let size = null;
  if (/\b40\s*hc\b|\b40hc\b|\b40\s*(alto|high\s*cube)\b/.test(t)) size = "40hc";
  else if (/\b40\b/.test(t)) size = "40";
  else if (/\b20\b/.test(t)) size = "20";

  // 4) NAVIERA (din listă + fallback “de XYZ”)
  let naviera = null;
  const KNOWN = ["MAERSK","MSC","HAPAG","HMM","ONE","COSCO","EVERGREEN","CMA","YANG MING","ZIM","MESSINA"];
  const tn = norm(raw).toUpperCase();
  for (const k of KNOWN) {
    const kNorm = norm(k).toUpperCase(); // “YANG MING” -> “YANG MING”
    const rx = new RegExp(`\\b${kNorm.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (rx.test(tn)) { naviera = k; break; }
  }
  if (!naviera) {
    const m = raw.match(/\bde\s+([A-Za-z0-9][\w\s-]{2,})/i);
    if (m) naviera = m[1].trim().toUpperCase();
  }

  // 5) Excel?
  const wantExcel = /\bexcel\b|\bdescarg[ae]\b/.test(t);

  return { kind: "list", estado, size, naviera, wantExcel };
}