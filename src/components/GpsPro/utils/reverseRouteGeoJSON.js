// src/components/GpsPro/utils/reverseRouteGeoJSON.js
export default function reverseRouteGeoJSON(fc) {
  try {
    const copy = JSON.parse(JSON.stringify(fc));
    (copy.features || []).forEach((f) => {
      const g = f.geometry;
      if (!g) return;
      if (g.type === 'LineString') {
        g.coordinates = [...g.coordinates].reverse();
      } else if (g.type === 'MultiLineString') {
        g.coordinates = g.coordinates.map((line) => [...line].reverse()).reverse();
      }
    });
    return copy;
  } catch {
    return fc;
  }
}