// src/intents/index.js
import saludos   from "./rayna.intents.saludos.json";
import gps       from "./rayna.intents.gps.json";
import camaras   from "./rayna.intents.camaras.json";
import anuncios  from "./rayna.intents.anuncios.json";

// ——— opțional: validare ușoară la runtime (în dev)
function validateIntents(intents) {
  const errors = [];
  const ids = new Set();

  intents.forEach((it, idx) => {
    if (!it || typeof it !== "object") {
      errors.push(`Item #${idx} nu e obiect.`);
      return;
    }
    if (!it.id || typeof it.id !== "string") {
      errors.push(`Item #${idx} fără "id" string.`);
    } else if (ids.has(it.id)) {
      errors.push(`ID duplicat: "${it.id}"`);
    } else {
      ids.add(it.id);
    }
    if (!it.type || !["static","action","dialog"].includes(it.type)) {
      errors.push(`"${it.id}": câmp "type" lipsă/suspect.`);
    }
    // pentru action/static: patterns_any ar trebui să fie array (dacă există)
    if ("patterns_any" in it && !Array.isArray(it.patterns_any)) {
      errors.push(`"${it.id}": "patterns_any" trebuie să fie array.`);
    }
    // pentru dialog: dialog.ask_text/save_ok/save_err pot fi string sau obiect localizat
    // (nu stricăm build-ul, doar semnalăm dacă lipsesc)
    if (it.type === "dialog" && !it.dialog) {
      errors.push(`"${it.id}": tip "dialog" dar lipsă câmp "dialog".`);
    }
  });

  if (errors.length) {
    // Nu aruncăm eroare ca să nu rupem producția; dar în dev e vizibil în consolă
    console.error("[INTENTS VALIDATION]", errors);
  }
}

const all = [
  ...saludos,
  ...gps,
  ...camaras,
  ...anuncios,
];

if (import.meta && import.meta.env && import.meta.env.DEV) {
  validateIntents(all);
}

export default all;