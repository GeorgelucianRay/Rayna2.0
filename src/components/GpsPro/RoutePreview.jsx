import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './GpsPro.module.css';

export default function RoutePreview({ title='Ruta', geojson, onClose }) {
  const mapRef = useRef(null);

  useEffect(() => {
    const el = document.getElementById('route-preview-map');
    if (!el || mapRef.current) return;
    const map = L.map(el, { center:[41.39,2.15], zoom:6, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19, attribution:'&copy; OpenStreetMap'
    }).addTo(map);
    mapRef.current = map;

    try {
      const layer = L.geoJSON(geojson).addTo(map);
      map.fitBounds(layer.getBounds(), { padding:[20,20] });
    } catch (e) { console.error(e); }
  }, [geojson]);

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e)=> e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button className={styles.iconBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody} style={{height:'60vh'}}>
          <div id="route-preview-map" className={styles.mapCanvas} style={{height:'100%'}}/>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btn} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}