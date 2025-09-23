import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import styles from './NavOverlay.module.css';
import { normalizeGeoJSON, geojsonBounds } from './utils/geo';

export default function NavOverlay({ title = 'Navigație', geojson, onClose }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const routeLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const watchIdRef = useRef(null);

  const [running, setRunning] = useState(false);      // Start/Stop tracking
  const [followMe, setFollowMe] = useState(true);     // camera follow
  const [zoomPreset, setZoomPreset] = useState('close'); // 'close' ≈ 80 m, 'far' ≈ 1 km

  // aproximări: 80 m ~ z18, 1 km ~ z15 (variază cu lat.)
  const zoomLevels = { close: 18, far: 15 };

  // === init hartă + rută ===
  useEffect(() => {
    if (!mapEl.current) return;

    const map = L.map(mapEl.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([45, 25], zoomLevels.far);
    mapRef.current = map;

    // tiles OSM
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // desenează ruta (dacă e validă)
    const gj = normalizeGeoJSON(geojson);
    if (gj) {
      const routeLayer = L.geoJSON(gj, {
        style: { color: '#ff6600', weight: 5 },
      }).addTo(map);
      routeLayerRef.current = routeLayer;

      const b = geojsonBounds(gj);
      if (b) map.fitBounds(b, { padding: [56, 56] });
    }

    // cleanup
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
      userMarkerRef.current = null;
    };
  }, [geojson]);

  // === pornește/ oprește geolocation watch ===
  useEffect(() => {
    if (!mapRef.current) return;

    if (!running) {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      alert('Geolocația nu este disponibilă în acest browser.');
      setRunning(false);
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading, speed } = pos.coords;
        const latlng = [latitude, longitude];

        // creează/actualizează markerul userului
        if (!userMarkerRef.current) {
          const icon = L.divIcon({
            className: styles.meIcon,
            html: '<div class="dot"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });
          userMarkerRef.current = L.marker(latlng, { icon }).addTo(mapRef.current);
        } else {
          userMarkerRef.current.setLatLng(latlng);
        }

        // dacă follow -> center + zoom preset
        if (followMe) {
          mapRef.current.setView(latlng, zoomLevels[zoomPreset], { animate: true });
        }
      },
      (err) => {
        console.error('watchPosition error', err);
        alert('Nu am putut accesa locația. Verifică permisiunile GPS.');
        setRunning(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );

    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [running, followMe, zoomPreset]);

  // centrare pe rută
  const fitRoute = () => {
    if (!mapRef.current || !routeLayerRef.current) return;
    const b = routeLayerRef.current.getBounds();
    if (b && b.isValid()) mapRef.current.fitBounds(b, { padding: [56, 56] });
  };

  // centrare pe mine
  const fitMe = () => {
    if (!mapRef.current || !userMarkerRef.current) return;
    const ll = userMarkerRef.current.getLatLng();
    mapRef.current.setView(ll, zoomLevels[zoomPreset], { animate: true });
  };

  const toggleZoomPreset = () => {
    setZoomPreset((p) => (p === 'close' ? 'far' : 'close'));
    // dacă urmărește, recenter pe mine cu noul zoom
    if (followMe && userMarkerRef.current && mapRef.current) {
      const ll = userMarkerRef.current.getLatLng();
      mapRef.current.setView(ll, zoomLevels[zoomPreset === 'close' ? 'far' : 'close'], { animate: true });
    }
  };

  const handleClose = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    onClose?.();
  };

  return (
    <div className={styles.wrap}>
      {/* HEADER fix – butoane clare */}
      <div className={styles.header}>
        <div className={styles.title} title={title}>{title}</div>
        <div className={styles.controls}>
          <button
            className={`${styles.btn} ${running ? styles.btnDanger : styles.btnPrimary}`}
            onClick={() => setRunning((v) => !v)}
          >
            {running ? 'Stop' : 'Start'}
          </button>

          <button
            className={`${styles.btn} ${followMe ? styles.btnActive : ''}`}
            onClick={() => setFollowMe((v) => !v)}
            title="Camera follow"
          >
            {followMe ? 'Follow ON' : 'Follow OFF'}
          </button>

          <button
            className={styles.btn}
            onClick={toggleZoomPreset}
            title="Comută 80m / 1km"
          >
            {zoomPreset === 'close' ? '≈80 m' : '≈1 km'}
          </button>

          <button className={styles.btn} onClick={fitRoute} title="Zoom la rută">Rută</button>
          <button className={styles.btn} onClick={fitMe} title="Zoom la mine">Eu</button>

          <button className={styles.btnClose} onClick={handleClose} title="Închide">×</button>
        </div>
      </div>

      <div ref={mapEl} className={styles.map}/>
    </div>
  );
}