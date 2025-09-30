import React from "react";
import SimpleList from "../ui/SimpleList";
import PlaceInfoCard from "../ui/PlaceInfoCard";
import { findPlacesByName, findPlaceByName, findCameraFor } from "../data/queries";
import { getMapsLinkFromRecord } from "../helpers/gps";

export default async function handleGpsInfo({ intent, slots, setMessages }) {
  const placeName = (slots.placeName || "").trim();
  if (!placeName) {
    setMessages((m) => [...m, { from: "bot", reply_text: "¿De qué sitio quieres información?" }]);
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
        reply_text: `He encontrado varios «${placeName}». Elige uno:`,
        render: () => (
          <SimpleList
            title="Resultados"
            items={options.map((d) => ({ ...d, _mapsUrl: getMapsLinkFromRecord(d) }))}
            onPick={async (p) => {
              const cam = await findCameraFor(p.nombre);
              const mapsUrl = getMapsLinkFromRecord(p);
              setMessages((mm) => [
                ...mm,
                {
                  from: "bot",
                  reply_text: `Esto es lo que tengo de **${p.nombre}**:`,
                  render: () => <PlaceInfoCard place={p} mapsUrl={mapsUrl} cameraUrl={cam?.url} />,
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
  const cam = await findCameraFor(place.nombre);
  setMessages((m) => [
    ...m,
    {
      from: "bot",
      reply_text: `Esto es lo que tengo de **${place.nombre}**:`,
      render: () => <PlaceInfoCard place={place} mapsUrl={mapsUrl} cameraUrl={cam?.url} />,
    },
  ]);
}