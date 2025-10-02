// src/intents/index.js
import saludos   from "./rayna.intents.saludos.json";
import gps       from "./rayna.intents.gps.json";
import camaras   from "./rayna.intents.camaras.json";
import anuncios  from "./rayna.intents.anuncios.json";
import perfil    from "./rayna.intents.perfil.json";  // 👈 adăugat

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
    if ("patterns_any" in it && !Array.isArray(it.patterns_any)) {
      errors.push(`"${it.id}": "patterns_any" trebuie să fie array.`);
    }
    if (it.type === "dialog" && !it.dialog) {
      errors.push(`"${it.id}": tip "dialog" dar lipsă câmp "dialog".`);
    }
  });

  if (errors.length) {
    console.error("[INTENTS VALIDATION]", errors);
  }
}

const all = [
  ...saludos,
  ...gps,
  ...camaras,
  ...anuncios,
  ...perfil,   // 👈 adăugat
  ...vehiculo,
];

if (import.meta && import.meta.env && import.meta.env.DEV) {
  validateIntents(all);
}

export default all;