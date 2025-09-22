// src/components/GpsPro/helpers/routing.js

// Cere rută camion (driving-hgv) de la OpenRouteService.
// start/end/via sunt obiecte { lat, lng } (ATENȚIE: ORS vrea [lng,lat] în coordinates)
export async function fetchORSRouteTruck({ start, end, via = [], orsKey, restrictions = {} }) {
  const coords = [start, ...via, end].map(p => [p?.lng, p?.lat]);

  const body = {
    coordinates: coords,
    preference: 'recommended',      // "fastest" | "recommended" | "shortest"
    instructions: false,            // true dacă vrei turn-by-turn
    language: 'es',
    // 👇 IMPORTANT: profile_params este în interiorul `options`
    options: {
      profile_params: {
        restrictions: {
          height:   restrictions.height   ?? 4.0,   // metri
          width:    restrictions.width    ?? 2.55,
          length:   restrictions.length   ?? 16.5,
          axleload: restrictions.axleload ?? 10,    // t/axă
          weight:   restrictions.weight   ?? 40,    // t total
          hazmat:   restrictions.hazmat   ?? false,
        },
      },
      // avoid_features: ['ferries','tollways'], // opțional
    },
  };

  const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-hgv/geojson', {
    method: 'POST',
    headers: {
      'Authorization': orsKey,
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/geo+json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ORS ${res.status}: ${text}`);
  }
  return res.json(); // GeoJSON FeatureCollection
}

// Salvează ruta în Supabase în tabelul gps_routes (ca GeoJSON + puncte)
export async function saveRouteToSupabase({ supabase, user, client, destination, geojson }) {
  const feat = geojson.features?.[0];
  const summary = feat?.properties?.summary || {};
  const coords = feat?.geometry?.coordinates || []; // [lng,lat]
  const points = coords.map(([lng, lat]) => ({ lat, lng }));

  const payload = {
    client_id: client?.id ?? null,
    origin_terminal_id: null,
    name: `Ruta ORS · ${client?.nombre || destination?.label || 'sin nombre'} · ${new Date().toLocaleString()}`,
    mode: 'ors',
    provider: 'openrouteservice',
    geojson,                       // întregul GeoJSON
    points,                        // și punctele pentru UI-ul tău
    distance_m: summary.distance ?? null,
    duration_s: summary.duration ?? null,
    round_trip: false,
    sampling: { mode: 'ors', threshold_m: null },
    meta: destination ? { picked_destination: destination } : null,
    created_by: user?.id ?? null,
  };

  const { error } = await supabase.from('gps_routes').insert([payload]);
  if (error) throw error;
}