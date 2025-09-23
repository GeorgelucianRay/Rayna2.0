// src/components/GpsPro/map/utils/geo.js

/** Acceptă string/object și întoarce un FeatureCollection valid (sau null) */
export function normalizeGeoJSON(input) {
  if (!input) return null;

  let gj = input;
  if (typeof input === 'string') {
    try { gj = JSON.parse(input); } catch { return null; }
  }

  // dacă e LineString simplu -> îl împachetăm într-un FeatureCollection
  if (gj?.type === 'LineString') {
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: gj }],
    };
  }

  // dacă e Feature cu LineString
  if (gj?.type === 'Feature' && gj?.geometry?.type === 'LineString') {
    return {
      type: 'FeatureCollection',
      features: [gj],
    };
  }

  // dacă e FeatureCollection
  if (gj?.type === 'FeatureCollection' && Array.isArray(gj.features)) {
    // filtrăm doar geometrii lineare
    const feats = gj.features.filter(f => f?.geometry?.type === 'LineString' || f?.geometry?.type === 'MultiLineString');
    if (feats.length === 0) return null;
    return { type: 'FeatureCollection', features: feats };
  }

  return null;
}

/** Bounds pentru orice FeatureCollection (LineString/MultiLineString) */
export function geojsonBounds(gj) {
  if (!gj || gj.type !== 'FeatureCollection') return null;
  const coords = [];

  gj.features.forEach(f => {
    if (!f?.geometry) return;
    const g = f.geometry;
    if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
      g.coordinates.forEach(c => coords.push(c));
    } else if (g.type === 'MultiLineString' && Array.isArray(g.coordinates)) {
      g.coordinates.forEach(arr => arr.forEach(c => coords.push(c)));
    }
  });

  if (coords.length === 0) return null;

  const lats = coords.map(c => c[1]);
  const lons = coords.map(c => c[0]);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west  = Math.min(...lons);
  const east  = Math.max(...lons);

  return [[south, west], [north, east]];
}