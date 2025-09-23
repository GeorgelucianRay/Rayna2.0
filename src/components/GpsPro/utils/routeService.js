/**
 * Acceptă coordonate în mai multe formate și returnează [lon, lat]
 */
function toLonLat(input) {
  if (!input) throw new Error('Coordonate lipsă.');

  // string "lat,lon"
  if (typeof input === 'string') {
    const parts = input.split(',').map(s => s.trim());
    if (parts.length !== 2) throw new Error(`Coordonate invalide: "${input}"`);
    const lat = Number(parts[0]);
    const lon = Number(parts[1]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error(`Coordonate invalide: "${input}"`);
    return [lon, lat];
  }

  // array [lat,lon] sau [lon,lat]
  if (Array.isArray(input)) {
    if (input.length !== 2) throw new Error(`Coordonate invalide (array): ${JSON.stringify(input)}`);
    const a = Number(input[0]);
    const b = Number(input[1]);
    if (Number.isNaN(a) || Number.isNaN(b)) throw new Error(`Coordonate invalide (array): ${JSON.stringify(input)}`);
    if (a >= -90 && a <= 90 && b >= -180 && b <= 180) return [b, a]; // [lon,lat]
    return [a, b];
  }

  // object {lat, lon}
  if (typeof input === 'object') {
    const lat = Number(input.lat ?? input.latitude);
    const lon = Number(input.lon ?? input.lng ?? input.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error(`Coordonate invalide (object): ${JSON.stringify(input)}`);
    return [lon, lat];
  }

  throw new Error(`Tip de coordonate necunoscut: ${typeof input}`);
}

/**
 * Cere rută camion (driving-hgv) de la OpenRouteService
 * și returnează { geojson, distance_m, duration_s }
 */
export async function fetchTruckRouteORS({ origin, destination, apiKey }) {
  const key = apiKey || import.meta.env.VITE_ORS_KEY;
  if (!key) throw new Error('Lipsește VITE_ORS_KEY (seteaz-o în Vercel → Project → Settings → Environment Variables).');

  const o = toLonLat(origin);
  const d = toLonLat(destination);

  const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-hgv/geojson', {
    method: 'POST',
    headers: {
      'Authorization': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: [o, d],
      instructions: false,
      units: 'km',
      elevation: false,
    }),
  });

  let json = null;
  try { json = await res.json(); } catch {}

  if (!res.ok) {
    const msg = json?.error || json?.message || res.statusText || 'Eroare ORS';
    throw new Error(`ORS: ${msg}`);
  }

  const feature = json?.features?.[0];

  const distance_m =
    feature?.properties?.summary?.distance ??
    feature?.properties?.segments?.[0]?.distance ?? null;

  const duration_s =
    feature?.properties?.summary?.duration ??
    feature?.properties?.segments?.[0]?.duration ?? null;

  return { geojson: json, distance_m, duration_s };
}