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

export function captureCameraName(raw, stopwords = []) {
  const EXTRA = [
    ...(stopwords || []),
    "la","el","una","un","de","del","al","en",
    "camara","cámara","camera","camaras","cámaras","camere"
  ];
  return extractTailMeaningful(raw, EXTRA, 3);
}

export function capturePlaceName(raw, stopwords = []) {
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