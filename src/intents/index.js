import saludos from "./rayna.intents.saludos.json";
import smalltalk from "./rayna.intents.smalltalk.json";
import anuncios from "./rayna.intents.anuncios.json";
import gps from "./rayna.intents.gps.json";
import camaras from "./rayna.intents.camaras.json";

const intents = [
  ...saludos,
  ...smalltalk,
  ...anuncios,
  ...gps,
  ...camaras
];

export default intents;