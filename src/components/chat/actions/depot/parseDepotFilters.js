// v3 – parser cu log în UI + regex-uri mai robuste
export const PARSER_TAG = "parseDepotFilters@v3";

function norm(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // scoate diacritice (iOS-friendly)
    .toLowerCase()
    .trim();
}

// expun pentru debug din handleDepotList
export const __normForDebug = norm;

export function parseDepotFilters(userText = "") {
  const raw = String(userText || "");
  const t = norm(raw); // ex. “vacíos” -> “vacios”

  // log în ErrorTray, ca să vezi exact ce ajunge aici
  try { window.__raynaLog?.("PARSER/INPUT", { tag: PARSER_TAG, raw, norm: t }); } catch {}

  // 1) cod ISO (4 litere + 7 cifre fără separatori)
  const compact = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (/[A-Z]{4}\d{7}/.test(compact)) {
    const out = { kind: "single", estado: null, size: null, naviera: null, wantExcel: false };
    try { window.__raynaLog?.("PARSER/OUT", out); } catch {}
    return out;
  }

  // 2) ESTADO
  let estado = null;
  if (/\bprogramad\w*\b/.test(t)) {
    estado = "programado";
  } else if (/\brot\w*\b|\bdefect\w*\b/.test(t)) {
    estado = "roto";
  } else if (/(^|\W)vaci(?:o|os|a|as)?\b|(^|\W)vaci\b|\bempty\b|\bdesocupad\w*\b/.test(t)) {
    // prinde: vacio, vacios, vacia, vacias, "vaci", "empty"
    estado = "vacio";
  } else if (/\bllen\w*\b|\bfull\b/.test(t)) {
    estado = "lleno";
  }

  // 3) SIZE
  let size = null;
  if (/\b40\s*hc\b|\b40hc\b|\b40\s*(alto|high\s*cube)\b/.test(t)) size = "40hc";
  else if (/\b40\b/.test(t)) size = "40";
  else if (/\b20\b/.test(t)) size = "20";

  // 4) NAVIERA (listă + “de <x>”)
  let naviera = null;
  const KNOWN = ["MAERSK","MSC","HAPAG","HMM","ONE","COSCO","EVERGREEN","CMA","YANG MING","ZIM","MESSINA"];
  const tn = raw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const k of KNOWN) {
    const rx = new RegExp(`\\b${k.replace(/\s+/g,"\\s+")}\\b`, "i");
    if (rx.test(tn)) { naviera = k; break; }
  }
  if (!naviera) {
    const m = raw.match(/\bde\s+([A-Za-z0-9][\w\s-]{2,})/i);
    if (m) naviera = m[1].trim().toUpperCase();
  }

  // 5) Excel?
  const wantExcel = /\bexcel\b|\bdescarg[ae]\b/.test(t);

  const out = { kind: "list", estado, size, naviera, wantExcel };
  try { window.__raynaLog?.("PARSER/OUT", out); } catch {}
  return out;
}