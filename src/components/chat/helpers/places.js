// Curăță articole/ghilimele etc.
export function cleanPlaceName(raw = "") {
  let s = String(raw || "").trim();
  if (!s) return "";
  s = s.replace(/^[«"“”'`]+|[»"“”'`]+$/g, "").replace(/[.?!]$/g, "").trim();
  // taie articolele/spaniola uzuale la început
  s = s.replace(/^(?:a|al|la|el|los|las)\s+/i, "").trim();
  return s;
}

/**
 * Extrage numele locului dintr-o frază lungă de tip:
 *  - "hola quiero llegar a saltoki pero no tengo disco búscame un parking cerca"
 *  - "quiero llegar a saltoki, búscame un parking cerca"
 *  - "llegar saltoki"
 *  - "quiero ir a TCB"
 *
 * Regula: capturăm ceea ce vine după (llegar|ir|navegar|voy|dirígeme...) [a] ...,
 * până la: virgulă/punct/„pero/y/que/buscame/búscame/parking/aparcar/aparcamiento/…”
 */
export function extractNavigateTargetFromText(userText = "") {
  if (!userText) return "";

  // lucrăm pe original (nu lowercase), dar regexul e case-insensitive
  const rx = new RegExp(
    String.raw`(?:^|\b)(?:quiero\s+)?(?:llegar|ir|navegar|dirigirme|dirigeme|voy)\s+(?:a\s+)?` +
    String.raw`(.+?)` + // ← capturăm non-greedy numele
    String.raw`(?=(?:,|\.|;|\)|\(|\bpero\b|\by\b|\bque\b|\bbuscame\b|\bbúscame\b|\bparking\b|\baparcar\b|\baparcamiento\b|\bestacionamiento\b|$))`,
    "i"
  );

  const m = userText.match(rx);
  if (m && m[1]) return cleanPlaceName(m[1]);

  // fallback: dacă NLU ți-a dat „llegar saltoki” fără „a”
  const rx2 = /(?:^|\b)(?:llegar|ir|navegar|voy)\s+([^\.,;]+)$/i;
  const m2 = userText.match(rx2);
  if (m2 && m2[1]) return cleanPlaceName(m2[1]);

  return "";
}