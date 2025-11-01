// src/components/chat/nlu/lang.js

// Detectare limbă simplă (euristică) pentru fiecare mesaj.
// Rezultatul va fi unul dintre: 'es' | 'ro' | 'ca' (fallback: 'es').
export function detectLang(text) {
  const s = (text || "").toLowerCase();

  // diacritice / semne specifice
  const hasEs = /[ñáéíóúü]|[¿¡]/.test(s);
  const hasRo = /[ăâîșşţț]/.test(s);   // includem atât sedilă, cât și virguliță
  const hasCa = /[ïòàèéíóúç·]/.test(s);

  // cuvinte-cheie uzuale pe domeniul tău
  const esWords = /\b(aceite|camión|camion|remolque|próxim|proximo|itv|cuando|ruta|aprender|parking)\b/;
  const roWords = /\b(itp|ulei|remorc|camion|verific|când|cand|profil|parcare|parcari)\b/;
  const caWords = /\b(què|que|quant|camió|camio|remolc|pròxim|proper|itv|aprendre|aprenedre|aparcament)\b/;

  if (hasRo || roWords.test(s)) return "ro";
  if (hasCa || caWords.test(s)) return "ca";
  if (hasEs || esWords.test(s)) return "es";
  return "es";
}

// Alege replica corectă dintr-un obiect {es, ro, ca}.
// Dacă primește string simplu, îl returnează ca atare ca să nu stricăm handler-ele vechi.
export function pickTextByLang(textObjOrString, lang = "es") {
  if (typeof textObjOrString === "string") return textObjOrString;
  if (!textObjOrString || typeof textObjOrString !== "object") return "";
  return (
    textObjOrString[lang] ??
    textObjOrString.es ??
    textObjOrString.ro ??
    textObjOrString.ca ??
    ""
  );
}