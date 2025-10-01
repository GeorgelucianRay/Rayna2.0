import { includesAny } from "./fuzzy.js";

export const CAMERA_VERBS = ["abre","abrir","ver","muestra","mostrar","desplegar","deschide","obre"];
export const CAMERA_NOUNS = ["camara","cámara","camera","camere","càmera"];
export const GPS_CUES = [
  "quiero llegar a","llevar a","ir a","navegar a","como llego a","cómo llego a",
  "vreau sa ajung la","vreau să ajung la","vreau sa merg la","vreau să merg la","navigheaza la","navighează la","cum ajung la",
  "vull arribar a","portar a","anar a","com arribo a"
];

export const GREETINGS = [
  "hola","buenas","buenos","dias","días","tardes","noches",
  "salut","buna","bună","ziua","seara","buna ziua","bună ziua","buna seara","bună seara",
  "bon","bon dia","bones","tardes","nits","bona","bona tarda","bona nit"
];
export const COMMON_FILLERS = ["por","favor","pf","pls","ok","vale","te","rog","mersi","merci"];

export function hasActionCue(text) {
  return includesAny(text, CAMERA_VERBS) || includesAny(text, CAMERA_NOUNS) || includesAny(text, GPS_CUES);
}