// src/components/GpsPro/tiles/baseLayers.js
import L from 'leaflet';

// Normal: OSM
export const layerNormal = () =>
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  });

// Satélite stabil (gratuit, fără cheie): EOX Sentinel-2 cloudless
// https://s2maps.eu  | tiles host: tiles.maps.eox.at
export const layerSatellite = () =>
  L.tileLayer(
    'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg',
    { maxZoom: 14, attribution: 'Sentinel-2 cloudless &copy; EOX IT Services' }
  );

// Dark/Black (gratuit, fără cheie): CARTO Dark Matter
export const layerBlack = () =>
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, attribution: '&copy; CARTO'
  });

export function createBaseLayers() {
  return {
    normal: layerNormal(),
    satelite: layerSatellite(),
    black: layerBlack(),
  };
}