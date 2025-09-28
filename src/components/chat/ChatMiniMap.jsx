import React, { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function ChatMiniMap({ id, geojson, mapsLink, title }) {
  useEffect(() => {
    const map = L.map(id, { zoomControl: false, attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    let gj = geojson;
    if (typeof gj === 'string') { try { gj = JSON.parse(gj); } catch {} }
    let bounds;

    if (gj) {
      const layer = L.geoJSON(gj).addTo(map);
      bounds = layer.getBounds();
    }
    if (!bounds || !bounds.isValid()) {
      map.setView([41.385, 2.17], 11); // fallback BCN
    } else {
      map.fitBounds(bounds.pad(0.2));
    }

    const el = document.getElementById(id);
    const onClick = () => { if (mapsLink) window.open(mapsLink, '_blank', 'noopener'); };
    el?.addEventListener('click', onClick);
    return () => { el?.removeEventListener('click', onClick); map.remove(); };
  }, [id, geojson, mapsLink]);

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', cursor: 'pointer' }}>
      <div id={id} style={{ width: '100%', height: 180 }} aria-label={`Mapa: ${title}`}/>
    </div>
  );
}