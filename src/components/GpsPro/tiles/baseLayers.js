// src/components/GpsPro/tiles/baseLayers.js
import L from 'leaflet';

export const layerNormal = () =>
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  });

export const layerBlack = () =>
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, attribution: '&copy; CARTO'
  });

export function createBaseLayers() {
  return {
    normal: layerNormal(),
    black: layerBlack(),
  };
}