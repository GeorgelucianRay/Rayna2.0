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
    "Ă":"a","Â":"a","Î":"i","Ș":"s","Ş":"s","Ț":"t","Ţ":"t",
    // CA (folosește același fallback latin)
    "ò":"o","ó":"o","à":"a","è":"e","é":"e","ï":"i","ü":"u",
    "Ò":"o","Ó":"o","À":"a","È":"e","É":"e","Ï":"i","Ü":"u"
  };
  let out = String(s).replace(/[\s\S]/g, c => DIAC[c] ?? c);
  out = out.toLowerCase();
  // doar litere/cifre/spații – evităm \p{L} pentru compat Safari/iOS
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

/* -------------------- Heuristic language detect -------------------- */
/** Returnează 'es' | 'ro' | 'ca' (sau 'es' fallback) */
export function detectLanguage(raw) {
  const n = normalize(raw);
  const toks = new Set(n.split(" ").filter(Boolean));

  // semnale ușoare (greetings, conectori, întrebări frecvente)
  const ES = ["hola","buenas","buenos","dias","días","tardes","noches","quiero","como","cómo","llego","abrir","abre","camara","cámara","donde","dónde","hay","ver"];
  const RO = ["salut","buna","bună","buna ziua","ziua","vreau","cum","ajung","deschide","camera","unde","este","e","lista","client","sofer","șofer"];
  const CA = ["hola","bon","bon dia","bones","tardes","nits","vull","com","arribo","obre","camaras","càmera","on","esta","està","veure"];

  const score = (arr) => arr.reduce((s, w) => s + (toks.has(normalize(w)) ? 1 : 0), 0);

  const es = score(ES);
  const ro = score(RO);
  const ca = score(CA);

  if (ro > es && ro >= ca) return "ro";
  if (ca > es && ca >= ro) return "ca";
  return "es";
}

/* -------------------- Helpers pentru capturi -------------------- */
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
    const candidate = toks.slice(-3).join(" ").trim();
    const generic = new Set(["camara","camera","camere"]);
    if (!candidate || generic.has(candidate)) return null;
    if (/^[a-z0-9._ -]{2,}$/i.test(candidate)) return candidate;
  }
  const trimmed = String(raw).trim().replace(/[?!.]+$/, "");
  if (/^[A-Za-z0-9._ -]{2,}$/.test(trimmed)) return normalize(trimmed);
  return null;
}

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

/* -------------------- Localizare intent -------------------- */
/**
 * Acceptă atât string cât și obiect {es,ro,ca}. Returnează string în limba cerută.
 */
function pickLang(val, lang) {
  if (val == null) return undefined;
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    return val[lang] || val.es || val.ro || val.ca || "";
  }
  return String(val);
}

function deepClone(obj) {
  return obj ? JSON.parse(JSON.stringify(obj)) : obj;
}

function localizeIntent(intent, lang) {
  const it = deepClone(intent);
  // response.text
  if (it.response && "text" in it.response) {
    it.response.text = pickLang(it.response.text, lang);
  }
  // not_found.text
  if (it.not_found && "text" in it.not_found) {
    it.not_found.text = pickLang(it.not_found.text, lang);
  }
  // dialog: ask_text, save_ok, save_err
  if (it.dialog) {
    if ("ask_text" in it.dialog) it.dialog.ask_text = pickLang(it.dialog.ask_text, lang);
    if ("save_ok" in it.dialog) it.dialog.save_ok = pickLang(it.dialog.save_ok, lang);
    if ("save_err" in it.dialog) it.dialog.save_err = pickLang(it.dialog.save_err, lang);
  }
  return it;
}

/* ---------------------- Intent detect ------------------------ */
export function detectIntent(message, intentsJson) {
  const text = String(message ?? "");
  const list = Array.isArray(intentsJson) ? intentsJson : [];
  const lang = detectLanguage(text); // ← alegem limba în funcție de input

  // sortare defensivă după priority (desc)
  const intents = [...list].sort((a, b) => (b?.priority || 0) - (a?.priority || 0));

  for (const rawIntent of intents) {
    if (!rawIntent) continue;
    if (rawIntent.id === "fallback") continue;

    // 1) potrivire pe patterns (funcționează indiferent de limbă datorită normalize + fuzzy)
    let ok = includesAny(text, rawIntent.patterns_any) || hasToken(text, rawIntent.patterns_any);

    // 1.1) negative_any — inhibit
    if (ok && rawIntent.negative_any) {
      const negHit = includesAny(text, rawIntent.negative_any) || hasToken(text, rawIntent.negative_any);
      if (negHit) ok = false;
    }

    // 2) Heuristica pentru ver_camara: acceptă substantiv sau verb + frază scurtă,
    // și evită interogările de tip listă.
    if (!ok && rawIntent.id === "ver_camara") {
      const tokens = normalize(text).split(" ").filter(Boolean);
      const hasNounCue = includesAny(text, ["camara","cámara","camera","camere"]);
      const hasVerbCue = includesAny(text, ["abre","abrir","ver","muestra","mostrar","desplegar","deschide"]);
      const isListy = includesAny(text, [
        "que camaras hay","qué camaras hay","qué cámaras hay",
        "lista camaras","listado camaras","ver todas las camaras",
        "todas las camaras","todas las cámaras"
      ]);
      if (!isListy && (hasNounCue || hasVerbCue) && tokens.length <= 5) ok = true;
    }

    if (!ok) continue;

    // 3) slots
    const slots = {};
    if (rawIntent.slots?.cameraName) {
      const name = captureCameraName(text, rawIntent.stopwords);
      if (name) slots.cameraName = name;
    }
    if (rawIntent.slots?.placeName) {
      const pname = capturePlaceName(text, rawIntent.stopwords);
      if (pname) slots.placeName = pname;
    }

    // 4) localizează intentul înainte de return — pentru compat cu RaynaHub care citește response.text
    const intent = localizeIntent(rawIntent, lang);
    return { intent, slots, lang };
  }

  // 5) fallback (localizat)
  const fbRaw = intents.find(i => i?.id === "fallback") || { id: "fallback", type: "static", response: { text: { es: "No te he entendido.", ro: "Nu te-am înțeles.", ca: "No t'he entès." } } };
  const intent = localizeIntent(fbRaw, lang);
  return { intent, slots: {}, lang };
}