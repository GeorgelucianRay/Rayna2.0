// src/components/chat/nlu/lang.js

// Normalizează coduri de limbă diverse la {es, ro, ca}
export function normalizeLang(code) {
  const c = String(code || "").toLowerCase();
  if (c.startsWith("es")) return "es";
  if (c.startsWith("ro")) return "ro";
  if (c.startsWith("ca")) return "ca";
  // acceptăm și valori custom care deja sunt corecte
  if (c === "es" || c === "ro" || c === "ca") return c;
  // fallback
  return "es";
}

// Heuristică simplă de detectare limbă (fără dependențe externe)
export function detectLanguage(text) {
  const t = String(text || "").toLowerCase();

  // semne/diacritice foarte distinctive
  const hasRO = /[ăâîșşţț]/i.test(t);
  const hasES = /[ñ¡¿]/i.test(t);
  const hasCA = /[ç·]/i.test(t) || /l·l/.test(t);

  if (hasRO && !hasES && !hasCA) return "ro";
  if (hasES && !hasRO && !hasCA) return "es";
  if (hasCA && !hasRO && !hasES) return "ca";

  // cuvinte frecvente – liste scurte, sigure
  const roWords = /\b(când|cand|ulei|remorc|camion|itp|salut|mulțum|multum)\b/;
  const esWords = /\b(cuándo|cuando|aceite|remolque|camión|camion|itv|hola|gracias|próxima|proxima)\b/;
  const caWords = /\b(quan|oli|remolc|camió|camio|itv|hola|gràcies|gracies|pròxim|proxim)\b/;

  const roScore = roWords.test(t) ? 1 : 0;
  const esScore = esWords.test(t) ? 1 : 0;
  const caScore = caWords.test(t) ? 1 : 0;

  if (roScore > esScore && roScore > caScore) return "ro";
  if (esScore > roScore && esScore > caScore) return "es";
  if (caScore > roScore && caScore > esScore) return "ca";

  // dacă sunt la egalitate sau nu găsim nimic clar → spaniolă
  return "es";
}