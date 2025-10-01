import { includesAny, hasToken } from "./fuzzy.js";
import { detectLanguage } from "./lang.js";
import { localizeIntent } from "./localize.js";
import { hasActionCue, CAMERA_NOUNS, CAMERA_VERBS } from "./cues.js";
import { captureCameraName, capturePlaceName } from "./slots.js";
import { normalize } from "./normalize.js";
import { quickDetectSelf } from "./selfQuick.js";

export function detectIntent(message, intentsJson) {
  const text = String(message ?? "");
  const list = Array.isArray(intentsJson) ? intentsJson : [];
  const lang = detectLanguage(text);

  // 0) scurtcircuit pentru întrebări despre „mine”
  const synthetic = quickDetectSelf(text);
  if (synthetic) {
    const intent = localizeIntent(synthetic, lang);
    return { intent, slots: {}, lang };
  }

  // 1) sortare după prioritate
  const intents = [...list].sort((a, b) => (b?.priority || 0) - (a?.priority || 0));

  for (const rawIntent of intents) {
    if (!rawIntent) continue;
    if (rawIntent.id === "fallback") continue;

    // 2) potrivire pe patterns (fuzzy fraze + token)
    let ok = includesAny(text, rawIntent.patterns_any) || hasToken(text, rawIntent.patterns_any);

    // 2.1) negative_any — inhibă
    if (ok && rawIntent.negative_any) {
      const negHit = includesAny(text, rawIntent.negative_any) || hasToken(text, rawIntent.negative_any);
      if (negHit) ok = false;
    }

    // 2.2) Nu trata salut dacă e clară o acțiune sau mesajul e lung
    if (ok && (rawIntent.id === "saludo" || rawIntent.id?.startsWith?.("saludo_"))) {
      const tokens = normalize(text).split(" ").filter(Boolean);
      if (hasActionCue(text) || tokens.length > 5) ok = false;
    }

    // 3) Heuristica tolerantă „ver_camara”
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

    // 5) localizare răspuns
    const intent = localizeIntent(rawIntent, lang);
    return { intent, slots, lang };
  }

  // 6) fallback (din lista primită sau default)
  const fbRaw = intents.find(i => i?.id === "fallback") || {
    id: "fallback", type: "static",
    response: { text: { es: "No te he entendido.", ro: "Nu te-am înțeles.", ca: "No t'he entès." } }
  };
  const intent = localizeIntent(fbRaw, lang);
  return { intent, slots: {}, lang };
}