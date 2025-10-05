// Curăță un nume de loc extras din text liber (ES/RO/EN uzual)
export function cleanPlaceName(raw = "") {
  let original = String(raw || "").trim();
  if (!original) return "";

  // versiune lowercase fără diacritice (pentru pattern-uri)
  const low = original
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  // formule frecvente de început (spaniolă; poți adăuga altele)
  const leaders = [
    /^quiero\s+llegar\s+a\s+/,
    /^quiero\s+ir\s+a\s+/,
    /^llegar\s+a\s+/,
    /^ir\s+a\s+/,
    /^voy\s+a\s+/,
    /^ruta\s+(?:hasta|a)\s+/,
    /^navegar\s+a\s+/,
    /^como\s+llego\s+a\s+/,
    /^cómo\s+llego\s+a\s+/,
    // variante română
    /^vreau\s+s[ăa]\s+ajung\s+la\s+/,
    /^vreau\s+s[ăa]\s+merg\s+la\s+/,
    /^navigheaz[ăa]\s+la\s+/,
    /^cum\s+ajung\s+la\s+/
  ];

  // dacă se potrivește un leader în `low`, tăiem aceeași lungime din original
  for (const rx of leaders) {
    const m = low.match(rx);
    if (m && m[0]) {
      original = original.slice(m[0].length);
      break;
    }
  }

  // curăță ghilimele/punctuație la margini
  original = original
    .replace(/^[«"“”'`]+|[»"“”'`]+$/g, "")
    .replace(/[.?!]$/g, "")
    .trim();

  // mică igienizare de articole rămase la început
  original = original.replace(/^(?:a|al|la|el)\s+/i, "").trim();

  return original;
}