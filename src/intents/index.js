// src/intents/index.js
import saludos from "./rayna.intents.saludos.json";
import anuncios from "./rayna.intents.anuncios.json";
import camaras from "./rayna.intents.camaras.json";
import gps from "./rayna.intents.gps.json";
import common from "./rayna.intents.common.json";   // help + fallback
import me from "./rayna.intents.me.json";           // profil/șofer
// import smalltalk from "./rayna.intents.smalltalk.json"; // dacă îl creezi separat

// Ordinea din lista finală contează mai puțin, pentru că motorul sortează după `priority`,
// dar e util să pui întâi intențiile “puternice”.
const all = [
  ...me,
  ...gps,
  ...camaras,
  ...anuncios,
  ...saludos,
  // ...(smalltalk || []),
  ...common,            // fallback rămâne ultimul logic
];

export default all;