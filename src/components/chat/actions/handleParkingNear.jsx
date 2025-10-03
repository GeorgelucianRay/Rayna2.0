// src/components/chat/actions/handleParkingNear.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { findPlaceByName, listTable } from "../data/queries";
import { getMapsLinkFromRecord } from "../helpers/gps";
import { parseCoords, haversineKm, pointToSegmentKm } from "../helpers/geo";

// ——— Card UI
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
   Fallback robust: extrage numele locului din text liber
   Exemple de intrare:
     "búscame un parking cerca de venso"
     "buscame un parking serca TCB"
     "parcare lângă Maersk"
     "find parking near Cosco"
   Returnează "venso", "tcb", "maersk", "cosco"
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

  // 1) încearcă să ia tot ce e după expresiile tip „cerca de / near / lângă”
  const AFTER_PATTERNS = [
    /cerca de\s+(.+)/i,
    /serca de\s+(.+)/i,
    /aproape de\s+(.+)/i,
    /langa\s+(.+)/i,
    /langa de\s+(.+)/i,
    /langa\s+de\s+(.+)/i,
    /lângă\s+(.+)/i,
    /near\s+(.+)/i,
    /next to\s+(.+)/i,
    /junto a\s+(.+)/i,
    /a prop de\s+(.+)/i,
    /proper a\s+(.+)/i,
    /a prop\s+(.+)/i,
  ];
  for (const rx of AFTER_PATTERNS) {
    const m = t.match(rx);
    if (m && m[1]) {
      t = m[1].trim();
      break;
    }
  }

  // 2) dacă încă începe cu „buscame/buscame/búscame” etc., taie trigger-ele la început
  const LEADERS = [
    /^buscame(?:\s+un)?\s+parking(?:\s+(?:cerca|serca))?\s+(?:de\s+)?/,
    /^buscame(?:\s+un)?\s+aparcamiento\s+(?:cerca\s+de\s+)?/,
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
  for (const rx of LEADERS) {
    t = t.replace(rx, "").trim();
  }

  // 3) scoruri: calculează distanța la DEST + (opțional) distanța la segmentul user→dest
let scored = parks.map(p => {
  const dToDest = haversineKm(p._pos, destPos);
  const segDist = (userPos && destPos) ? pointToSegmentKm(p._pos, userPos, destPos) : Number.POSITIVE_INFINITY;
  return { p, dToDest, segDist };
});

// —— vrei prioritar „cerca del destino”.
// Când avem userPos, folosim proximitatea la traseu DOAR ca tie-breaker.
scored.sort((a, b) => {
  const byDest = a.dToDest - b.dToDest;
  if (byDest !== 0) return byDest;
  return a.segDist - b.segDist;
});
  // 4) curăță ghilimele și punctuație de final
  t = t.replace(/^[«"“”'`]+|[»"“”'`]+$/g, "").replace(/[.?!]$/g, "").trim();

  // 5) dacă a rămas foarte scurt (<=1), nul
  if (t.length <= 1) return null;

  // 6) păstrează doar ultimele 4 cuvinte (unele nume au 2-3)
  const parts = t.split(" ");
  if (parts.length > 4) t = parts.slice(-4).join(" ");

  return t;
}

/**
 * 1) Caută cea mai apropiată parcare de DEST (sau de traseu user->DEST)
 *    și memorează o listă de sugestii în parkingCtx (în RaynaHub).
 */
export async function handleParkingNearStart({
  slots,
  userText,                 // ← IMPORTANT: textul brut de la utilizator
  setMessages,
  setParkingCtx,
  userPos // {lat, lon} sau null
}) {
  // 0) determină numele locului
  let placeName = (slots?.placeName || "").trim();
  if (!placeName) {
    placeName = extractPlaceNameFromText(userText || "");
    console.debug("[parkingNear] fallback extracted place:", placeName, " from:", userText);
  }

  if (!placeName) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "Necesito el nombre del sitio. Ej.: «Búscame un parking cerca de TCB»." }
    ]);
    return;
  }

  // 1) găsește destinația (TCB / Venso etc.)
  const dest = await findPlaceByName(placeName);
  if (!dest) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: `No he encontrado el sitio «${placeName}». Intenta con el nombre tal y como aparece en GPS.` }
    ]);
    return;
  }
  const destPos = parseCoords(dest.coordenadas);

  // 2) ia parcările din DB
  const { data: parksRaw, error: parksErr } = await listTable("gps_parkings");
  if (parksErr) {
    console.error("[parkingNear] listTable error:", parksErr);
  }
  const parks = (parksRaw || [])
    .map((p) => ({ ...p, _pos: parseCoords(p.coordenadas) }))
    .filter((p) => p._pos);

  if (!parks.length) {
    setMessages((m) => [...m, { from: "bot", reply_text: "No tengo parkings en la base de datos." }]);
    return;
  }

  // 3) scoruri
  let scored = parks.map((p) => {
    const dToDest = haversineKm(p._pos, destPos);
    let segDist = Number.POSITIVE_INFINITY;
    if (userPos && destPos) segDist = pointToSegmentKm(p._pos, userPos, destPos);
    return { p, dToDest, segDist };
  });

  // 4) sortare
  if (userPos) {
    scored.sort((a, b) => (a.segDist - b.segDist) || (a.dToDest - b.dToDest));
  } else {
    scored.sort((a, b) => a.dToDest - b.dToDest);
  }

  // 5) pregătește sugestiile (primele 6)
  const suggestions = scored.slice(0, 6);
  if (!suggestions.length) {
    setMessages((m) => [...m, { from: "bot", reply_text: "No he encontrado parkings adecuados." }]);
    return;
  }

  // 6) prima sugestie (răspuns inițial)
  const first = suggestions[0];
setMessages(m => [
  ...m,
  { from: "bot", reply_text: "Claro, aquí puedes aparcar correctamente:" },
  {
    from: "bot",
    reply_text: "",
    render: () => (
      <ParkingCard
        p={first.p}
        // distanța afișată = spre DEST, mereu
        distKm={first.dToDest}
      />
    )
  }
]);

  // 7) salvează contextul în RaynaHub (pentru „otro”)
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
export async function handleParkingNext({ parkingCtx, setMessages }) {
  if (!parkingCtx || parkingCtx.type !== "parking" || !parkingCtx.suggestions?.length) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "No tengo otra sugerencia ahora. Pide un parking de nuevo, por favor." }
    ]);
    return;
  }
  const { suggestions, index, userPos } = parkingCtx;
  const nextIdx = index + 1;

  if (nextIdx >= suggestions.length) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "No tengo más opciones cercanas. ¿Quieres que busque más lejos?" }
    ]);
    return;
  }

  const next = suggestions[nextIdx];
  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: "Ah, perdona. Aquí hay otro parking:" },
    {
      from: "bot",
      reply_text: "",
      render: () => (
  <ParkingCard
    p={next.p}
    distKm={next.dToDest}   // ← spre DEST
  />
)
    }
  ]);

  // avansează cursorul
  parkingCtx.index = nextIdx;
}