// src/components/GpsPro/NavOverlay.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './GpsPro.module.css';

const userIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width:18px;height:18px;border-radius:50%;
    background:#00e5ff;border:2px solid #fff;box-shadow:0 0 12px #00e5ff;
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function haversine(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat/2), s2 = Math.sin(dLng/2);
  const aa = s1*s1 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2*s2;
  return 2*R*Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
}

export default function NavOverlay({ title, geojson, onClose }) {
  const mapRef = useRef(null);
  const routeLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const [following, setFollowing] = useState(true);
  const [started, setStarted] = useState(true);
  const [distanceLeft, setDistanceLeft] = useState(null);

  // extragem punctele rutei ca [lat,lng]
  const routeLatLngs = useMemo(() => {
    try {
      const coords = geojson?.geometry?.coordinates || [];
      return coords.map(([lng, lat]) => L.latLng(lat, lng));
    } catch { return []; }
  }, [geojson]);

  useEffect(() => {
    const map = L.map('nav-map', { zoomControl: false });
    mapRef.current = map;

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { maxZoom: 19, attribution: '&copy; OSM' }
    ).addTo(map);

    // butoane zoom
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // desenăm ruta
    routeLayerRef.current = L.polyline(routeLatLngs, {
      color: '#00e5ff', weight: 5, opacity: 0.85,
    }).addTo(map);

    if (routeLatLngs.length) {
      map.fitBounds(L.latLngBounds(routeLatLngs), { padding: [20, 20] });
    }

    // marker user
    userMarkerRef.current = L.marker(routeLatLngs[0] || map.getCenter(), { icon: userIcon }).addTo(map);

    // GPS
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        ({ coords }) => {
          const ll = L.latLng(coords.latitude, coords.longitude);
          userMarkerRef.current.setLatLng(ll);

          // recalculează distanța rămasă: găsim cel mai apropiat punct pe polilinie
          let minD = Infinity, minIdx = 0;
          for (let i = 0; i < routeLatLngs.length; i++) {
            const d = haversine(ll, routeLatLngs[i]);
            if (d < minD) { minD = d; minIdx = i; }
          }
          let rest = 0;
          for (let i = minIdx; i < routeLatLngs.length - 1; i++) {
            rest += haversine(
              { lat: routeLatLngs[i].lat,   lng: routeLatLngs[i].lng },
              { lat: routeLatLngs[i+1].lat, lng: routeLatLngs[i+1].lng }
            );
          }
          setDistanceLeft(Math.round(rest));

          if (following) map.setView(ll, Math.max(map.getZoom(), 15));
        },
        (err) => {
          console.warn('GPS error:', err?.message);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
      );
    }

    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start/Stop doar pornește/oprește urmărirea GPS (markerul rămâne)
  useEffect(() => {
    if (!navigator.geolocation) return;
    if (started && watchIdRef.current == null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        ({ coords }) => {
          const ll = L.latLng(coords.latitude, coords.longitude);
          userMarkerRef.current.setLatLng(ll);
          if (following && mapRef.current) mapRef.current.setView(ll, Math.max(mapRef.current.getZoom(), 15));
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
      );
    }
    if (!started && watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, [started, following]);

  const kmLeft = distanceLeft == null ? '—' : `${(distanceLeft/1000).toFixed(1)} km`;

  return (
    <div className={styles.mapPanelBackdrop} style={{zIndex: 9999}}>
      <div className={styles.mapPanel} style={{width:'min(1200px,96vw)', height:'min(90vh,900px)'}}>
        <div className={styles.mapHeader}>
          <div className={styles.mapTitle}><span className={styles.dotGlow}/> Navigare · {title || 'Ruta salvată'}</div>
          <button className={styles.iconBtn} onClick={onClose}>✕</button>
        </div>

        <div id="nav-map" className={styles.mapCanvas}/>

        <div className={styles.mapToolbar}>
          <div className={styles.segmented}>
            <button className={`${styles.segBtn} ${started?styles.segActive:''}`} onClick={()=>setStarted(true)}>Start</button>
            <button className={`${styles.segBtn} ${!started?styles.segActive:''}`} onClick={()=>setStarted(false)}>Stop</button>
          </div>
          <label className={styles.switch} title="Follow GPS">
            <input type="checkbox" checked={following} onChange={(e)=>setFollowing(e.target.checked)} />
            <span></span>
            Urmărire
          </label>
          <div className={styles.kpis}>
            <span className={styles.kpi}>Distanță rămasă: <strong>{kmLeft}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}