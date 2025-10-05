// Curăță un nume de loc extras din text liber (spanish/ro/en)
export function cleanPlaceName(raw = "") {
  let t = String(raw || "").trim();

  // jos literele + fără diacritice (doar pt. pattern-uri)
  const low = t.toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, ""); // nu stricăm forma originală pt. afișat

  // Taie formule tipice de început: “quiero llegar a”, “llegar a”, “ir a”, “voy a”, “ruta a” etc.
  const leaders = [
    /^quiero\s+llegar\s+a\s+/i,
    /^quiero\s+ir\s+a\s+/i,
    /^llegar\s+a\s+/i,
    /^ir\s+a\s+/i,
    /^voy\s+a\s+/i,
    /^ruta\s+(?:hasta|a)\s+/i,
    /^navegar\s+a\s+/i,
    /^como\s+llego\s+a\s+/i,
    /^como\s+lllego\s+a\s+/i,   // typo tolerant
  ];
  for (const rx of leaders) {
    if (rx.test(low)) {
      // taie în funcție de poziția din șirul original (nu din low)
      const m = (t.match(rx) || [])[0];
      if (m) t = t.slice(m.length);
      break;
    }
  }

  // Taie ghilimele / punctuație pe margini
  t = t.replace(/^[«"“”'`]+|[»"“”'`]+$/g, "").replace(/[.?!]$/g, "").trim();

  // Dacă cumva a rămas un “llegar/ir/quiero” izolat, scapă de el
  t = t.replace(/^(?:llegar|ir|quiero|voy|a|al|la|el)\s+/i, "").trim();

  return t;
}