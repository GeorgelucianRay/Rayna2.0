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
    // CA
    "ò":"o","ó":"o","à":"a","è":"e","é":"e","ï":"i","ü":"u",
    "Ò":"o","Ó":"o","À":"a","È":"e","É":"e","Ï":"i","Ü":"u"
  };
  let out = String(s).replace(/[\s\S]/g, c => DIAC[c] ?? c);
  out = out.toLowerCase();
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
  const tol = L <= 4 ? 1 : 2;
  return ed(a, b) <= tol;
};

// ——— Potrivire fără sub-șiruri accidentale
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function includesAny(text, arr) {
  if (!Array.isArray(arr) || !arr.length) return false;
  const n = normalize(text);
  const toks = n.split(" ").filter(Boolean);
  return arr.some(p => {
    const np = normalize(p);
    if (!np) return false;
    if (np.includes(" ")) {
      const re = new RegExp(`(?:^|\\s)${esc(np)}(?:\\s|$)`);
      return re.test(n);
    } else {
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
export function detectLanguage(raw) {
  const n = normalize(raw);
  const toks = new Set(n.split(" ").filter(Boolean));
  const ES = ["hola","buenas","buenos","dias","tardes","noches","quiero","como","llego","abrir","abre","camara","donde","hay","ver","navegar","itv","camion","remolque"];
  const RO = ["salut","buna","bună","ziua","vreau","cum","ajung","deschide","camera","unde","este","lista","client","gps","itv","camion","remorca","remorcă"];
  const CA = ["hola","bon","bones","tardes","nits","vull","com","arribo","obre","camaras","càmera","on","esta","veure","navegar","itv","camio","camió","remolc","remolque"];
  const score = (arr) => arr.reduce((s, w) => s + (toks.has(normalize(w)) ? 1 : 0), 0);
  const es = score(ES), ro = score(RO), ca = score(CA);
  if (ro > es && ro >= ca) return "ro";
  if (ca > es && ca >= ro) return "ca";
  return "es";
}

/* -------------------- Cues de ACȚIUNE -------------------- */
const CAMERA_VERBS = ["abre","abrir","ver","muestra","mostrar","desplegar","deschide","obre"];
const CAMERA_NOUNS = ["camara","cámara","camera","camere","càmera"];
const GPS_CUES = [
  "quiero llegar a","llevar a","ir a","navegar a","como llego a","cómo llego a",
  "vreau sa ajung la","vreau să ajung la","vreau sa merg la","vreau să merg la","navigheaza la","navighează la","cum ajung la",
  "vull arribar a","portar a","anar a","com arribo a"
];
function hasActionCue(text) {
  return includesAny(text, CAMERA_VERBS) || includesAny(text, CAMERA_NOUNS) || includesAny(text, GPS_CUES);
}

/* -------------------- Saluturi / Umpluturi -------------------- */
const GREETINGS = [
  "hola","buenas","buenos","dias","días","tardes","noches",
  "salut","buna","bună","ziua","seara","buna ziua","bună ziua","buna seara","bună seara",
  "bon","bon dia","bones","tardes","nits","bona","bona tarda","bona nit"
];
const COMMON_FILLERS = ["por","favor","pf","pls","ok","vale","te","rog","mersi","merci"];

/* -------------------- Helpers pentru capturi -------------------- */
function extractTailMeaningful(raw, extraStop = [], maxWords = 3) {
  const service = new Set([...extraStop, ...GREETINGS, ...COMMON_FILLERS].map(normalize));
  const toks = normalize(raw).split(" ").filter(Boolean);
  const clean = toks.filter(w => !service.has(w));
  if (!clean.length) return null;
  const tail = clean.slice(-maxWords);
  const joined = tail.join(" ").trim();
  return /^[a-z0-9._ -]{2,}$/i.test(joined) ? joined : null;
}
function captureCameraName(raw, stopwords = []) {
  const EXTRA = [
    ...(stopwords || []),
    "la","el","una","un","de","del","al","en",
    "camara","cámara","camera","camaras","cámaras","camere"
  ];
  return extractTailMeaningful(raw, EXTRA, 3);
}
function capturePlaceName(raw, stopwords = []) {
  const EXTRA = [
    ...(stopwords || []),
    "a","al","la","el","de","del","en","pe","catre","către",
    "quiero","llegar","llevar","ir","navegar","como","cómo","llego",
    "vreau","sa","să","ajung","merg",
    "donde","dónde","esta","está","unde","este","e","on","es","és",
    "info","informacion","información","detalii","despre","pasa","hay","que","qué"
  ];
  return extractTailMeaningful(raw, EXTRA, 4);
}

/* -------------------- Localizare intent -------------------- */
function pickLang(val, lang) {
  if (val == null) return undefined;
  if (typeof val === "string") return val;
  if (typeof val === "object") return val[lang] || val.es || val.ro || val.ca || "";
  return String(val);
}
function deepClone(obj) { return obj ? JSON.parse(JSON.stringify(obj)) : obj; }
function localizeIntent(intent, lang) {
  const it = deepClone(intent);
  if (it.response && "text" in it.response) it.response.text = pickLang(it.response.text, lang);
  if (it.not_found && "text" in it.not_found) it.not_found.text = pickLang(it.not_found.text, lang);
  if (it.dialog) {
    if ("ask_text" in it.dialog) it.dialog.ask_text = pickLang(it.dialog.ask_text, lang);
    if ("save_ok" in it.dialog) it.dialog.save_ok = pickLang(it.dialog.save_ok, lang);
    if ("save_err" in it.dialog) it.dialog.save_err = pickLang(it.dialog.save_err, lang);
  }
  return it;
}

/* -------------------- Self-queries quick detect (NEW) -------------------- */
function quickDetectSelf(message) {
  const n = normalize(message);
  const toks = new Set(n.split(" ").filter(Boolean));
  const has = (...words) => words.some(w => toks.has(normalize(w)));

  // --- indicii de bază
  const truckCue   = has("camion","camión","camio","camió","tractor");
  const trailerCue = has("remorca","remorcă","remolque","remolc","semiremorca","semiremorcă","semiremolque");
  const itvCue     = has("itv","rar","r.a.r","revizie","revizia");

  // --- ITV camion
  if (itvCue && truckCue) {
    return {
      id: "driver_truck_itv__synthetic",
      priority: 999,
      type: "action",
      action: "driver_self_info",
      meta: { topic: "truck_itv" },
      response: {
        text: {
          es: "La ITV de tu camión caduca el {{truck.itv}}.",
          ro: "ITV-ul camionului tău expiră la {{truck.itv}}.",
          ca: "L’ITV del teu camió caduca el {{truck.itv}}."
        }
      }
    };
  }

  // --- ITV remolque
  if (itvCue && trailerCue) {
    return {
      id: "driver_trailer_itv__synthetic",
      priority: 999,
      type: "action",
      action: "driver_self_info",
      meta: { topic: "trailer_itv" },
      response: {
        text: {
          es: "La ITV de tu remolque caduca el {{trailer.itv}}.",
          ro: "ITV-ul remorcii tale expiră la {{trailer.itv}}.",
          ca: "L’ITV del teu remolc caduca el {{trailer.itv}}."
        }
      }
    };
  }

  // --- Matricule (ambele)
  if (has("matricula","matriculacion","numar","număr","placa","plăcuță","placuta","placuta de inmatriculare","inscripcio","inscripció","matricula?","placas")) {
    return {
      id: "driver_plates__synthetic",
      priority: 998,
      type: "action",
      action: "driver_self_info",
      meta: { topic: "plates" },
      response: {
        text: {
          es: "Camión: {{truck.plate}} · Remolque: {{trailer.plate}}.",
          ro: "Camion: {{truck.plate}} · Remorcă: {{trailer.plate}}.",
          ca: "Camió: {{truck.plate}} · Remolc: {{trailer.plate}}."
        }
      }
    };
  }

  // --- Documente șofer (CAP / carnet / ADR)
  if (has("cap","carnet","permiso","permis","adr","atestate","acte","documente")) {
    return {
      id: "driver_credentials__synthetic",
      priority: 998,
      type: "action",
      action: "driver_self_info",
      meta: { topic: "driver_credentials" },
      response: {
        text: {
          es: "CAP: {{driver.cap}} · Carnet: {{driver.lic}} · ADR: {{driver.adr}}.",
          ro: "CAP: {{driver.cap}} · Carnet: {{driver.lic}} · ADR: {{driver.adr}}.",
          ca: "CAP: {{driver.cap}} · Carnet: {{driver.lic}} · ADR: {{driver.adr}}."
        }
      }
    };
  }

  /* ===== NOILE CUES — trebuie să fie ÎNĂUNTRUL funcției ===== */

  // „ver mi camión” / „ficha camión”
  const seeMyTruckCue =
    (has("mi") && (has("camion","camión","camio","camió"))) ||
    ((has("ver") || has("ficha") || has("mostrar")) && has("mi") && (has("camion","camión","camio","camió")));

  if (seeMyTruckCue) {
    return {
      id: "open_my_truck__synthetic",
      priority: 997,
      type: "action",
      action: "open_my_truck",
      response: {
        text: {
          es: "Claro, aquí tienes la ficha del camión.",
          ro: "Desigur, aici e fișa camionului.",
          ca: "És clar, aquí tens la fitxa del camió."
        }
      }
    };
  }

  // „¿quién soy yo?” / „cine sunt eu?”
  const whoAmICue =
    (has("quien","quién","cine") && (has("soy","sunt") || has("yo","eu"))) ||
    n.includes("quien soy yo") || n.includes("quién soy yo") || n.includes("cine sunt eu");

  if (whoAmICue) {
    return {
      id: "who_am_i__synthetic",
      priority: 997,
      type: "action",
      action: "who_am_i",
      response: {
        text: {
          es: "Hola, esto es lo que sé de ti:",
          ro: "Salut, iată ce știu despre tine:",
          ca: "Hola, això és el que sé de tu:"
        }
      }
    };
  }

  // ——— nimic detectat
  return null;
}
  

/* ---------------------- Intent detect ------------------------ */
export function detectIntent(message, intentsJson) {
  const text = String(message ?? "");
  const list = Array.isArray(intentsJson) ? intentsJson : [];
  const lang = detectLanguage(text);

  // ——— 0) Self-queries „scurtcircuit” (ITV, plăcuțe, documente)
  const synthetic = quickDetectSelf(text);
  if (synthetic) {
    const intent = localizeIntent(synthetic, lang);
    return { intent, slots: {}, lang };
  }

  // ——— 1) sortare
  const intents = [...list].sort((a, b) => (b?.priority || 0) - (a?.priority || 0));

  for (const rawIntent of intents) {
    if (!rawIntent) continue;
    if (rawIntent.id === "fallback") continue;

    // 2) potrivire pe patterns
    let ok = includesAny(text, rawIntent.patterns_any) || hasToken(text, rawIntent.patterns_any);

    // 2.1) negative_any — inhibit
    if (ok && rawIntent.negative_any) {
      const negHit = includesAny(text, rawIntent.negative_any) || hasToken(text, rawIntent.negative_any);
      if (negHit) ok = false;
    }

    // 2.2) NU trata salut dacă vedem indicii de acțiune (camera/GPS) sau dacă mesajul e mai lung
    if (ok && (rawIntent.id === "saludo" || rawIntent.id.startsWith("saludo_"))) {
      const tokens = normalize(text).split(" ").filter(Boolean);
      if (hasActionCue(text) || tokens.length > 5) ok = false;
    }

    // 3) Heuristica camere
    if (!ok && rawIntent.id === "ver_camara") {
      const tokens = normalize(text).split(" ").filter(Boolean);
      const hasNounCue = includesAny(text, CAMERA_NOUNS);
      const hasVerbCue = includesAny(text, CAMERA_VERBS);
      const isListy = includesAny(text, [
        "que camaras hay","qué camaras hay","qué cámaras hay",
        "lista camaras","listado camaras","ver todas las camaras",
        "todas las camaras","todas las cámaras",
        "lista camere","toate camerele","veure totes les càmeres"
      ]);
      if (!isListy && (hasNounCue || hasVerbCue) && tokens.length <= 7) ok = true;
    }

    if (!ok) continue;

    // 4) slots
    const slots = {};
    if (rawIntent.slots?.cameraName) {
      const name = captureCameraName(text, rawIntent.stopwords);
      if (name) slots.cameraName = name;
    }
    if (rawIntent.slots?.placeName) {
      const pname = capturePlaceName(text, rawIntent.stopwords);
      if (pname) slots.placeName = pname;
    }

    // 5) localizare
    const intent = localizeIntent(rawIntent, lang);
    return { intent, slots, lang };
  }

  // ——— 6) fallback
  const fbRaw = intents.find(i => i?.id === "fallback") || {
    id: "fallback", type: "static",
    response: { text: { es: "No te he entendido.", ro: "Nu te-am înțeles.", ca: "No t'he entès." } }
  };
  const intent = localizeIntent(fbRaw, lang);
  return { intent, slots: {}, lang };
}