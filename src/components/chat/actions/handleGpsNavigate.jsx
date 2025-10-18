// src/components/chat/actions/handleGpsNavigate.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import ChatMiniMap from "../ChatMiniMap";
import SimpleList from "../ui/SimpleList";
import { findPlacesByName, findPlaceByName } from "../data/queries";
import { getMapsLinkFromRecord, pointGeoJSONFromCoords } from "../helpers/gps";

/** ==========
 *  Normalizare + extragere nume loc din propoziție liberă.
 *  Evităm regex-uri cu /x sau pe mai multe linii (JS nu suportă /x).
 *  Exemple:
 *   "hola quiero llegar a tcb"                -> "tcb"
 *   "quiero llegar a saltoki"                 -> "saltoki"
 *   "como llego a terminal venso"             -> "terminal venso"
 *   "necesito la ruta hasta tcb 2"            -> "tcb 2"
 *   "voy a tcb"                               -> "tcb"
 *   "quiero llegar a saltoki pero no tengo disco" -> "saltoki pero no tengo disco" (dar mai jos tăiem coada zgomotoasă)
 *  ========== */
function normalizeSimple(s = "") {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // păstrează cu /u implicit în .replace
    .replace(/\s+/g, " ")
    .trim();
}

function extractPlaceFromText(userText = "", slotValue = "") {
  let t = normalizeSimple(slotValue || userText);

  // 1) scoate saluturi la început
  t = t.replace(/^(?:hola|buenas|buenos dias|buenas tardes|buenas noches)[,!\s]+/i, "").trim();

  // 2) taie expresiile de declanșare la început (fără /x, fără multi-line)
  //    aplicăm mai multe pattern-uri simple, în lanț:
  const LEADERS = [
    /^(?:quiero|necesito|puedo|podrias|podrías|como|cómo|dime|ensename|enséñame|muestrame|muéstrame|dirigeme|dirígeme|llevame|llévame)\s+/i,
    /^(?:voy|ir|vamos|vamos a)\s+/i,
    /^(?:ver\s+ruta|mostrar\s+ruta|abrir(?:\s+google)?\s+maps|ruta|camino)\s+/i,
    /^(?:a|al|la|el|de|del|en)\s+/i,
  ];
  for (const rx of LEADERS) t = t.replace(rx, "").trim();

  // 3) taie verbele + prepoziția „a/hacia/hasta” de la început
  const VERB_PREP = [
    /^(?:llegar|ir|navegar)\s+(?:a|hacia|hasta)\s+/i,
    /^(?:ver\s+ruta|mostrar\s+ruta)\s+(?:a|hacia|hasta)\s+/i,
  ];
  for (const rx of VERB_PREP) t = t.replace(rx, "").trim();

  // 4) dacă încă începe cu prepoziții, mai taie o dată
  t = t.replace(/^(?:a|al|la|el|de|del|en|hacia|hasta)\s+/i, "").trim();

  // 5) dacă există „pero …” sau „que …” după numele locului (zgomot conversațional), taie coada
  //    ex: "quiero llegar a tcb pero no tengo disco" -> "tcb"
  t = t.replace(/\s+(?:pero|que|por\s+fa|porfa|pf|please)\b.*$/i, "").trim();

  // 6) scoate ghilimele și punctuație de la margini
  t = t.replace(/^[«"“”'`]+|[»"“”'`]+$/g, "").replace(/[.?!]+$/g, "").trim();

  // 7) dacă a rămas prea lung, păstrează ultimele 4 cuvinte (nume compuse)
  const parts = t.split(" ").filter(Boolean);
  if (parts.length > 4) t = parts.slice(-4).join(" ");

  return t;
}

// ——— UI helpers ———
function showOnePlace(place, setMessages) {
  const mapsUrl = getMapsLinkFromRecord(place);
  const geojson = pointGeoJSONFromCoords(place.coordenadas);
  setMessages((m) => [
    ...m,
    {
      from: "bot",
      reply_text: `Claro, aquí tienes la ruta a **${place.nombre}**. Toca el mapa para abrir Google Maps.`,
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>{place.nombre}</div>
          <div style={{ marginTop: 8 }}>
            <ChatMiniMap
              id={`chatmap-${place._table || "place"}-${place.id}`}
              geojson={geojson}
              mapsLink={mapsUrl}
              title={place.nombre}
            />
          </div>
          {mapsUrl && (
            <div className={styles.cardActions} style={{ marginTop: 8 }}>
              <button
                className={styles.actionBtn}
                onClick={() => window.open(mapsUrl, "_blank", "noopener")}
              >
                Abrir en Google Maps
              </button>
            </div>
          )}
        </div>
      ),
    },
  ]);
}

function showOptions(options, typedName, setMessages) {
  if (options.length > 1) {
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text: `He encontrado varios sitios para «${typedName}». Elige uno:`,
        render: () => (
          <SimpleList
            title="Resultados"
            items={options.map((d) => ({ ...d, _mapsUrl: getMapsLinkFromRecord(d) }))}
            onPick={(p) => showOnePlace(p, setMessages)}
          />
        ),
      },
    ]);
    return;
  }
  return showOnePlace(options[0], setMessages);
}

export default async function handleGpsNavigate({ intent, slots, setMessages, userText = "" }) {
  // 1) extragem + curățăm numele locului
  const raw = (slots?.placeName || "").trim();
  const placeName = extractPlaceFromText(userText, raw);

  if (!placeName) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "Dime el destino (por ejemplo: TCB)." },
    ]);
    return;
  }

  // 2) căutăm locurile
  const options = await findPlacesByName(placeName);
  if (!options?.length) {
    // fallback: încearcă ultimul cuvânt (ex: "tcb 2" -> "2")
    const lastWord = placeName.split(" ").pop();
    if (lastWord && lastWord !== placeName) {
      const fallback = await findPlacesByName(lastWord);
      if (fallback?.length) return showOptions(fallback, placeName, setMessages);
    }
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: `No he encontrado «${placeName}».` },
    ]);
    return;
  }

  // 3) listă sau direct un loc
  return showOptions(options, placeName, setMessages);
}
