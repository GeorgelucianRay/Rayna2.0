// src/components/GpsPro/RoutePreview.jsx
// VARIANTĂ ÎMBUNĂTĂȚITĂ

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './GpsPro.module.css'; // Presupunând că folosește stilurile comune

// O funcție ajutătoare pentru a normaliza GeoJSON (poate o ai deja într-un fișier utilitar)
function normalizeGeoJSON(input) {
  if (!input) return null;
  let obj = typeof input === 'string' ? JSON.parse(input) : input;
  if (obj?.type === 'FeatureCollection') return obj;
  if (obj?.type === 'Feature') return { type: 'FeatureCollection', features: [obj] };
  if (obj?.type && obj.coordinates) return { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: obj, properties: {} }] };
  return null;
}

// Repară iconițele default din Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function RoutePreview({ title = 'Previzualizare Rută', geojson, onClose }) {
  const mapEl = useRef(null); // Folosim useRef pentru elementul hărții
  const mapRef = useRef(null);

  useEffect(() => {
    // Verificăm dacă elementul există și dacă harta nu a fost deja inițializată
    if (!mapEl.current || mapRef.current) return;

    const map = L.map(mapEl.current, {
      center: [46.8, 24.9], // Centrat pe România
      zoom: 7,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    
    mapRef.current = map;

    try {
      const normalized = normalizeGeoJSON(geojson);
      if (normalized) {
        const layer = L.geoJSON(normalized, {
          style: { color: '#007bff', weight: 6, opacity: 0.8 },
        }).addTo(map);

        // Centrează harta pe traseu
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40] });
        }
      }
    } catch (e) {
      console.error("GeoJSON invalid:", e);
    }
    
    // Funcția de curățare
    return () => {
        map.remove();
        mapRef.current = null;
    };
  }, [geojson]);

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button className={styles.iconBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody} style={{ height: '60vh', padding: 0 }}>
          {/* Legăm elementul div de ref-ul nostru, în loc de a folosi un ID */}
          <div ref={mapEl} className={styles.mapCanvas} style={{ height: '100%', width: '100%' }} />
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btn} onClick={onClose}>Închide</button>
        </div>
      </div>
    </div>
  );
}
