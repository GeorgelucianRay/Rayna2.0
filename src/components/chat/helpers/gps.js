// src/components/chat/helpers/gps.js
export function getMapsLinkFromRecord(rec) {
  if (!rec) return null;
  if (rec.link_maps) return rec.link_maps;
  if (rec.coordenadas) {
    return `https://maps.google.com/?q=${encodeURIComponent(rec.coordenadas)}`;
  }
  return null;
}

// "lat,lon" sau "lat lon" sau "lat;lon" → GeoJSON FeatureCollection (Point)
export function pointGeoJSONFromCoords(coordsString) {
  if (!coordsString) return null;

  // normalizează separatori și virgule zecimale
  const normalized = String(coordsString)
    .trim()
    .replace(/[; ]+/g, ",")         // spațiu / ; -> ,
    .replace(/，/g, ",");            // comma exotică chineză -> ,

  const [latStrRaw, lonStrRaw] = normalized.split(",").map(s => s.trim());
  if (!latStrRaw || !lonStrRaw) return null;

  // suport „virgulă zecimală” (ex: 41,234)
  const toNum = (s) => Number(s.replace(",", "."));
  const lat = toNum(latStrRaw);
  const lon = toNum(lonStrRaw);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {},
      },
    ],
  };
}