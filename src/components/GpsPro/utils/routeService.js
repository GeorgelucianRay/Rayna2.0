// src/components/GpsPro/utils/routeService.js

/**
 * Acceptă coordonate în mai multe formate și returnează [lon, lat]
 * - string "lat,lon"  -> parsează
 * - array [lat, lon]  -> inversează în [lon, lat] dacă pare a fi [lat,lon]
 * - object {lat, lon} -> construiește [lon, lat]
 */
function toLonLat(input) {
  if (!input) throw new Error('Coordonate lipsă.');

  // string "lat,lon" sau "lat , lon"
  if (typeof input === 'string') {
    const parts = input.split(',').map(s => s.trim());
    if (parts.length !== 2) throw new Error(`Coordonate invalide: "${input}"`);
    const lat = Number(parts[0]);
    const lon = Number(parts[1]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error(`Coordonate invalide: "${input}"`);
    return [lon, lat]; // ORS cere [lon,lat]
  }

  // array
  if (Array.isArray(input)) {
    if (input.length !== 2) throw new Error(`Coordonate invalide (array): ${JSON.stringify(input)}`);
    const a = Number(input[0]);
    const b = Number(input[1]);
    if (Number.isNaN(a) || Number.isNaN(b)) throw new Error(`Coordonate invalide (array): ${JSON.stringify(input)}`);
    // Heuristic: dacă prima valoare e între -90..90, presupunem că e LAT
    if (a >= -90 && a <= 90 && b >= -180 && b <= 180) return [b, a]; // [lon,lat]
    return [a, b]; // deja [lon,lat]
  }

  // object { lat, lon } | { latitude, longitude }
  if (typeof input === 'object') {
    const lat = Number(input.lat ?? input.latitude);
    const lon = Number(input.lon ?? input.lng ?? input.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error(`Coordonate invalide (object): ${JSON.stringify(input)}`);
    return [lon, lat];
  }

  throw new Error(`Tip de coordonate necunoscut: ${typeof input}`);
}

/**
 * Cere rută camion (driving-hgv) de la OpenRouteService și returnează:
 * { geojson, distance_m }
 *
 * origin/destination pot fi:
 * - "lat,lon" (string)
 * - [lat,lon] (array)
 * - { lat, lon } (object)
 *
 * apiKey: dacă nu e trimis, se ia din import.meta.env.VITE_ORS_KEY
 */
export async function fetchTruckRouteORS({ origin, destination, apiKey }) {
  const key = apiKey || import.meta.env.VITE_ORS_KEY;
  if (!key) throw new Error('Lipsește VITE_ORS_KEY (seteaz-o în Vercel → Project → Settings → Environment Variables).');

  const o = toLonLat(origin);
  const d = toLonLat(destination);

  const url = 'https://api.openrouteservice.org/v2/directions/driving-hgv/geojson';
  const body = {
    coordinates: [o, d],   // [[lon,lat],[lon,lat]]
    instructions: false,
    units: 'km',
    elevation: false
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  let json = null;
  try { json = await res.json(); } catch (_) {}

  if (!res.ok) {
    const msg = json?.error || json?.message || res.statusText || 'Eroare ORS';
    throw new Error(`ORS: ${msg}`);
  }

  // Răspunsul ORS GeoJSON are FeatureCollection cu properties.summary.distance (m)
  const feature = json?.features?.[0];
  const distance_m =
    feature?.properties?.summary?.distance ??
    feature?.properties?.segments?.[0]?.distance ??
    null;

  return { geojson: json, distance_m };
}