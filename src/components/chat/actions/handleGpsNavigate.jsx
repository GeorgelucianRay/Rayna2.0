import React from "react";
import styles from "../Chatbot.module.css";
import ChatMiniMap from "../ChatMiniMap";
import SimpleList from "../ui/SimpleList";
import { findPlacesByName, findPlaceByName } from "../data/queries";
import { getMapsLinkFromRecord, pointGeoJSONFromCoords } from "../helpers/gps";

export default async function handleGpsNavigate({ intent, slots, setMessages }) {
  const placeName = (slots.placeName || "").trim();
  if (!placeName) {
    setMessages((m) => [...m, { from: "bot", reply_text: "Dime el destino (por ejemplo: TCB)." }]);
    return;
  }

  const options = await findPlacesByName(placeName);
  if (!options.length) {
    setMessages((m) => [...m, { from: "bot", reply_text: `No he encontrado «${placeName}».` }]);
    return;
  }

  if (options.length > 1) {
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text: `He encontrado varios sitios para «${placeName}». Elige uno:`,
        render: () => (
          <SimpleList
            title="Resultados"
            items={options.map((d) => ({ ...d, _mapsUrl: getMapsLinkFromRecord(d) }))}
            onPick={(p) => {
              const mapsUrl = getMapsLinkFromRecord(p);
              const geojson = pointGeoJSONFromCoords(p.coordenadas);
              setMessages((mm) => [
                ...mm,
                {
                  from: "bot",
                  reply_text: `Claro, aquí tienes la ruta a **${p.nombre}**. Toca el mapa para abrir Google Maps.`,
                  render: () => (
                    <div className={styles.card}>
                      <div className={styles.cardTitle}>{p.nombre}</div>
                      <div style={{ marginTop: 8 }}>
                        <ChatMiniMap id={`chatmap-${p._table}-${p.id}`} geojson={geojson} mapsLink={mapsUrl} title={p.nombre} />
                      </div>
                      {mapsUrl && (
                        <div className={styles.cardActions} style={{ marginTop: 8 }}>
                          <button className={styles.actionBtn} onClick={() => window.open(mapsUrl, "_blank", "noopener")}>
                            Abrir en Google Maps
                          </button>
                        </div>
                      )}
                    </div>
                  ),
                },
              ]);
            }}
          />
        ),
      },
    ]);
    return;
  }

  const place = options[0] || (await findPlaceByName(placeName));
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
            <ChatMiniMap id={`chatmap-${place._table}-${place.id}`} geojson={geojson} mapsLink={mapsUrl} title={place.nombre} />
          </div>
          {mapsUrl && (
            <div className={styles.cardActions} style={{ marginTop: 8 }}>
              <button className={styles.actionBtn} onClick={() => window.open(mapsUrl, "_blank", "noopener")}>
                Abrir en Google Maps
              </button>
            </div>
          )}
        </div>
      ),
    },
  ]);
}