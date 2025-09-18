import { useRef, useState, useCallback } from 'react';

// haversine în metri
function haversine(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// "lat,lng" -> {lat, lng}
export function parseCoords(str) {
  if (!str) return null;
  const [a, b] = String(str).split(',').map((x) => parseFloat(x.trim()));
  if (Number.isFinite(a) && Number.isFinite(b)) return { lat: a, lng: b };
  return null;
}

export default function useRouteRecorder() {
  const [active, setActive] = useState(false);
  const [precision, setPrecision] = useState(false); // false = 20 km, true = 100 m
  const [points, setPoints] = useState([]);          // [{lat, lng, ts}]
  const [distanceM, setDistanceM] = useState(0);
  const watchIdRef = useRef(null);

  const threshold = precision ? 100 : 20000; // metri

  const recalcDistance = useCallback((pts) => {
    if (!pts || pts.length < 2) return 0;
    let d = 0;
    for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i]);
    return Math.round(d);
  }, []);

  const addPointIfNeeded = useCallback((p) => {
    setPoints((prev) => {
      if (prev.length === 0) return [{ ...p, ts: Date.now() }];
      const last = prev[prev.length - 1];
      const d = haversine(last, p);
      if (d >= threshold) return [...prev, { ...p, ts: Date.now() }];
      return prev;
    });
  }, [threshold]);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      alert('La geolocalización no es compatible con este navegador.');
      return;
    }
    setPoints([]); setDistanceM(0); setActive(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => addPointIfNeeded({ lat: coords.latitude, lng: coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const p = { lat: coords.latitude, lng: coords.longitude };
        setPoints((prev) => {
          const next = prev.length === 0 || haversine(prev[prev.length - 1], p) >= threshold
            ? [...prev, { ...p, ts: Date.now() }]
            : prev;
          setDistanceM(recalcDistance(next));
          return next;
        });
      },
      (err) => console.warn('watchPosition error:', err),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }, [addPointIfNeeded, recalcDistance, threshold]);

  const stop = useCallback(() => {
    setActive(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setDistanceM((prev) => recalcDistance(points));
  }, [points, recalcDistance]);

  const reset = useCallback(() => {
    setActive(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setPoints([]); setDistanceM(0);
  }, []);

  const toGeoJSON = useCallback(() => {
    if (points.length < 2) return null;
    return { type: 'LineString', coordinates: points.map((p) => [p.lng, p.lat]) };
  }, [points]);

  return {
    active,
    precision, setPrecision,
    points, distanceM,
    start, stop, reset,
    toGeoJSON
  };
}