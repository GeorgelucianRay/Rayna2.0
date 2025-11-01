// src/components/chat/nlu/lang.js

/**
 * Detectează limba aproximativă a unui text între:
 *  - 'es' (spaniolă)
 *  - 'ro' (română)
 *  - 'ca' (catalană)
 *
 * Heuristici:
 *  1) diacritice / grafeme specifice
 *  2) cuvinte foarte frecvente per limbă (stopwords scurte)
 *  3) tie-breaker → 'es'
 */

const DIACR = {
  ro: /[ăâîșţțșĂÂÎȘŢȚ]/i,     // română: ă â î ș ț (inclusiv variante cu sedilă)
  ca: /[àèéíïòóúç·]/i,        // catalană: ç, ·, diacritice frecvente
  es: /[áéíóúñü]/i            // spaniolă: ñ, ü, vocale accentuate
};

const WORDS = {
  es: [
    "el","la","de","que","y","en","un","una","para","con","cuando","cuándo",
    "próximo","proximo","itv","camión","camion","aceite","estado","kilometros","kilómetros"
  ],
  ro: [
    "și","si","în","in","pe","la","este","nu","când","cand","următor","urmator",
    "itp","camion","ulei","stare","kilometri","km"
  ],
  ca: [
    "el","la","de","que","i","en","un","una","per","amb","quan","pròxim","proper",
    "itv","camió","oli","estat","quilòmetres","quilometres","km"
  ],
};

function scoreWords(text, list) {
  const tokens = String(text).toLowerCase().split(/[^a-zà-ÿ·çñü]+/i).filter(Boolean);
  let s = 0;
  for (const t of tokens) if (list.includes(t)) s++;
  return s;
}

export function detectLanguage(text) {
  const s = String(text || "");

  // 1) diacritice specifice (cel mai puternic semnal)
  const hasRO = DIACR.ro.test(s);
  const hasCA = DIACR.ca.test(s);
  const hasES = DIACR.es.test(s);

  if (hasRO && !hasCA && !hasES) return "ro";
  if (hasCA && !hasRO && !hasES) return "ca";
  if (hasES && !hasRO && !hasCA) return "es";

  // 2) scor pe cuvinte frecvente
  const scES = scoreWords(s, WORDS.es);
  const scRO = scoreWords(s, WORDS.ro);
  const scCA = scoreWords(s, WORDS.ca);

  const max = Math.max(scES, scRO, scCA);
  if (max === 0) return "es"; // fallback

  if (max === scRO && scRO > scES && scRO > scCA) return "ro";
  if (max === scCA && scCA > scES && scCA > scRO) return "ca";
  if (max === scES && scES > scRO && scES > scCA) return "es";

  // 3) tie-breaker
  if (scRO === scCA && scRO > scES) return "ro"; // bias ușor spre ro
  return "es";
}