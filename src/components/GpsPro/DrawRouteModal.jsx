import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './GpsPro.module.css';

export default function DrawRouteModal({ subject, onSave, onClose }) {
  const mapRef = useRef(null);
  const [points, setPoints] = useState([]); // [{lat,lng}...]

  useEffect(() => {
    const el = document.getElementById('draw-route-map');
    if (!el || mapRef.current) return;

    const start = subject?.coords
      ? subject.coords.split(',').map(Number)
      : [41.39, 2.15];

    const map = L.map(el, { center:[start[0], start[1]], zoom: 10 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(map);
    map.on('click', (e) => {
      setPoints(p => [...p, { lat: e.latlng.lat, lng: e.latlng.lng }]);
    });
    mapRef.current = map;
  }, [subject]);

  useEffect(() => {
    if (!mapRef.current) return;
    // curăță straturi anterioare
    mapRef.current.eachLayer(l => {
      if (l instanceof L.Polyline || l instanceof L.CircleMarker) mapRef.current.removeLayer(l);
    });
    // puncte
    points.forEach(p => L.circleMarker([p.lat, p.lng], { radius:4 }).addTo(mapRef.current));
    // linie
    if (points.length >= 2) L.polyline(points.map(p=>[p.lat,p.lng]), { color:'#00e5ff', weight:5 }).addTo(mapRef.current);
  }, [points]);

  const undo = () => setPoints(p => p.slice(0, -1));
  const reset = () => setPoints([]);

  const save = () => {
    if (points.length < 2) return alert('Necesitas al menos 2 puntos.');
    const coords = points.map(p => [p.lng, p.lat]); // GeoJSON lon,lat
    const geojson = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: { mode: 'dibujar' }
    };
    onSave({ geojson, points, distance_m: null });
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e)=> e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Dibujar ruta manual</h3>
          <button className={styles.iconBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody} style={{height:'60vh'}}>
          <div id="draw-route-map" className={styles.mapCanvas} style={{height:'100%'}}/>
        </div>
        <div className={styles.modalFooter} style={{justifyContent:'space-between'}}>
          <div style={{display:'flex', gap:8}}>
            <button className={styles.btn} onClick={undo} disabled={points.length===0}>Deshacer</button>
            <button className={styles.btn} onClick={reset} disabled={points.length===0}>Reset</button>
          </div>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={save}>
            Guardar ruta manual
          </button>
        </div>
      </div>
    </div>
  );
}