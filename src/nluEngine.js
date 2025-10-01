// Backward-compat: app-ul importă din "nluEngine", noi doar re-exportăm din noul modul.
export { normalize } from "./nlu/normalize.js";
export { detectIntent } from "./nlu/detect.js";
export { detectLanguage } from "./nlu/lang.js";