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

// ——— Damerau–Levenshtein simplu (fuzzy pe token)
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
  const tol = L <= 4 ? 1 : 2; // mai tolerant pentru cuvinte mai lungi
  return ed(a, b) <= tol;
};

// ——— Potrivire fără sub-șiruri accidentale
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * includesAny:
 * - dacă pattern-ul are spații -> căutăm fraza cu margini
 * - dacă e un singur cuvânt -> comparăm pe token-uri (fuzzy)
 */
function includesAny(text, arr) {
  if (!Array.isArray(arr) || !arr.length) return false;
  const n = normalize(text);
  const toks = n.split(" ").filter(Boolean);

  return arr.some(p => {
    const np = normalize(p);
    if (!np) return false;

    if (np.includes(" ")) { // frază exactă (după normalizare)
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
// extrage numele camerei din coadă, eliminând verbe/umpluturi
function captureCameraName(raw, stopwords = []) {
  const service = new Set([
    ...(stopwords || []),
    // articole/prepoziții
    "la","el","una","un","de","del","al","en",
    // substantive generale
    "camara","cámara","camera","camaras","cámaras","camere",
    // verbe/umpluturi
    "abre","abrir","abreme","ver","muestra","mostrar","desplegar","deschide",
    "quiero","vreau","sa","să","vad","văd",
    "por","favor","pf","pls","ok","vale",
    "que","qué","pasa","hay",
    // creare / administrativ
    "añadir","anadir","agregar","crear","nueva","nuevo",
    "adauga","adaugă","adaug","adăuga","adaugare","add","poner","publicar",
    "lista","listado","todas","tutti","todes"
  ].map(normalize));

  const toks = normalize(raw).split(" ").filter(Boolean).filter(w => !service.has(w));
  if (toks.length >= 1) {
    const candidate = toks.slice(-3).join(" ").trim(); // ultimele 1–3 cuvinte utile
    const generic = new Set(["camara","camera","camere"]);
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
    // articole/prepoziții
    "a","al","la","el","de","del","en","pe","catre","către",
    // verbe/umpluturi
    "quiero","llegar","llevar","ir","navegar","como","cómo","llego",
    "vreau","sa","să","ajung","merg",
    "info","informacion","información","detalii",
    "donde","dónde","esta","está","despre",
    "cliente","client","clientul","que","qué","pasa","hay"
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

    // 1.1) negative_any — inhibit
    if (ok && it.negative_any) {
      const negHit = includesAny(text, it.negative_any) || hasToken(text, it.negative_any);
      if (negHit) ok = false;
    }

    // 2) Heuristica pentru ver_camara: cere substantiv + frază scurtă, NU „lista/qué … hay”
    if (!ok && it.id === "ver_camara") {
      const tokens = normalize(text).split(" ").filter(Boolean);
      const hasNoun = includesAny(text, ["camara","cámara","camera","camere"]);
      const isListy = includesAny(text, ["que camaras hay","qué camaras hay","qué cámaras hay","lista camaras","listado camaras","ver todas las camaras"]);
      if (hasNoun && !isListy && tokens.length <= 4) ok = true;
    }

    // 3) Heuristică specială pentru ver_camara:
if (!ok && it.id === "ver_camara") {
  const tokens = normalize(text).split(" ").filter(Boolean);
  const hasNounCue = includesAny(text, ["camara","cámara","camera","camere"]);
  const hasVerbCue = includesAny(text, ["abre","abrir","ver","muestra","mostrar","desplegar","deschide"]);

  // acceptă fie substantiv, fie verb + frază scurtă
  if ((hasNounCue || hasVerbCue) && tokens.length <= 5) {
    ok = true;
  }
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