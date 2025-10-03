// src/nlu/slots.js
import { normalize } from "./normalize.js";
import { GREETINGS, COMMON_FILLERS } from "./cues.js";

function extractTailMeaningful(raw, extraStop = [], maxWords = 3) {
  const service = new Set([...extraStop, ...GREETINGS, ...COMMON_FILLERS].map(normalize));
  const toks = normalize(raw).split(" ").filter(Boolean);
  const clean = toks.filter(w => !service.has(w));
  if (!clean.length) return null;
  const tail = clean.slice(-maxWords);
  const joined = tail.join(" ").trim();
  return /^[a-z0-9._ -]{2,}$/i.test(joined) ? joined : null;
}

/* helper pt. „cerca de / lângă / near …” */
function cleanupLeadingStops(str) {
  if (!str) return null;
  const STOP = new Set(["de","la","el","al","del","en","a","un","una","the"]);
  const toks = normalize(str).split(" ").filter(Boolean).filter(w => !STOP.has(w));
  return toks.slice(0, 4).join(" ").trim() || null;
}

/* ——— RĂMÂNE exportată (folosită de detect.js) ——— */
export function captureCameraName(raw, stopwords = []) {
  const EXTRA = [
    ...(stopwords || []),
    "la","el","una","un","de","del","al","en",
    "camara","cámara","camera","camaras","cámaras","camere"
  ];
  return extractTailMeaningful(raw, EXTRA, 3);
}

/* ——— Versiunea nouă pentru locuri ——— */
export function capturePlaceName(raw, stopwords = []) {
  const n = normalize(raw);

  // 1) pattern-uri „aproape de X”
  const AFTER = [
    /(?:cerca|serca)\s+de\s+(.+)$/,
    /langa\s+(.+)$/,
    /lângă\s+(.+)$/,
    /aproape\s+de\s+(.+)$/,
    /near\s+(.+)$/,
    /next\s+to\s+(.+)$/,
    /junto\s+a\s+(.+)$/,
    /a\s*prop\s*de\s+(.+)$/,
    /proper\s+a\s+(.+)$/
  ];
  for (const rx of AFTER) {
    const m = n.match(rx);
    if (m && m[1]) return cleanupLeadingStops(m[1]); // ex: „Venso”
  }

  // 2) fallback: păstrează doar numele de la final, cu stoplist extins
  const EXTRA = [
    ...(stopwords || []),
    "buscame","búscame","buscar","encuentrame","encuéntrame",
    "quiero","necesito","sacame","sácame",
    "un","una","de","del","al","la","el","en","a",
    "parking","aparcamiento","aparcar","parcare","aparcament",
    "cerca","serca","aproape","langa","lângă","near","next","to","junto","prop","proper"
  ];
  return extractTailMeaningful(raw, EXTRA, 4);
}