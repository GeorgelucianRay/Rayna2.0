// src/components/chat/actions/handleParkingNear.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { findPlaceByName, listTable } from "../data/queries";
import { getMapsLinkFromRecord } from "../helpers/gps";
import { parseCoords, haversineKm, pointToSegmentKm } from "../helpers/geo";

// ——— mic utilitar: curăță slotul de „cerca de / aproape de” & articole ———
function cleanupPlace(raw) {
  return (raw || "")
    // ES
    .replace(/^(?:un|una)?\s*parking\s+cerca\s+de\s+/i, "")
    .replace(/^(?:cerca\s+de|al\s+lado\s+de)\s+/i, "")
    // RO
    .replace(/^(?:o|un)?\s*parcare\s+(?:aproape\s+de|lângă)\s+/i, "")
    // articole comune
    .replace(/^\s*(?:de|la|el|del|al|a|în|din)\s+/i, "")
    .trim();
}

// ——— UI: card pentru parking ———
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

/** 1) Caută parcarea potrivită lângă DEST (sau pe traseu user→DEST). */
export async function handleParkingNearStart({
  slots, setMessages, setParkingCtx, userPos
}) {
  const raw = slots?.placeName || "";
  const placeName = cleanupPlace(raw);

  if (!placeName) {
    setMessages(m => [...m, { from:"bot", reply_text:'Necesito el nombre del sitio. Ej.: "Búscame un parking cerca de TCB".' }]);
    return;
  }

  // 1) găsește destinația în tabelele tale
  const dest = await findPlaceByName(placeName);
  if (!dest) {
    setMessages(m => [...m, { from:"bot", reply_text:`No he encontrado el sitio «${placeName}».` }]);
    return;
  }
  const destPos = parseCoords(dest.coordenadas);
  if (!destPos) {
    setMessages(m => [...m, { from:"bot", reply_text:`El sitio «${dest.nombre}» no tiene coordenadas válidas.` }]);
    return;
  }

  // 2) ia parcările (cu coordenadas)
  const { data: parksRaw, error } = await listTable("gps_parkings");
  if (error) console.warn("[gps_parkings] error:", error);
  const parks = (parksRaw || [])
    .map(p => ({ ...p, _pos: parseCoords(p.coordenadas) }))
    .filter(p => p._pos);

  if (!parks.length) {
    setMessages(m => [...m, { from:"bot", reply_text:"No tengo parkings en la base de datos." }]);
    return;
  }

  // 3) scoruri: apropiere de traseu (dacă avem userPos) + distanță la dest
  const scored = parks.map(p => {
    const dToDest = haversineKm(p._pos, destPos);
    const segDist = (userPos && destPos) ? pointToSegmentKm(p._pos, userPos, destPos) : Infinity;
    return { p, dToDest, segDist };
  });

  // 4) sortare: cu userPos -> întâi lângă traseu, apoi lângă dest; altfel doar lângă dest
  if (userPos) scored.sort((a,b) => (a.segDist - b.segDist) || (a.dToDest - b.dToDest));
  else scored.sort((a,b) => a.dToDest - b.dToDest);

  const suggestions = scored.slice(0, 6);
  const first = suggestions[0];

  setMessages(m => [
    ...m,
    { from:"bot", reply_text:`He encontrado opciones cerca de **${dest.nombre}**. Te propongo esta:` },
    {
      from:"bot",
      reply_text:"",
      render: () => (
        <ParkingCard
          p={first.p}
          distKm={userPos ? haversineKm(first.p._pos, userPos) : first.dToDest}
        />
      )
    }
  ]);

  // 5) cursor pentru „otro parking”
  setParkingCtx({
    type: "parking",
    dest: { id: dest.id, nombre: dest.nombre, pos: destPos },
    userPos: userPos || null,
    suggestions,
    index: 0
  });
}

/** 2) Următoarea sugestie („otro parking”) */
export async function handleParkingNext({ parkingCtx, setMessages }) {
  if (!parkingCtx || parkingCtx.type !== "parking" || !parkingCtx.suggestions?.length) {
    setMessages(m => [...m, { from:"bot", reply_text:"No tengo otra sugerencia ahora. Pide un parking de nuevo, por favor." }]);
    return;
  }

  const { suggestions, index, userPos } = parkingCtx;
  const nextIdx = index + 1;
  if (nextIdx >= suggestions.length) {
    setMessages(m => [...m, { from:"bot", reply_text:"No tengo más opciones cercanas. ¿Quieres que busque más lejos?" }]);
    return;
  }

  const next = suggestions[nextIdx];
  setMessages(m => [
    ...m,
    { from:"bot", reply_text:"Aquí tienes otra alternativa:" },
    {
      from:"bot",
      reply_text:"",
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