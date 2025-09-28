// src/nluEngine.js

// ——— Normalize: minuscul, fără diacritice, doar [a-z0-9 spațiu]
export function normalize(s) {
  if (s == null) return "";
  const DIAC = {
    // ES
    "á":"a","é":"e","í":"i","ó":"o","ú":"u","ü":"u","ñ":"n",
    "Á":"a","É":"e","Í":"i","Ó":"o","Ú":"u","Ü":"u","Ñ":"n",
    // RO
    "ă":"a","â":"a","î":"i","ș":"s","ş":"s","ț":"t","ţ":"t",
    "Ă":"a","Â":"a","Î":"i","Ș":"s","Ş":"s","Ț":"t","Ţ":"t"
  };
  let out = String(s).replace(/[\s\S]/g, c => DIAC[c] ?? c);
  out = out.toLowerCase();
  // doar litere englezești/ cifre / spații – evităm \p{L} pentru compat Safari
  out = out.replace(/[^a-z0-9\s]/g, " ");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

// ——— Damerau–Levenshtein (simplu) pentru fuzzy token match
function ed(a, b) {
  const al = a.length, bl = b.length;
  const d = Array.from({ length: al + 1 }, (_, i) =>
    Array.from({ length: bl + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + c);
      }
    }
  }
  return d[al][bl];
}
const fuzzyEq = (a, b) => {
  a = normalize(a); b = normalize(b);
  if (a === b) return true;
  const L = Math.max(a.length, b.length);
  const tol = L <= 4 ? 1 : 2;
  return ed(a, b) <= tol;
};

// ——— Potrivire corectă (fără sub-șiruri accidentale)
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * includesAny:
 * - dacă pattern-ul are spații -> căutăm fraza cu margini (start/spațiu ... spațiu/sfârșit)
 * - dacă e un singur cuvânt -> comparăm pe token-uri (fuzzy)
 */
function includesAny(text, arr) {
  if (!Array.isArray(arr) || !arr.length) return false;
  const n = normalize(text);
  const toks = n.split(" ").filter(Boolean);

  return arr.some(p => {
    const np = normalize(p);
    if (!np) return false;

    if (np.includes(" ")) { // frază
      const re = new RegExp(`(?:^|\\s)${esc(np)}(?:\\s|$)`);
      return re.test(n);
    } else { // cuvânt
      return toks.some(tk => fuzzyEq(tk, np));
    }
  });
}

function hasToken(text, list) {
  if (!Array.isArray(list) || !list.length) return false;
  const toks = normalize(text).split(" ").filter(Boolean);
  return list.some(w => toks.some(tk => fuzzyEq(tk, normalize(w))));
}

/* -------------------- Capture: cameraName -------------------- */
function captureCameraName(raw, stopwords = []) {
  const service = new Set([
    ...(stopwords || []),
    "la","el","una","un","de","del","al",
    "camara","cámara","camera","camaras","cámaras",
    "abre","abrir","abreme","ábreme","ver","muestra","mostrar","desplegar",
    "deschide","vreau","sa","să","vad","văd","quiero",
    "por","favor","pf","pls","porfavor","please","entonces","ok","vale",
    "añadir","anadir","agregar","crear","nueva","nuevo",
    "adauga","adaugă","adaug","adăuga","adaugare","add","poner","publicar"
  ].map(normalize));

  const toks = normalize(raw).split(" ").filter(Boolean).filter(w => !service.has(w));
  if (toks.length >= 1) {
    const candidate = toks.slice(-3).join(" ").trim(); // ultimele 1–3 cuvinte utile
    const generic = new Set(["camara","camera"]);
    if (!candidate || generic.has(candidate)) return null;
    if (/^[a-z0-9._ -]{2,}$/i.test(candidate)) return candidate;
  }
  const trimmed = String(raw).trim().replace(/[?!.]+$/, "");
  if (/^[A-Za-z0-9._ -]{2,}$/.test(trimmed)) return normalize(trimmed);
  return null;
}

/* -------------------- Capture: placeName --------------------- */
function capturePlaceName(raw, stopwords = []) {
  const service = new Set([
    ...(stopwords || []),
    "a","al","la","el","de","del","pe","catre","către",
    "quiero","llegar","llevar","ir","navegar","como","cómo","llego",
    "vreau","sa","să","ajung","merg",
    "info","informacion","información","donde","dónde","esta","está",
    "despre"
  ].map(normalize));

  const toks = normalize(raw).split(" ").filter(Boolean).filter(w => !service.has(w));
  if (toks.length >= 1) {
    const cand = toks.slice(-4).join(" ").trim();
    if (/^[a-z0-9._ -]{2,}$/i.test(cand)) return cand;
  }
  const trimmed = String(raw).trim().replace(/[?!.]+$/, "");
  if (/^[A-Za-z0-9._ -]{2,}$/.test(trimmed)) return normalize(trimmed);
  return null;
}

/* ---------------------- Intent detect ------------------------ */
export function detectIntent(message, intentsJson) {
  const text = String(message ?? "");
  const list = Array.isArray(intentsJson) ? intentsJson : [];

  // sortare defensivă după priority (desc)
  const intents = [...list].sort((a, b) => (b?.priority || 0) - (a?.priority || 0));

  for (const it of intents) {
    if (!it) continue;
    if (it.id === "fallback") continue;

    // 1) potrivire pe patterns
    let ok = includesAny(text, it.patterns_any) || hasToken(text, it.patterns_any);

    // 1.1) negative_any — ex.: “añadir” inhibă ver_camara
    if (ok && it.negative_any) {
      const negHit = includesAny(text, it.negative_any) || hasToken(text, it.negative_any);
      if (negHit) ok = false;
    }

    // 2) Heuristică ver_camara (mesaj scurt sau indicii de „cameră”, fără „crear”)
    if (!ok && it.id === "ver_camara") {
      const tokens = normalize(text).split(" ").filter(Boolean);
      const hasCameraCue = includesAny(text, [
        "camara","cámara","camera","abre","abrir","ver","muestra","mostrar","desplegar","deschide"
      ]);
      const createCue = includesAny(text, [
        "añadir","anadir","agregar","crear","nueva","nuevo",
        "adauga","adaugă","adaug","adăuga","adaugare","add",
        "poner","publicar","alta"
      ]);
      if ((hasCameraCue && !createCue) || tokens.length <= 2) ok = true;
    }

    // 3) Heuristică GPS (mesaj foarte scurt: doar numele)
    if (!ok && (it.id === "gps_navegar_a" || it.id === "gps_info_de")) {
      const tokens = normalize(text).split(" ").filter(Boolean);
      if (tokens.length <= 2) ok = true;
    }

    if (!ok) continue;

    // 4) slots
    const slots = {};
    if (it.slots?.cameraName) {
      const name = captureCameraName(text, it.stopwords);
      if (name) slots.cameraName = name;
    }
    if (it.slots?.placeName) {
      const pname = capturePlaceName(text, it.stopwords);
      if (pname) slots.placeName = pname;
    }

    return { intent: it, slots };
  }

  // 5) fallback
  const fb = intents.find(i => i?.id === "fallback");
  return { intent: fb || { id: "fallback", type: "static", response: { text: "No te he entendido." } }, slots: {} };
}