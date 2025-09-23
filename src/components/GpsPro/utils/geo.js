// src/components/GpsPro/utils/geo.js

/** Parsează "lat,lon" -> {lat, lng} sau întoarce null dacă nu e valid */
export function strToLatLng(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.split(',').map(s => s.trim());
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export function haversine(a, b) {
  const R = 6371000; // m
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** points: [{lat,lng,ts?}] -> GeoJSON LineString (FeatureCollection) */
export function pointsToGeoJSON(points, props = {}) {
  const coords = points.map(p => [p.lng, p.lat]);
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { ...props },
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
      },
    ],
  };
}

/** Încearcă să normalizeze orice fel de payload într-un obiect GeoJSON valid */
export function normalizeGeoJSON(raw) {
  try {
    const gj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!gj) return null;

    // Dacă e un Feature simplu, împachetăm în FeatureCollection
    if (gj.type === 'Feature' && gj.geometry) {
      return { type: 'FeatureCollection', features: [gj] };
    }

    // Dacă e deja FeatureCollection și pare valid
    if (gj.type === 'FeatureCollection' && Array.isArray(gj.features)) {
      return gj;
    }

    // Dacă e doar o geometrie, o împachetăm ca Feature
    if (gj.type && gj.coordinates) {
      return {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: gj }],
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Calculează bounds [ [south, west], [north, east] ] dintr-un GeoJSON simplu (prima linie) */
export function geojsonBounds(gj) {
  const fc = normalizeGeoJSON(gj);
  if (!fc || !fc.features?.length) return null;
  const geom = fc.features[0]?.geometry;
  if (!geom || geom.type !== 'LineString') return null;

  let minLat = +Infinity, minLng = +Infinity, maxLat = -Infinity, maxLng = -Infinity;
  for (const [lng, lat] of geom.coordinates) {
    if (lat < minLat) minLat = lat;
    if (lng < minLng) minLng = lng;
    if (lat > maxLat) maxLat = lat;
    if (lng > maxLng) maxLng = lng;
  }
  return [[minLat, minLng], [maxLat, maxLng]];
}