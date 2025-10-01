// src/components/chat/actions/handleParkingNear.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { findPlaceByName, listTable } from "../data/queries";
import { getMapsLinkFromRecord } from "../helpers/gps";
import { parseCoords, haversineKm, pointToSegmentKm } from "../helpers/geo";

// card UI
function ParkingCard({ p, distKm }) {
  const km = Number.isFinite(distKm) ? `· ${distKm.toFixed(1)} km` : "";
  const link = getMapsLinkFromRecord(p) || "#";
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{p.nombre}</div>
      <div className={styles.cardSubtitle}>
        {(p.direccion || "").trim()} {km}
      </div>
      <div className={styles.cardActions}>
        <a className={styles.actionBtn} data-variant="primary" href={link} target="_blank" rel="noopener noreferrer">
          Abrir en Google Maps
        </a>
      </div>
    </div>
  );
}

/**
 * 1) Caută cea mai apropiată parcare de DEST (sau de traseu între user->DEST dacă avem userPos)
 *    și memorează o listă de sugestii în parkingCtx (în RaynaHub).
 */
export async function handleParkingNearStart({
  slots, setMessages, setParkingCtx, userPos // userPos = {lat, lon} sau null
}) {
  const placeName = slots?.placeName || null;
  if (!placeName) {
    setMessages(m => [...m, { from: "bot", reply_text: "Necesito el nombre del sitio. Ej: \"Búscame un parking cerca de TCB\"." }]);
    return;
  }

  // 1) găsește destinația (TCB / Venso etc.)
  const dest = await findPlaceByName(placeName);
  if (!dest) {
    setMessages(m => [...m, { from: "bot", reply_text: `No he encontrado el sitio "${placeName}".` }]);
    return;
  }
  const destPos = parseCoords(dest.coordenadas);

  // 2) ia parcările din DB
  const { data: parksRaw } = await listTable("gps_parkings");
  const parks = (parksRaw || [])
    .map(p => ({ ...p, _pos: parseCoords(p.coordenadas) }))
    .filter(p => p._pos);

  if (!parks.length) {
    setMessages(m => [...m, { from: "bot", reply_text: "No tengo parkings en la base de datos." }]);
    return;
  }

  // 3) scoruri: dacă avem userPos => prioritizăm „por el camino” (aproape de segment user->dest)
  let scored = parks.map(p => {
    const dToDest = haversineKm(p._pos, destPos);
    let segDist = Number.POSITIVE_INFINITY;
    if (userPos && destPos) segDist = pointToSegmentKm(p._pos, userPos, destPos);
    return { p, dToDest, segDist };
  });

  // sortare: dacă avem userPos, mai întâi după proximitate la segment, apoi după distanță către dest
  if (userPos) {
    scored.sort((a, b) => (a.segDist - b.segDist) || (a.dToDest - b.dToDest));
  } else {
    scored.sort((a, b) => a.dToDest - b.dToDest);
  }

  // 4) pregătește sugestiile (primele 6)
  const suggestions = scored.slice(0, 6);

  if (!suggestions.length) {
    setMessages(m => [...m, { from: "bot", reply_text: "No he encontrado parkings adecuados." }]);
    return;
  }

  // 5) prima sugestie (răspuns inițial)
  const first = suggestions[0];
  setMessages(m => [
    ...m,
    { from: "bot", reply_text: "Claro, aquí puedes aparcar correctamente:" },
    {
      from: "bot",
      reply_text: "",
      render: () => <ParkingCard p={first.p} distKm={userPos ? haversineKm(first.p._pos, userPos) : first.dToDest} />
    }
  ]);

  // 6) salvează contextul în RaynaHub (ca să poți da „otro”)
  setParkingCtx({
    type: "parking",
    dest: { id: dest.id, nombre: dest.nombre, pos: destPos },
    userPos: userPos || null,
    suggestions,
    index: 0
  });
}

/**
 * 2) Dă următoarea sugestie („otro / algo más / no me queda disco…”)
 */
export async function handleParkingNext({
  parkingCtx, setMessages
}) {
  if (!parkingCtx || parkingCtx.type !== "parking" || !parkingCtx.suggestions?.length) {
    setMessages(m => [...m, { from: "bot", reply_text: "No tengo otra sugerencia ahora. Pide un parking de nuevo, por favor." }]);
    return;
  }
  const { suggestions, index, userPos } = parkingCtx;
  const nextIdx = index + 1;

  if (nextIdx >= suggestions.length) {
    setMessages(m => [...m, { from: "bot", reply_text: "No tengo más opciones cercanas. ¿Quieres que busque más lejos?" }]);
    return;
  }

  const next = suggestions[nextIdx];
  setMessages(m => [
    ...m,
    { from: "bot", reply_text: "Ah, perdona. Aquí hay otro parking:" },
    {
      from: "bot",
      reply_text: "",
      render: () => (
        <ParkingCard
          p={next.p}
          distKm={userPos ? haversineKm(next.p._pos, userPos) : next.dToDest}
        />
      )
    }
  ]);

  // avansează cursorul
  parkingCtx.index = nextIdx;
}