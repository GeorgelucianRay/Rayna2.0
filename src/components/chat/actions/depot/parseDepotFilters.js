// Parser robust pentru text liber -> { estado, size, naviera, wantExcel }
// Suportă ES/RO/CA, diacritice, sinonime și ordine aleatorie a cuvintelor.
// Exemplu: "Rayna, hazme una lista con los contenedores vacíos de Maersk de 40HC"
// => { estado:"vacio", naviera:"maersk", size:"40hc", wantExcel:false }

function norm(s = "") {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NAVIERAS = [
  "maersk","hapag","evergreen","cma","cma cgm","msc","cosco","one","yang ming","yml","zim","apl","hmm","alk","messina"
];

// chei -> valoarea canonică
const ESTADO_PATTERNS = [
  { rx: /\b(vacio|vacios|vacioas|vacii|vacio|vac[ii]o|vac[i]o)\b|\b(goale?)\b|\b(buit[as]?|buits?)\b/, val: "vacio" },
  { rx: /\b(lleno|llenos|plin[ei]?)\b|\b(plens?)\b/, val: "lleno" },
  { rx: /\b(roto|rotos|rupt[ei]?)\b|\b(trencats?)\b/, val: "roto" },
  { rx: /\b(programado|programados|programate|programats)\b/, val: "programado" },
];

const SIZE_PATTERNS = [
  { rx: /\b20\b/, val: "20" },
  { rx: /\b40hc\b|\b40h\b|\b40\s*alto\b|\b40\s*high\b|\b40\s*high\s*cube\b/, val: "40hc" },
  { rx: /\b40\b/, val: "40" },
];

const EXCEL_PATTERNS = /\bexcel\b|\bdescargar?\b|\bdescarca\b|\bdescarcare\b|\bexport(ar)?\b|\bhoja\b|\bxls\b|\bxlsx\b/;

// opțional: dacă fraza conține un cod ISO de container, NU e listă, e lookup de 1 singur
const CONTAINER_CODE = /[a-z]{4}\s?\d{7}\b/i;

// încearcă să detectezi naviera ca "cuvânt întreg" sau secvență de 2 cuvinte (ex: "yang ming")
function detectNaviera(t) {
  for (const n of NAVIERAS) {
    const token = norm(n);
    const rx = new RegExp(`\\b${token.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (rx.test(t)) return n.toLowerCase();
  }
  // fallback: dacă userul scrie "maerskline" sau "maersk." etc
  for (const n of NAVIERAS) {
    if (t.includes(n)) return n.toLowerCase();
  }
  return null;
}

/** Parse principal */
export function parseDepotFilters(rawText = "") {
  const t = norm(rawText);

  // dacă e clar un cod de container -> nu trata ca listă
  if (CONTAINER_CODE.test(rawText)) {
    return { kind: "single", estado: null, size: null, naviera: null, wantExcel: false };
  }

  // estado
  let estado = null;
  for (const p of ESTADO_PATTERNS) {
    if (p.rx.test(t)) { estado = p.val; break; }
  }

  // size
  let size = null;
  for (const p of SIZE_PATTERNS) {
    if (p.rx.test(t)) { size = p.val; break; }
  }

  // naviera
  const naviera = detectNaviera(t);

  // cere excel?
  const wantExcel = EXCEL_PATTERNS.test(t);

  return { kind: "list", estado, size, naviera, wantExcel };
}