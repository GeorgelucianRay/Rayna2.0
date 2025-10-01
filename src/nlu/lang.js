import { normalize } from "./normalize.js";

export function detectLanguage(raw) {
  const n = normalize(raw);
  const toks = new Set(n.split(" ").filter(Boolean));
  const ES = ["hola","buenas","buenos","dias","tardes","noches","quiero","como","llego","abrir","abre","camara","donde","hay","ver","navegar","itv","camion","remolque","parking"];
  const RO = ["salut","buna","bună","ziua","vreau","cum","ajung","deschide","camera","unde","este","lista","client","gps","itv","camion","remorca","remorcă","parcare"];
  const CA = ["hola","bon","bones","tardes","nits","vull","com","arribo","obre","camaras","càmera","on","esta","veure","navegar","itv","camio","camió","remolc","remolque","pàrquing"];
  const score = (arr) => arr.reduce((s, w) => s + (toks.has(normalize(w)) ? 1 : 0), 0);
  const es = score(ES), ro = score(RO), ca = score(CA);
  if (ro > es && ro >= ca) return "ro";
  if (ca > es && ca >= ro) return "ca";
  return "es";
}