// src/components/chat/actions/handleParkingNear.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { findPlaceByName, listTable } from "../data/queries";
import { getMapsLinkFromRecord } from "../helpers/gps";
import { parseCoords, haversineKm, pointToSegmentKm } from "../helpers/geo";

/* ============================================================
   Parametri / constante
   ============================================================ */
const TRUCK_MAX_KMH = 90;       // limitare fizică
const TRUCK_AVG_KMH = 70;       // medie realistă pe drum
const DRUM_FACTOR = 1.4;        // cât e mai lung drumul real față de linie dreaptă

// Conversie: minute disponibile → distanță maximă în linie dreaptă
export function estimateReachableKm(minutes) {
  if (!minutes) return 0;
  const realKm = (minutes / 60) * TRUCK_AVG_KMH;
  return realKm / DRUM_FACTOR;
}

/* ============================================================
   Parsare timp „disco” -> minute
   ============================================================ */
export function parseTimeToMinutes(raw) {
  if (!raw) return 0;
  const s = String(raw).toLowerCase().trim().replace(",", ".");

  const m1 = s.match(/^\s*(\d{1,2})\s*:\s*(\d{1,2})\s*$/);
  if (m1) return (+m1[1]) * 60 + (+m1[2]);

  const h = s.match(/(\d+(?:\.\d+)?)\s*h/);
  const m = s.match(/(\d+)\s*m/);
  if (h || m) return Math.round((h ? parseFloat(h[1]) * 60 : 0) + (m ? +m[1] : 0));

  const onlyMin = s.match(/^\s*(\d{1,4})\s*(?:min|mins|minute|m)?\s*$/);
  if (onlyMin) return +onlyMin[1];

  return 0;
}

/* ============================================================
   UI: Card pentru un parking
   ============================================================ */
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
        <a
          className={styles.actionBtn}
          data-variant="primary"
          href={link}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir en Google Maps
        </a>
      </div>
    </div>
  );
}

/* ============================================================
   Extract place name from text
   ============================================================ */
function normalizeSimple(s = "") {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPlaceNameFromText(text = "") {
  let t = normalizeSimple(text);

  const AFTER_PATTERNS = [
    /cerca de\s+(.+)/i,
    /serca de\s+(.+)/i,
    /aproape de\s+(.+)/i,
    /langa\s+(.+)/i,
    /lângă\s+(.+)/i,
    /near\s+(.+)/i,
    /next to\s+(.+)/i,
    /junto a\s+(.+)/i,
    /a prop de\s+(.+)/i,
    /proper a\s+(.+)/i,
  ];
  for (const rx of AFTER_PATTERNS) {
    const m = t.match(rx);
    if (m && m[1]) {
      t = m[1].trim();
      break;
    }
  }

  const LEADERS = [
    /^buscame(?:\s+un)?\s+parking(?:\s+(?:cerca|serca))?\s+(?:de\s+)?/,
    /^búscame(?:\s+un)?\s+parking(?:\s+(?:cerca|serca))?\s+(?:de\s+)?/,
    /^encuentrame\s+un\s+parking\s+(?:cerca\s+de\s+)?/,
    /^quiero\s+aparcar\s+(?:cerca\s+de\s+)?/,
    /^aparcar\s+(?:cerca\s+de\s+)?/,
    /^aparcamiento\s+(?:cerca\s+de\s+)?/,
    /^parking\s+(?:cerca\s+de\s+)?/,
    /^parcare\s+(?:aproape\s+de\s+|langa\s+|lângă\s+)?/,
    /^find\s+parking\s+(?:near\s+|next to\s+)?/,
    /^parking\s+(?:near\s+|next to\s+)?/,
  ];
  for (const rx of LEADERS) t = t.replace(rx, "").trim();

  t = t.replace(/^[«"“”'`]+|[»"“”'`]+$/g, "").replace(/[.?!]$/g, "").trim();

  if (t.length <= 1) return null;
  const parts = t.split(" ").filter(Boolean);
  if (parts.length > 4) t = parts.slice(-4).join(" ");
  return t;
}

/* ============================================================
   1) Start: caută parcări
   ============================================================ */
export async function handleParkingNearStart({
  slots,
  userText,
  setMessages,
  setParkingCtx,
  userPos,
}) {
  let placeName = (slots?.placeName || "").trim();
  if (!placeName) {
    placeName = extractPlaceNameFromText(userText || "");
    console.debug("[parkingNear] fallback extracted place:", placeName, " from:", userText);
  }

  if (!placeName) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: 'Necesito el nombre del sitio. Ej.: «Búscame un parking cerca de TCB».' },
    ]);
    return;
  }

  const dest = await findPlaceByName(placeName);
  if (!dest) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: `No he encontrado el sitio «${placeName}». Intenta con el nombre tal y como aparece en GPS.` },
    ]);
    return;
  }
  const destPos = parseCoords(dest.coordenadas);

  const { data: parksRaw } = await listTable("gps_parkings");
  const parks = (parksRaw || [])
    .map((p) => ({ ...p, _pos: parseCoords(p.coordenadas) }))
    .filter((p) => p._pos);

  if (!parks.length) {
    setMessages((m) => [...m, { from: "bot", reply_text: "No tengo parkings en la base de datos." }]);
    return;
  }

  let scored = parks.map((p) => {
    const dToDest = haversineKm(p._pos, destPos);
    const segDist = userPos && destPos ? pointToSegmentKm(p._pos, userPos, destPos) : Number.POSITIVE_INFINITY;
    return { p, dToDest, segDist };
  });

  if (userPos) {
    scored.sort((a, b) => {
      const byDest = a.dToDest - b.dToDest;
      if (Math.abs(byDest) > 0.05) return byDest;
      return a.segDist - b.segDist;
    });
  } else {
    scored.sort((a, b) => a.dToDest - b.dToDest);
  }

  const suggestions = scored.slice(0, 6);
  if (!suggestions.length) {
    setMessages((m) => [...m, { from: "bot", reply_text: "No he encontrado parkings adecuados." }]);
    return;
  }

  const first = suggestions[0];
  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: "Claro, aquí puedes aparcar correctamente:" },
    { from: "bot", reply_text: "", render: () => <ParkingCard p={first.p} distKm={first.dToDest} /> },
  ]);

  const userToDestKm = userPos ? haversineKm(userPos, destPos) : null;
  setParkingCtx({
    type: "parking",
    dest: { id: dest.id, nombre: dest.nombre, pos: destPos },
    userPos: userPos || null,
    userToDestKm,
    suggestions,
    index: 0,
  });

  // 🔥 verificăm dacă utilizatorul a spus "no llego"
  if (/no llego/i.test(userText)) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "¿Cuánto disco te queda? (ej.: 1:25 o 45 min)" }
    ]);
  }
}

/* ============================================================
   1.5) Recalcul după timp
   ============================================================ */
export async function handleParkingRecomputeByTime({
  parkingCtx,
  minutes,
  setMessages,
  setParkingCtx,
}) {
  try {
    if (!parkingCtx?.dest?.pos) {
      setMessages((m) => [...m, { from: "bot", reply_text: "No tengo el destino. Pide un parking de nuevo, por favor." }]);
      return;
    }
    if (!parkingCtx?.userPos) {
      setMessages((m) => [...m, { from: "bot", reply_text: "No tengo tu ubicación. Activa ubicación y vuelve a pedirme otro parking." }]);
      return;
    }

    const { dest, userPos } = parkingCtx;
    const destPos = dest.pos;
    const reachKm = estimateReachableKm(minutes);

    const { data: parksRaw } = await listTable("gps_parkings");
    const parks = (parksRaw || [])
      .map((p) => ({ ...p, _pos: parseCoords(p.coordenadas) }))
      .filter((p) => p._pos);

    let scored = parks.map((p) => {
      const dToDest = haversineKm(p._pos, destPos);
      const dFromUser = haversineKm(p._pos, userPos);
      const segDist = pointToSegmentKm(p._pos, userPos, destPos);
      return { p, dToDest, dFromUser, segDist };
    });

    const userToDestNow = haversineKm(userPos, destPos);
    let reachable = scored.filter(
      (x) => x.dFromUser <= reachKm && x.dToDest < userToDestNow + 0.3
    );

    let relaxed = false;
    if (!reachable.length) {
      reachable = scored.filter(
        (x) => x.dFromUser <= reachKm * 1.2 && x.dToDest < userToDestNow + 0.3
      );
      relaxed = reachable.length > 0;
    }

    if (!reachable.length) {
      setMessages((m) => [...m, {
        from: "bot",
        reply_text: `Con ${minutes} min (~${reachKm.toFixed(0)} km en línea recta) no alcanzo ningún parking por delante. ¿Te muestro el más cercano igualmente?`,
      }]);
      return;
    }

    reachable.sort(
      (a, b) => a.dToDest - b.dToDest || a.segDist - b.segDist || a.dFromUser - b.dFromUser
    );

    const suggestions = reachable.slice(0, 6);
    const first = suggestions[0];

    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text: relaxed
          ? `He relajado un poco el radio (x1.2). Con ${minutes} min, te propongo esto:`
          : `Con ${minutes} min (~${reachKm.toFixed(0)} km) te propongo este parking:`,
      },
      { from: "bot", reply_text: "", render: () => <ParkingCard p={first.p} distKm={first.dToDest} /> },
    ]);

    setParkingCtx({
      ...parkingCtx,
      suggestions,
      index: 0,
      remainingMinutes: minutes,
      mode: "time_filter",
    });
  } catch (e) {
    console.error("[handleParkingRecomputeByTime]", e);
    setMessages((m) => [...m, { from: "bot", reply_text: "Ha fallado el recálculo. Intenta otra vez." }]);
  }
}

/* ============================================================
   2) Next
   ============================================================ */
export async function handleParkingNext({ parkingCtx, setMessages }) {
  if (!parkingCtx || parkingCtx.type !== "parking" || !parkingCtx.suggestions?.length) {
    setMessages((m) => [...m, { from: "bot", reply_text: "No tengo otra sugerencia ahora. Pide un parking de nuevo, por favor." }]);
    return;
  }
  const { suggestions, index } = parkingCtx;
  const nextIdx = index + 1;

  if (nextIdx >= suggestions.length) {
    setMessages((m) => [...m, { from: "bot", reply_text: "No tengo más opciones cercanas. ¿Quieres que busque más lejos?" }]);
    return;
  }

  const next = suggestions[nextIdx];
  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: "Ah, perdona. Aquí hay otro parking:" },
    { from: "bot", reply_text: "", render: () => <ParkingCard p={next.p} distKm={next.dToDest} /> },
  ]);

  parkingCtx.index = nextIdx;
}
