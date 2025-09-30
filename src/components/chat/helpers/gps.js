// src/components/chat/helpers/gps.js
export function getMapsLinkFromRecord(rec) {
  if (!rec) return null;
  if (rec.link_maps) return rec.link_maps;
  if (rec.coordenadas) return `https://maps.google.com/?q=${encodeURIComponent(rec.coordenadas)}`;
  return null;
}

// "lat,lon" → GeoJSON FeatureCollection (Point)
export function pointGeoJSONFromCoords(coordsString) {
  if (!coordsString) return null;
  const [latStr, lonStr] = String(coordsString).split(",").map((s) => s.trim());
  const lat = Number(latStr);
  const lon = Number(lonStr);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: {} }],
    };
  }
  return null;
}