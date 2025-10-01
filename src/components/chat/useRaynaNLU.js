// src/components/chat/useRaynaNLU.js
import { detectIntent } from "../../nlu/nluEngine";
import { quickDetectSelf } from "../../nlu/selfQuick";

// toate intențiile combinate
import gpsIntents from "../../intents/rayna.intents.gps.json";
import saludosIntents from "../../intents/rayna.intents.saludos.json";
import camarasIntents from "../../intents/rayna.intents.camaras.json";
import anunciosIntents from "../../intents/rayna.intents.anuncios.json";
import parkingIntents from "../../intents/rayna.intents.parking.json";
import profileIntents from "../../intents/rayna.intents.profile.json";

const ALL_INTENTS = [
  ...gpsIntents,
  ...saludosIntents,
  ...camarasIntents,
  ...anunciosIntents,
  ...parkingIntents,
  ...profileIntents,
];

export function useRaynaNLU(message) {
  // 1) verifică quick detect
  const synthetic = quickDetectSelf(message);
  if (synthetic) return synthetic;

  // 2) rulează detectIntent pe toate intențiile
  return detectIntent(message, ALL_INTENTS);
}