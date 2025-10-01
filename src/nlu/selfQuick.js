import { normalize } from "./normalize.js";

export function quickDetectSelf(message) {
  const n = normalize(message);
  const toks = new Set(n.split(" ").filter(Boolean));
  const has = (...words) => words.some(w => toks.has(normalize(w)));

  const truckCue   = has("camion","camión","camio","camió","tractor");
  const trailerCue = has("remorca","remorcă","remolque","remolc","semiremorca","semiremorcă","semiremolque");
  const itvCue     = has("itv","rar","r.a.r","revizie","revizia");

  if (itvCue && truckCue) {
    return {
      id: "driver_truck_itv__synthetic",
      priority: 999, type: "action", action: "driver_self_info",
      meta: { topic: "truck_itv" },
      response: {
        text: {
          es: "La ITV de tu camión caduca el {{truck.itv}}.",
          ro: "ITV-ul camionului tău expiră la {{truck.itv}}.",
          ca: "L’ITV del teu camió caduca el {{truck.itv}}."
        }
      }
    };
  }

  if (itvCue && trailerCue) {
    return {
      id: "driver_trailer_itv__synthetic",
      priority: 999, type: "action", action: "driver_self_info",
      meta: { topic: "trailer_itv" },
      response: {
        text: {
          es: "La ITV de tu remolque caduca el {{trailer.itv}}.",
          ro: "ITV-ul remorcii tale expiră la {{trailer.itv}}.",
          ca: "L’ITV del teu remolc caduca el {{trailer.itv}}."
        }
      }
    };
  }

  if (has("matricula","matriculacion","numar","număr","placa","plăcuță","placuta","placuta de inmatriculare","inscripcio","inscripció","matricula?","placas")) {
    return {
      id: "driver_plates__synthetic",
      priority: 998, type: "action", action: "driver_self_info",
      meta: { topic: "plates" },
      response: {
        text: {
          es: "Camión: {{truck.plate}} · Remolque: {{trailer.plate}}.",
          ro: "Camion: {{truck.plate}} · Remorcă: {{trailer.plate}}.",
          ca: "Camió: {{truck.plate}} · Remolc: {{trailer.plate}}."
        }
      }
    };
  }

  if (has("cap","carnet","permiso","permis","adr","atestate","acte","documente")) {
    return {
      id: "driver_credentials__synthetic",
      priority: 998, type: "action", action: "driver_self_info",
      meta: { topic: "driver_credentials" },
      response: {
        text: {
          es: "CAP: {{driver.cap}} · Carnet: {{driver.lic}} · ADR: {{driver.adr}}.",
          ro: "CAP: {{driver.cap}} · Carnet: {{driver.lic}} · ADR: {{driver.adr}}.",
          ca: "CAP: {{driver.cap}} · Carnet: {{driver.lic}} · ADR: {{driver.adr}}."
        }
      }
    };
  }

  const seeMyTruckCue =
    (has("mi") && (has("camion","camión","camio","camió"))) ||
    ((has("ver") || has("ficha") || has("mostrar")) && has("mi") && (has("camion","camión","camio","camió")));
  if (seeMyTruckCue) {
    return {
      id: "open_my_truck__synthetic",
      priority: 997, type: "action", action: "open_my_truck",
      response: {
        text: {
          es: "Claro, aquí tienes la ficha del camión.",
          ro: "Desigur, aici e fișa camionului.",
          ca: "És clar, aquí tens la fitxa del camió."
        }
      }
    };
  }

  const whoAmICue =
    (has("quien","quién","cine") && (has("soy","sunt") || has("yo","eu"))) ||
    n.includes("quien soy yo") || n.includes("quién soy yo") || n.includes("cine sunt eu");
  if (whoAmICue) {
    return {
      id: "who_am_i__synthetic",
      priority: 997, type: "action", action: "who_am_i",
      response: {
        text: {
          es: "Hola, esto es lo que sé de ti:",
          ro: "Salut, iată ce știu despre tine:",
          ca: "Hola, això és el que sé de tu:"
        }
      }
    };
  }

  return null;
}