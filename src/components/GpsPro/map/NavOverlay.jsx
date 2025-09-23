// src/components/GpsPro/map/NavOverlay.jsx
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from '../GpsPro.module.css';
import { geojsonBounds, normalizeGeoJSON } from '../utils/geo';

export default function NavOverlay({ title, geojson, onClose }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [following, setFollowing] = useState(true);
  const [watchId, setWatchId] = useState(null);
  const [marker, setMarker] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // inițializare hartă
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([41.38, 2.17], 10);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // desenăm ruta
    const gj = normalizeGeoJSON(geojson);
    if (gj) {
      const layer = L.geoJSON(gj, {
        style: { color: '#ff6600', weight: 5 },
      }).addTo(map);

      const b = geojsonBounds(gj);
      if (b) map.fitBounds(b, { padding: [40, 40] });
    }

    return () => {
      map.remove();
    };
  }, [geojson]);

  // urmărește poziția utilizatorului
  useEffect(() => {
    if (!mapRef.current) return;
    if (watchId) navigator.geolocation.clearWatch(watchId);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const latlng = [latitude, longitude];

        if (!marker) {
          const newMarker = L.marker(latlng, {
            icon: L.icon({
              iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64113.png',
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            }),
          }).addTo(mapRef.current);
          setMarker(newMarker);
        } else {
          marker.setLatLng(latlng);
        }

        if (following) {
          mapRef.current.setView(latlng, mapRef.current.getZoom() || 14);
        }
      },
      (err) => console.warn('Geoloc error', err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    setWatchId(id);
    return () => {
      if (id) navigator.geolocation.clearWatch(id);
    };
  }, [following]);

  return (
    <div className={styles.navOverlay}>
      <header className={styles.navHeader}>
        <h3>{title || 'Navigare'}</h3>
        <div className={styles.navControls}>
          <button onClick={() => setFollowing((f) => !f)}>
            {following ? '🔒 Blocare pe mine' : '📍 Urmărește-mă'}
          </button>
          <button onClick={onClose}>✕ Închide</button>
        </div>
      </header>
      <div ref={containerRef} className={styles.navMap} />
    </div>
  );
}