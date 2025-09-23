// src/components/GpsPro/utils/geo.js

/**
 * Returnează true dacă array-ul arată ca [lon, lat] în intervale valide.
 */
export function isLonLat(a) {
  return (
    Array.isArray(a) &&
    a.length === 2 &&
    Number.isFinite(a[0]) &&
    Number.isFinite(a[1]) &&
    a[0] >= -180 && a[0] <= 180 &&
    a[1] >= -90 && a[1] <= 90
  );
}

/**
 * Acceptă coordonate în mai multe formate și returnează [lon, lat]
 * - string "lat,lon"  -> parsează și inversează
 * - array [lat,lon] sau [lon,lat] -> detectează cu intervale
 * - object {lat, lon} | {latitude, longitude}
 */
export function toLonLat(input) {
  if (input == null) throw new Error('Coordonate lipsă.');

  // string "lat,lon"
  if (typeof input === 'string') {
    const parts = input.split(',').map(s => s.trim());
    if (parts.length !== 2) throw new Error(`Coordonate invalide: "${input}"`);
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (Number.isNaN(a) || Number.isNaN(b)) throw new Error(`Coordonate invalide: "${input}"`);
    // string e de forma lat,lon → întoarcem [lon,lat]
    return [b, a];
  }

  // array: poate fi [lat,lon] sau [lon,lat]
  if (Array.isArray(input)) {
    if (input.length !== 2) throw new Error(`Coordonate invalide (array): ${JSON.stringify(input)}`);
    const A = Number(input[0]);
    const B = Number(input[1]);
    if (Number.isNaN(A) || Number.isNaN(B)) throw new Error(`Coordonate invalide (array): ${JSON.stringify(input)}`);
    // Heuristic: dacă prima e în -90..90 și a doua în -180..180 → [lat,lon] → inversează
    if (A >= -90 && A <= 90 && B >= -180 && B <= 180) return [B, A];
    return [A, B];
  }

  // object {lat, lon} | { latitude, longitude } | { lng }
  if (typeof input === 'object') {
    const lat = Number(input.lat ?? input.latitude);
    const lon = Number(input.lon ?? input.lng ?? input.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error(`Coordonate invalide (object): ${JSON.stringify(input)}`);
    }
    return [lon, lat];
  }

  throw new Error(`Tip de coordonate necunoscut: ${typeof input}`);
}

/**
 * Convertește o listă de puncte la un FeatureCollection cu un singur LineString.
 * Acceptă puncte în formate mixte (vezi toLonLat). Returnează null dacă sunt < 2.
 *
 * @param {Array} points - ex: [[lon,lat], "lat,lon", {lat,lon}, ...]
 */
export function pointsToGeoJSON(points) {
  if (!Array.isArray(points)) return null;

  const coords = [];
  for (const p of points) {
    try {
      const ll = toLonLat(p);
      if (isLonLat(ll)) coords.push(ll);
    } catch {
      // ignoră punct invalid
    }
  }
  if (coords.length < 2) return null;

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coords, // [ [lon,lat], ... ]
        },
      },
    ],
  };
}

/**
 * Normalizează diverse forme (string/Geometry/Feature) într-un FeatureCollection valid.
 */
export function ensureFeatureCollection(input) {
  if (!input) return null;

  let obj = input;
  if (typeof obj === 'string') {
    try { obj = JSON.parse(obj); } catch { return null; }
  }

  if (obj?.type === 'FeatureCollection' && Array.isArray(obj.features)) return obj;

  if (obj?.type === 'Feature' && obj.geometry) {
    return { type: 'FeatureCollection', features: [obj] };
  }

  if (obj?.type && obj?.coordinates) {
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: obj }],
    };
  }
  return null;
}