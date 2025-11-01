// Detectarea limbii pentru ES / RO / CA — zero dependențe, foarte rapid.
// Heuristică bazată pe cuvinte-cheie frecvente + fallback pe spaniolă.

const SIGNS = {
  es: [
    "hola","buenas","cuando","cuándo","camión","camion","remolque","aceite","próximo","proximo","itv","filtro","adblue",
    "quiero","llegar","buscar","cerca","tengo","disco","ruta","aparcar","parking"
  ],
  ro: [
    "bună","buna","salut","când","cand","camion","remorcă","remorca","ulei","următor","urmator","itp","filtru","adblue",
    "vreau","ajunge","caută","cauta","aproape","am","discul","parcare","rutie","traseu"
  ],
  ca: [
    "hola","bones","quan","camió","camio","remolc","oli","proper","itv","filtre","adblue",
    "vull","arribar","cerca","tinc","disc","ruta","aparcament","aparcament"
  ],
};

export function detectLang(text) {
  const t = String(text || "").toLowerCase();

  // scurt-circuit: diacritice tipice
  if (/[ăâîșşţț]/.test(t)) return "ro";
  if (/[óñ¿¡]/.test(t)) return "es";
  if (/ç|à|è|é|í|ï|ò|ó|ú|ü/.test(t)) {
    // poate fi es sau ca → mergem la scoruri
  }

  const score = { es: 0, ro: 0, ca: 0 };
  for (const lang of Object.keys(SIGNS)) {
    for (const w of SIGNS[lang]) {
      if (t.includes(w)) score[lang] += 1;
    }
  }

  // alegem maximul; dacă egalitate, preferăm spaniola (default aplicației)
  const best = Object.entries(score).sort((a,b)=>b[1]-a[1])[0];
  if (!best || best[1] === 0) return "es";
  return best[0];
}

export function pickTextByLang(obj, lang) {
  // obj poate fi fie un string, fie un { es, ro, ca }
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  const map = obj;
  return map[lang] || map.es || map.ro || map.ca || "";
}