// src/components/GpsPro/hooks/useRouteRecorder.js
// Recorder robust: watchPosition + prag dinamic (100 m / 20 km) + GeoJSON util.

import { useCallback, useEffect, useRef, useState } from 'react';

export function haversineMeters(a, b) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s1 = Math.sin(dLat/2)**2 +
             Math.cos(a.lat * Math.PI/180) * Math.cos(b.lat * Math.PI/180) *
             Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(s1));
}

export function parseCoords(str) {
  if (!str || typeof str !== 'string') return null;
  // acceptă "lat, lng", "lat,lng", "lat;lng"
  const s = str.trim().replace(';', ',').replace(/\s+/g, '');
  const [latS, lngS] = s.split(',');
  const lat = parseFloat(latS), lng = parseFloat(lngS);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export default function useRouteRecorder() {
  const [active, setActive] = useState(false);
  const [precision, setPrecision] = useState(false); // false: 20km, true: 100m
  const thresholdRef = useRef(20000); // metri
  const watchIdRef = useRef(null);

  const lastKeptRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [distanceM, setDistanceM] = useState(0);

  // pragul se schimbă live
  useEffect(() => {
    thresholdRef.current = precision ? 100 : 20000;
  }, [precision]);

  const clearWatch = () => {
    try {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    } catch {}
  };

  const onPos = useCallback((pos) => {
    const { latitude, longitude, accuracy } = pos.coords || {};
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const p = { lat: latitude, lng: longitude, ts: Date.now(), acc: accuracy ?? null };
    // primul punct
    if (!lastKeptRef.current) {
      lastKeptRef.current = p;
      setPoints([p]);
      return;
    }

    // distanța de la ultimul punct păstrat
    const d = haversineMeters(lastKeptRef.current, p);

    // mereu actualizăm „ultimul punct” pentru vehicul (efect vizual fluid),
    // dar adăugăm în listă doar când depășește pragul
    if (d >= thresholdRef.current) {
      lastKeptRef.current = p;
      setPoints(prev => [...prev, p]);
      setDistanceM(prev => prev + d);
    }
  }, []);

  const onErr = useCallback((err) => {
    console.warn('geo error', err);
  }, []);

  const start = useCallback(() => {
    if (active) return;
    setActive(true);
    // resetăm colectarea (dar nu UI extern)
    lastKeptRef.current = null;
    setPoints([]);
    setDistanceM(0);

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
        enableHighAccuracy: precision, // true când comuți pe 100m
        timeout: 15000,
        maximumAge: 0,
      });
    } catch (e) {
      console.error('watchPosition failed', e);
    }
  }, [active, onPos, onErr, precision]);

  // când comuți precizia „în zbor”, repornim watch-ul cu noua setare
  useEffect(() => {
    if (!active) return;
    clearWatch();
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
        enableHighAccuracy: precision,
        timeout: 15000,
        maximumAge: 0,
      });
    } catch (e) {
      console.error('watchPosition re-init failed', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precision, active]);

  const stop = useCallback(() => {
    setActive(false);
    clearWatch();
  }, []);

  const reset = useCallback(() => {
    lastKeptRef.current = null;
    setPoints([]);
    setDistanceM(0);
  }, []);

  const toGeoJSON = useCallback(() => {
    if (!points || points.length < 2) return null;
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: points.map(p => [p.lng, p.lat]),
      },
      properties: { points, distance_m: distanceM },
    };
  }, [points, distanceM]);

  // pauză dacă tab-ul devine hidden (opțional: doar avertizăm)
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && active) {
        console.warn('Pesta în fundal — iOS poate opri GPS.');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [active]);

  return {
    active,
    precision, setPrecision,
    points, distanceM,
    start, stop, reset, toGeoJSON,
  };
}