// src/components/chat/actions/handleParkingNear.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { findPlaceByName, listTable } from "../data/queries";
import { getMapsLinkFromRecord } from "../helpers/gps";
import { parseCoords, haversineKm, pointToSegmentKm } from "../helpers/geo";

/* ============================================================
   OSRM helpers
   ============================================================ */
const OSRM_BASE = "https://router.project-osrm.org"; // demo public (pt test)
const OSRM_PROFILE = "driving";

async function osrmRoute({ start, end, overview = "false", geometries = "geojson" }) {
  // start/end: [lng, lat]
  if (!start?.length || !end?.length) throw new Error("OSRM: missing start/end coords");

  const [slng, slat] = start;
  const [elng, elat] = end;

  const url =
    `${OSRM_BASE}/route/v1/${OSRM_PROFILE}/` +
    `${slng},${slat};${elng},${elat}` +
    `?overview=${encodeURIComponent(overview)}` +
    `&geometries=${encodeURIComponent(geometries)}` +
    `&alternatives=false&steps=false`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM route failed: ${res.status}`);
  const json = await res.json();
  if (!json?.routes?.length) throw new Error("OSRM: no routes returned");
  return json.routes[0]; // { duration (sec), distance (m), geometry ... }
}

async function osrmDurationDistance(start, end) {
  try {
    const r = await osrmRoute({ start, end, overview: "false", geometries: "geojson" });
    return { durationSec: r.duration, distanceM: r.distance };
  } catch (e) {
    console.warn("[osrmDurationDistance] fallback -> null", e);
    return { durationSec: null, distanceM: null };
  }
}

// mic utilitar: limităm concurența la OSRM ca să nu blocăm UI
async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await mapper(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/* ============================================================
   (Păstrate) constante vechi – acum estimateReachableKm NU mai e esențial
   ============================================================ */
const TRUCK_MAX_KMH = 90; // limitare fizică
const TRUCK_AVG_KMH = 70; // medie realistă pe drum
const DRUM_FACTOR = 1.4; // cât e mai lung drumul real față de linie dreaptă

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
   UI: Card pentru un parking (adăugat ETA)
   ============================================================ */
function ParkingCard({ p, distKm, etaMin }) {
  const km = Number.isFinite(distKm) ? `· ${distKm.toFixed(1)} km` : "";
  const eta = Number.isFinite(etaMin) ? `· ~${Math.round(etaMin)} min` : "";
  const link = getMapsLinkFromRecord(p) || "#";

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{p.nombre}</div>
      <div className={styles.cardSubtitle}>
        {(p.direccion || "").trim()} {km} {eta}
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
      {
        from: "bot",
        reply_text: 'Necesito el nombre del sitio. Ej.: «Búscame un parking cerca de TCB».',
      },
    ]);
    return;
  }

  const dest = await findPlaceByName(placeName);
  if (!dest) {
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text: `No he encontrado el sitio «${placeName}». Intenta con el nombre tal y como aparece en GPS.`,
      },
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
    const segDist =
      userPos && destPos ? pointToSegmentKm(p._pos, userPos, destPos) : Number.POSITIVE_INFINITY;
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

  // OSRM ETA către primul parking (dacă avem userPos)
  let etaMin = null;
  if (userPos) {
    const { durationSec } = await osrmDurationDistance(userPos, suggestions[0].p._pos);
    if (Number.isFinite(durationSec)) etaMin = durationSec / 60;
  }

  const first = suggestions[0];
  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: "Claro, aquí puedes aparcar correctamente:" },
    {
      from: "bot",
      reply_text: "",
      render: () => <ParkingCard p={first.p} distKm={first.dToDest} etaMin={etaMin} />,
    },
  ]);

  // dacă vrei, poți salva și OSRM dist/dur către dest (optional)
  setParkingCtx({
    type: "parking",
    dest: { id: dest.id, nombre: dest.nombre, pos: destPos },
    userPos: userPos || null,
    suggestions,
    index: 0,
  });

  // 🔥 verificăm dacă utilizatorul a spus "no llego"
  if (/no llego/i.test(userText)) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "¿Cuánto disco te queda? (ej.: 1:25 o 45 min)" },
    ]);
  }
}

/* ============================================================
   1.5) Recalcul după timp (ACUM pe OSRM duration)
   ============================================================ */
export async function handleParkingRecomputeByTime({
  parkingCtx,
  minutes,
  setMessages,
  setParkingCtx,
}) {
  try {
    if (!parkingCtx?.dest?.pos) {
      setMessages((m) => [
        ...m,
        { from: "bot", reply_text: "No tengo el destino. Pide un parking de nuevo, por favor." },
      ]);
      return;
    }
    if (!parkingCtx?.userPos) {
      setMessages((m) => [
        ...m,
        { from: "bot", reply_text: "No tengo tu ubicación. Activa ubicación y vuelve a pedirme otro parking." },
      ]);
      return;
    }

    const { dest, userPos } = parkingCtx;
    const destPos = dest.pos;

    const { data: parksRaw } = await listTable("gps_parkings");
    const parks = (parksRaw || [])
      .map((p) => ({ ...p, _pos: parseCoords(p.coordenadas) }))
      .filter((p) => p._pos);

    if (!parks.length) {
      setMessages((m) => [...m, { from: "bot", reply_text: "No tengo parkings en la base de datos." }]);
      return;
    }

    // 1) prefiltru rapid (haversine) ca să nu apelăm OSRM la sute
    const pre = parks
      .map((p) => {
        const dToDest = haversineKm(p._pos, destPos);
        const dFromUser = haversineKm(p._pos, userPos);
        const segDist = pointToSegmentKm(p._pos, userPos, destPos);
        return { p, dToDest, dFromUser, segDist };
      })
      // păstrăm "în față" către dest + relativ aproape de user
      .filter((x) => x.dToDest <= haversineKm(userPos, destPos) + 0.5)
      .sort((a, b) => a.dFromUser - b.dFromUser)
      .slice(0, 25); // TOP 25 pentru OSRM

    const budgetSec = Math.max(0, Number(minutes || 0)) * 60;

    // 2) OSRM pentru fiecare candidat (concurență limitată)
    const enriched = await mapLimit(pre, 5, async (x) => {
      const { durationSec, distanceM } = await osrmDurationDistance(userPos, x.p._pos);
      return { ...x, osrmDurationSec: durationSec, osrmDistanceM: distanceM };
    });

    // 3) filtrare strictă pe OSRM duration
    let reachable = enriched.filter((x) => Number.isFinite(x.osrmDurationSec) && x.osrmDurationSec <= budgetSec);

    // fallback: dacă OSRM a picat (duration null), păstrăm nimic (mai safe)
    if (!reachable.length) {
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          reply_text:
            `Con ${minutes} min no encuentro un parking alcanzable según el tiempo real de ruta. ` +
            `¿Te muestro igualmente el más cercano?`,
        },
      ]);
      return;
    }

    // sort: cel mai bun pentru dest + timp mic
    reachable.sort(
      (a, b) =>
        a.dToDest - b.dToDest ||
        a.osrmDurationSec - b.osrmDurationSec ||
        a.segDist - b.segDist ||
        a.dFromUser - b.dFromUser
    );

    const suggestions = reachable.slice(0, 6);

    // ETA pentru primul
    const first = suggestions[0];
    const etaMin = first?.osrmDurationSec ? first.osrmDurationSec / 60 : null;

    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text: `Con ${minutes} min (tiempo real de ruta) te propongo este parking:`,
      },
      {
        from: "bot",
        reply_text: "",
        render: () => <ParkingCard p={first.p} distKm={first.dToDest} etaMin={etaMin} />,
      },
    ]);

    setParkingCtx({
      ...parkingCtx,
      suggestions,
      index: 0,
      remainingMinutes: minutes,
      mode: "time_filter_osrm",
    });
  } catch (e) {
    console.error("[handleParkingRecomputeByTime]", e);
    setMessages((m) => [...m, { from: "bot", reply_text: "Ha fallado el recálculo. Intenta otra vez." }]);
  }
}

/* ============================================================
   2) Next (calculăm ETA OSRM și la next, dacă avem userPos)
   ============================================================ */
export async function handleParkingNext({ parkingCtx, setMessages }) {
  if (!parkingCtx || parkingCtx.type !== "parking" || !parkingCtx.suggestions?.length) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "No tengo otra sugerencia ahora. Pide un parking de nuevo, por favor." },
    ]);
    return;
  }

  const { suggestions, index, userPos } = parkingCtx;
  const nextIdx = index + 1;

  if (nextIdx >= suggestions.length) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "No tengo más opciones cercanas. ¿Quieres que busque más lejos?" },
    ]);
    return;
  }

  const next = suggestions[nextIdx];

  let etaMin = null;
  if (userPos && next?.p?._pos) {
    const { durationSec } = await osrmDurationDistance(userPos, next.p._pos);
    if (Number.isFinite(durationSec)) etaMin = durationSec / 60;
  }

  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: "Ah, perdona. Aquí hay otro parking:" },
    {
      from: "bot",
      reply_text: "",
      render: () => <ParkingCard p={next.p} distKm={next.dToDest} etaMin={etaMin} />,
    },
  ]);

  parkingCtx.index = nextIdx;
}
