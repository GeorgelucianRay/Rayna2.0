import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/** ========= UI styles (inline, fără CSS extern) ========= */
const Z = 2147483000;
const Wrap = {
  position: 'fixed', inset: 0, zIndex: Z, background: '#0b1220', overflow: 'hidden'
};
const mapBox = { position: 'absolute', inset: 0 };
const TopBar = {
  position: 'absolute', left: 0, right: 0, top: 0, zIndex: Z + 2,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: 'calc(env(safe-area-inset-top,0px) + 8px) 10px 8px 10px',
  background: 'linear-gradient(180deg, rgba(11,18,32,.95) 0%, rgba(11,18,32,.55) 70%, rgba(11,18,32,0) 100%)',
  color: '#fff'
};
const Title = { fontWeight: 700, fontSize: 16, textShadow: '0 1px 2px rgba(0,0,0,.6)' };
const Btn = {
  background: 'rgba(255,255,255,.12)', color:'#fff', border:'1px solid rgba(255,255,255,.25)',
  borderRadius: 10, padding: '8px 12px', fontSize: 14, cursor: 'pointer'
};
const BtnGhost = { ...Btn };
const BtnPrimary = { ...Btn, background: '#2563eb', borderColor: '#1d4ed8' };
const FabCol = {
  position: 'absolute', right: 10, bottom: 'calc(env(safe-area-inset-bottom,0px) + 12px)',
  display: 'flex', flexDirection: 'column', gap: 10, zIndex: Z + 2
};
const InfoRow = {
  position: 'absolute', left: 10, bottom: 'calc(env(safe-area-inset-bottom,0px) + 12px)',
  display: 'flex', gap: 8, zIndex: Z + 2
};
const Pill = {
  background: 'rgba(255,255,255,.14)', color:'#fff', border:'1px solid rgba(255,255,255,.25)',
  borderRadius: 999, padding: '6px 10px', fontSize: 13
};

/** ========= Helpers (coords în [lon,lat]) ========= */
function dist2(lon1, lat1, lon2, lat2) {
  const x = (lon2 - lon1) * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  const y = (lat2 - lat1);
  return x * x + y * y;
}
function projectOnSegment(a, b, p) {
  const [ax, ay] = a, [bx, by] = b, [px, py] = p;
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const vv = vx * vx + vy * vy || 1e-9;
  let t = (wx * vx + wy * vy) / vv;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  return [ax + t * vx, ay + t * vy, t];
}
function closestOnPolyline(coords, pLon, pLat) {
  if (!coords || coords.length < 2) return null;
  let best = null;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i], b = coords[i + 1];
    const [x, y, t] = projectOnSegment(a, b, [pLon, pLat]);
    const d2 = dist2(x, y, pLon, pLat);
    if (!best || d2 < best.d2) best = { i, t, coord:[x,y], d2 };
  }
  return best;
}
function sliceRemaining(coords, closest) {
  if (!closest || !coords?.length) return [];
  const { i, coord } = closest;
  const out = [coord];
  for (let k = i + 1; k < coords.length; k++) out.push(coords[k]);
  return out;
}
function approxLengthKm(coords) {
  if (!coords || coords.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i], b = coords[i + 1];
    sum += Math.sqrt(dist2(a[0], a[1], b[0], b[1])) * 111;
  }
  return sum;
}
function extractRouteCoords(geojson) {
  try {
    const f = (geojson?.features || []).find(
      (ft) =>
        (ft.geometry?.type === 'LineString' && Array.isArray(ft.geometry.coordinates)) ||
        (ft.geometry?.type === 'MultiLineString' && Array.isArray(ft.geometry.coordinates))
    );
    if (!f) return [];
    if (f.geometry.type === 'LineString') return f.geometry.coordinates.slice();
    const out = [];
    for (const line of f.geometry.coordinates) for (const c of line) out.push(c);
    return out;
  } catch { return []; }
}

export default function NavOverlay({ title, geojson, onClose }) {
  // acceptă și string din DB
  const parsed = useMemo(() => {
    if (!geojson) return null;
    if (typeof geojson === 'string') {
      try { return JSON.parse(geojson); } catch { return null; }
    }
    return geojson;
  }, [geojson]);

  const valid = parsed && parsed.type === 'FeatureCollection' && Array.isArray(parsed.features) && parsed.features.length > 0;
  const routeLonLat = useMemo(() => (valid ? extractRouteCoords(parsed) : []), [valid, parsed]);
  const routeLatLng = useMemo(() => routeLonLat.map(([lon, lat]) => [lat, lon]), [routeLonLat]);

  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const fullRef = useRef(null);
  const remainRef = useRef(null);
  const meRef = useRef(null);
  const startRef = useRef(null);
  const endRef = useRef(null);

  const [remainKm, setRemainKm] = useState(0);
  const [gpsOn, setGpsOn] = useState(false);
  const [running, setRunning] = useState(false);
  const [offRoute, setOffRoute] = useState(false);

  // ====== init Leaflet + layere
  useEffect(() => {
    if (!mapEl.current || !routeLatLng.length) return;

    const map = L.map(mapEl.current, { zoomControl: true, center: routeLatLng[0], zoom: 14 });
    mapRef.current = map;

    // tiles OSM
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    // markers start / end
    startRef.current = L.circleMarker(routeLatLng[0], { radius: 7, color:'#22c55e', weight:3, fillColor:'#22c55e', fillOpacity:.8 }).addTo(map);
    endRef.current   = L.circleMarker(routeLatLng[routeLatLng.length - 1], { radius: 7, color:'#ef4444', weight:3, fillColor:'#ef4444', fillOpacity:.8 }).addTo(map);

    // traseu complet + rămas
    fullRef.current = L.polyline(routeLatLng, { color:'#d1d5db', weight:8, opacity:.9 }).addTo(map);
    remainRef.current = L.polyline([], { color:'#3b82f6', weight:8 }).addTo(map);

    // marker „eu”
    meRef.current = L.circleMarker(routeLatLng[0], { radius:6, color:'#fff', weight:2, fillColor:'#3b82f6', fillOpacity:1 }).addTo(map);

    map.fitBounds(fullRef.current.getBounds(), { padding:[90,40], maxZoom:16 });

    return () => { map.remove(); };
  }, [routeLatLng]);

  // ====== GPS watch (doar când e „running”)
  useEffect(() => {
    if (!routeLonLat.length) return;
    let watchId = null;

    if (running && 'geolocation' in navigator) {
      setGpsOn(true);
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lon = pos.coords.longitude;
          const lat = pos.coords.latitude;

          const closest = closestOnPolyline(routeLonLat, lon, lat);
          if (!closest) return;

          const tooFar = Math.sqrt(closest.d2) * 111 > 0.15; // >150 m de traseu
          setOffRoute(tooFar);

          const rem = sliceRemaining(routeLonLat, closest);
          setRemainKm(approxLengthKm(rem));
          const remLatLng = rem.map(([LON, LAT]) => [LAT, LON]);

          const map = mapRef.current;
          const me = meRef.current;
          const remain = remainRef.current;
          if (!map || !me || !remain) return;

          me.setLatLng([lat, lon]);
          remain.setLatLngs(remLatLng);

          // urmează poziția (ca pe Maps)
          map.panTo([lat, lon], { animate: true });
        },
        (err) => { console.warn('GPS error', err); setGpsOn(false); },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 }
      );
    } else {
      setGpsOn(false);
    }

    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [running, routeLonLat]);

  const fitAll = () => {
    const map = mapRef.current, full = fullRef.current;
    if (map && full) map.fitBounds(full.getBounds(), { padding:[90,40], maxZoom:16 });
  };
  const centerMe = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude:lat, longitude:lon } = pos.coords;
        const map = mapRef.current, me = meRef.current;
        if (map && me) { me.setLatLng([lat, lon]); map.setView([lat, lon], Math.max(map.getZoom(), 15)); }
      },
      () => {},
      { enableHighAccuracy:true, maximumAge:0, timeout:8000 }
    );
  };

  if (!valid || !routeLatLng.length) {
    return (
      <div style={Wrap}>
        <div style={TopBar}>
          <div style={Title}>{title || 'Navigare'}</div>
          <button style={BtnGhost} onClick={onClose}>Închide</button>
        </div>
        <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center', color:'#fff' }}>
          Ruta nu este disponibilă sau este invalidă.
        </div>
      </div>
    );
  }

  return (
    <div style={Wrap}>
      {/* bara de sus */}
      <div style={TopBar}>
        <div style={Title}>{title || 'Navigare'}</div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={BtnGhost} onClick={fitAll}>Potrivește traseu</button>
          <button style={BtnGhost} onClick={onClose}>Închide</button>
        </div>
      </div>

      {/* harta */}
      <div ref={mapEl} style={mapBox} />

      {/* info jos-stânga */}
      <div style={InfoRow}>
        <span style={Pill}>GPS: {gpsOn ? 'ON' : 'OFF'}</span>
        <span style={Pill}>Rămas: {remainKm.toFixed(1)} km</span>
        {offRoute && <span style={{ ...Pill, background:'rgba(255,99,71,.25)', border:'1px solid rgba(255,99,71,.55)' }}>În afara rutei</span>}
      </div>

      {/* butoane flotante jos-dreapta */}
      <div style={FabCol}>
        <button
          style={running ? BtnGhost : BtnPrimary}
          onClick={() => setRunning(v => !v)}
          title={running ? 'Oprește navigarea' : 'Pornește navigarea'}
        >
          {running ? '⏹ Oprește' : '▶ Pornește'}
        </button>
        <button style={BtnGhost} onClick={centerMe}>Centrează pe mine</button>
      </div>
    </div>
  );
}