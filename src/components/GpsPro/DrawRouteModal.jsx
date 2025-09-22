// src/components/GpsPro/DrawRouteModal.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './GpsPro.module.css';

// icon default fix (Leaflet CDN packing)
const defaultIcon = new L.Icon({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

// Haversine în metri
function dist(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const aa =
    s1 * s1 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}
function computeTotalMeters(points) {
  let m = 0;
  for (let i = 1; i < points.length; i++) m += dist(points[i - 1], points[i]);
  return Math.round(m);
}

export default function DrawRouteModal({
  subject,             // { id, label, type, coords? }  (opțional, doar pentru titlu)
  onClose,
  onSave,              // ({ geojson, points, distance_m }) => void
}) {
  const mapRef = useRef(null);
  const layerLineRef = useRef(null);
  const markersRef = useRef([]); // păstrăm instanțele Leaflet pentru drag
  const [points, setPoints] = useState([]);
  const [adding, setAdding] = useState(true);

  const center = useMemo(() => {
    // dacă avem coords "lat,lng" în subject, centrează acolo
    if (subject?.coords) {
      const p = String(subject.coords).split(',').map((v)=>parseFloat(String(v).trim()));
      if (p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
        return { lat: p[0], lng: p[1] };
      }
    }
    return { lat: 41.387, lng: 2.17 }; // fallback (Barcelona-ish)
  }, [subject]);

  // init map
  useEffect(() => {
    const map = L.map('draw-map', {
      zoomControl: true,
      center,
      zoom: 8,
    });
    mapRef.current = map;

    L.tileLayer(
      // fără cheie, tiles libere OSM
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      }
    ).addTo(map);

    // polyline layer
    layerLineRef.current = L.polyline([], {
      color: '#00e5ff',
      weight: 4,
      opacity: 0.9,
    }).addTo(map);

    // click pt adăugare punct
    const onClick = (e) => {
      if (!adding) return;
      addPoint(e.latlng);
    };
    map.on('click', onClick);

    return () => {
      map.off('click', onClick);
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, [center, adding]);

  // sync polyline când points se schimbă
  useEffect(() => {
    if (!layerLineRef.current) return;
    const latlngs = points.map((p) => [p.lat, p.lng]);
    layerLineRef.current.setLatLngs(latlngs);
  }, [points]);

  function addPoint(latlng) {
    // marker dragabil
    const marker = L.marker(latlng, { draggable: true, icon: defaultIcon });
    marker.on('drag', () => {
      // update punct pe drag
      const idx = markersRef.current.indexOf(marker);
      if (idx >= 0) {
        setPoints((prev) => {
          const next = prev.slice();
          const ll = marker.getLatLng();
          next[idx] = { lat: ll.lat, lng: ll.lng };
          return next;
        });
      }
    });
    marker.on('contextmenu', () => {
      // right-click → remove
      removeMarker(marker);
    });
    marker.addTo(mapRef.current);
    markersRef.current.push(marker);
    setPoints((prev) => [...prev, { lat: latlng.lat, lng: latlng.lng }]);
  }

  function removeMarker(marker) {
    const idx = markersRef.current.indexOf(marker);
    if (idx >= 0) {
      marker.remove();
      markersRef.current.splice(idx, 1);
      setPoints((prev) => prev.filter((_, i) => i !== idx));
    }
  }

  function undo() {
    if (markersRef.current.length === 0) return;
    const last = markersRef.current.pop();
    last.remove();
    setPoints((prev) => prev.slice(0, -1));
  }

  function clearAll() {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    setPoints([]);
  }

  function handleSave() {
    if (points.length < 2) {
      alert('Adaugă cel puțin două puncte.');
      return;
    }
    const distance_m = computeTotalMeters(points);
    const geojson = {
      type: 'Feature',
      properties: { name: subject?.label || 'Ruta dibujar' },
      geometry: {
        type: 'LineString',
        coordinates: points.map((p) => [p.lng, p.lat]), // GeoJSON = [lng,lat]
      },
    };
    onSave?.({ geojson, points, distance_m });
  }

  const distance_m = computeTotalMeters(points);
  const km = Math.round((distance_m / 1000) * 10) / 10;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Dibujar rută {subject?.label ? `· ${subject.label}` : ''}</h3>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className={styles.modalBody} style={{padding: 0}}>
          <div id="draw-map" className={styles.drawMap}/>
          <div className={styles.drawToolbar}>
            <button
              className={`${styles.btn} ${adding ? styles.btnPrimary : ''}`}
              onClick={()=> setAdding((v)=>!v)}
              title="Adaugă puncte (Click pe hartă)"
            >
              {adding ? 'Adăugare ON' : 'Adăugare OFF'}
            </button>
            <button className={styles.btn} onClick={undo} title="Undo (șterge ultimul marcaj)">Undo</button>
            <button className={styles.btn} onClick={clearAll} title="Golește toate punctele">Clear</button>
            <span className={styles.drawKpi}><strong>Puncte:</strong> {points.length}</span>
            <span className={styles.drawKpi}><strong>Dist.</strong> {km} km</span>
            <div style={{flex:1}}/>
            <button className={styles.btn} onClick={onClose}>Anulează</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={handleSave}
                    disabled={points.length < 2}>
              Salvează
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}