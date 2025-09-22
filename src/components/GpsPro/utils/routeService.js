// src/components/GpsPro/utils/routeService.js

/**
 * Helpers
 */
function parseCoords(input) {
  // Acceptă:
  // - string "lat,lng" sau "lng,lat"
  // - [lat, lng] sau [lng, lat]
  // - { lat, lng } sau { latitude, longitude }
  // Returnează întotdeauna [lng, lat]
  if (!input) return null;

  // string
  if (typeof input === 'string') {
    const parts = input.split(',').map(s => parseFloat(String(s).trim()));
    if (parts.length >= 2 && parts.every(n => Number.isFinite(n))) {
      // Heuristic: lat ∈ [-90..90]
      const [a, b] = parts;
      if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
        // probabil [lat, lng]
        return [b, a];
      } else {
        // probabil [lng, lat]
        return [a, b];
      }
    }
    return null;
  }

  // array
  if (Array.isArray(input) && input.length >= 2) {
    const [a, b] = input;
    if ([a, b].every(Number.isFinite)) {
      if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return [b, a];
      return [a, b];
    }
    return null;
  }

  // object
  if (typeof input === 'object') {
    const lat = Number.isFinite(input.lat) ? input.lat : input.latitude;
    const lng = Number.isFinite(input.lng) ? input.lng : input.longitude;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat];
  }

  return null;
}

function extractLngLat(item) {
  // item poate veni din baza ta: { coords || coordenadas || dest_coords }
  return (
    parseCoords(item?.coords) ||
    parseCoords(item?.coordenadas) ||
    parseCoords(item?.dest_coords) ||
    null
  );
}

/**
 * Cere o rută camion (driving-hgv) de la OpenRouteService.
 * IMPORTANT: profile_params trebuie să fie SUB "options".
 * @param {{origin:any,destination:any,apiKey:string, truck?:object}} args
 * origin / destination pot fi string/array/object; vezi parseCoords
 */
export async function fetchTruckRouteORS({
  origin,
  destination,
  apiKey,
  truck = {
    height: 4.0,
    width: 2.55,
    length: 16.5,
    axleload: 10,
    weight: 40, // tone
    hazmat: false,
  },
}) {
  if (!apiKey) throw new Error('ORS: lipsește cheia API (VITE_ORS_KEY)');

  const o = extractLngLat(origin) || parseCoords(origin);
  const d = extractLngLat(destination) || parseCoords(destination);
  if (!o || !d) throw new Error('Coordonate invalide pentru origin/destination');

  const body = {
    coordinates: [o, d], // [[lng,lat],[lng,lat]]
    preference: 'recommended',
    instructions: false,
    language: 'es',
    // ❗ AICI era greșeala: profile_params trebuie inclus sub "options"
    options: {
      profile_params: {
        restrictions: {
          height: truck.height,
          width: truck.width,
          length: truck.length,
          axleload: truck.axleload,
          weight: truck.weight,
          hazmat: truck.hazmat,
        },
      },
      // optional:
      // avoid_features: ['ferries', 'tollways'],
    },
  };

  const res = await fetch(
    'https://api.openrouteservice.org/v2/directions/driving-hgv/geojson',
    {
      method: 'POST',
      headers: {
        Authorization: apiKey, // fără "Bearer"
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/geo+json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`ORS ${res.status}: ${txt || res.statusText}`);
  }

  const geojson = await res.json();

  // extragem distanța / durata din GeoJSON dacă există
  let distance_m = null;
  let duration_s = null;
  try {
    const summary =
      geojson?.features?.[0]?.properties?.summary ||
      geojson?.properties?.summary;
    if (summary) {
      distance_m = summary.distance ?? null;
      duration_s = summary.duration ?? null;
    }
  } catch (_) {}

  return { geojson, distance_m, duration_s };
}

export default {
  fetchTruckRouteORS,
  parseCoords,
  extractLngLat,
};