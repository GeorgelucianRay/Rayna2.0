// simplu util pt. ORS (profil "heavyvehicle")
export async function fetchTruckRouteORS({ origin, destination, apiKey }) {
  // origin/destination: { coords: "lat,lng", label, type, id }
  if (!origin?.coords || !destination?.coords) {
    throw new Error('Origin/Destination missing coords');
  }
  const [olat, olng] = origin.coords.split(',').map(Number);
  const [dlat, dlng] = destination.coords.split(',').map(Number);

  const body = {
    coordinates: [[olng, olat], [dlng, dlat]], // ORS folosește [lon, lat]
    elevation: false,
    instructions: false,
    // profil camion
    profile_params: {
      restrictions: {
        height: 4.0,
        width: 2.5,
        length: 16.5,
        weight: 40000
      }
    }
  };

  const res = await fetch('https://api.openrouteservice.org/v2/directions/heavyvehicle/geojson', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ORS ${res.status}: ${txt}`);
  }

  const geo = await res.json(); // FeatureCollection/Feature (LineString)
  // extragem lungimea daca vine in properties/summary
  let distance_m = null;
  try {
    distance_m = geo.features?.[0]?.properties?.summary?.distance ?? null;
  } catch {}
  return { geojson: geo, distance_m };
}