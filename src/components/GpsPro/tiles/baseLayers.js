import L from 'leaflet';

// Normal: OpenStreetMap Standard
export const layerNormal = () =>
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  });

// Satélite: Sentinel-2 cloudless (EOX) — gratuit, fără cheie, zoom ≈14
export const layerSatellite = () =>
  L.tileLayer(
    'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg',
    { maxZoom: 14, attribution: 'Sentinel-2 cloudless © EOX IT Services' }
  );

// Black: CARTO Dark Matter (gratuit)
export const layerBlack = () =>
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, attribution: '&copy; CARTO'
  });

export function createBaseLayers() {
  return {
    normal: layerNormal(),
    satelite: layerSatellite(), // <- acum există și e diferit clar
    black: layerBlack(),
  };
}