// src/components/chat/helpers/geo.js

// "41.385,2.17" -> {lat, lon}  sau null
export function parseCoords(s) {
  if (!s) return null;
  const [latStr, lonStr] = String(s).split(",").map(t => t.trim());
  const lat = Number(latStr), lon = Number(lonStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

// Haversine (km)
export function haversineKm(a, b) {
  if (!a || !b) return Infinity;
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const x =
    Math.sin(dLat/2)**2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// distanța unui punct P la segmentul A-B (km)
export function pointToSegmentKm(P, A, B) {
  // fallback dacă nu avem toate punctele
  if (!P || !A || !B) return Infinity;

  // proiectăm în coordonate aproximativ plane (ok pe distanțe urbane)
  const toXY = ({lat, lon}) => {
    const x = (lon) * 111.320 * Math.cos((lat * Math.PI)/180);
    const y = (lat) * 110.574;
    return {x, y};
  };
  const p = toXY(P), a = toXY(A), b = toXY(B);

  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: p.x - a.x, y: p.y - a.y };
  const ab2 = ab.x*ab.x + ab.y*ab.y;
  if (ab2 === 0) return haversineKm(P, A);

  let t = (ap.x*ab.x + ap.y*ab.y) / ab2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t*ab.x, y: a.y + t*ab.y };

  const dx = proj.x - p.x, dy = proj.y - p.y;
  const km = Math.sqrt(dx*dx + dy*dy);
  return km; // deoarece x,y au unități „km” aproximative
}