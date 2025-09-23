// src/components/GpsPro/NavOverlay.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ---------- UI inline ----------
const wrap = { position:'fixed', inset:0, zIndex:9999, background:'#0b1220', display:'flex', flexDirection:'column' };
const header = { height:56, padding:'0 12px', display:'flex', alignItems:'center', justifyContent:'space-between',
  color:'#fff', borderBottom:'1px solid rgba(255,255,255,.08)' };
const titleSt = { fontSize:16, fontWeight:600 };
const closeBtn = { background:'transparent', color:'#fff', border:'1px solid rgba(255,255,255,.25)', borderRadius:8,
  padding:'6px 10px', fontSize:14, cursor:'pointer' };
const footer = { padding:10, color:'#fff', display:'flex', gap:10, alignItems:'center', justifyContent:'space-between',
  background:'linear-gradient(180deg, rgba(11,18,32,0.5) 0%, rgba(11,18,32,1) 70%)', borderTop:'1px solid rgba(255,255,255,.08)' };
const pill = { padding:'6px 10px', borderRadius:10, background:'rgba(255,255,255,.08)', fontSize:13 };

// ---------- Geo helpers (lucrează în [lon,lat]) ----------
function dist2(lon1, lat1, lon2, lat2) {
  const x = (lon2 - lon1) * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  const y = (lat2 - lat1);
  return x * x + y * y; // grade^2
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
  return best; // { i, t, coord:[lon,lat], d2 }
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

export default function NavOverlay({ title, geojson, onClose }) {
  const valid = geojson && geojson.type === 'FeatureCollection' && Array.isArray(geojson.features) && geojson.features.length > 0;
  // Coordonate din GeoJSON în [lon,lat]
  const routeLonLat = useMemo(() => (valid ? extractRouteCoords(geojson) : []), [valid, geojson]);
  // Pentru Leaflet trebuie [lat,lon]
  const routeLatLng = useMemo(() => routeLonLat.map(([lon, lat]) => [lat, lon]), [routeLonLat]);

  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const fullRef = useRef(null);
  const remainRef = useRef(null);
  const meRef = useRef(null);

  const [remainKm, setRemainKm] = useState(0);
  const [gpsOn, setGpsOn] = useState(false);
  const [offRoute, setOffRoute] = useState(false);

  // Init hartă
  useEffect(() => {
    if (!mapEl.current) return;
    if (!routeLatLng.length) return;

    const map = L.map(mapEl.current, {
      center: routeLatLng[0],
      zoom: 14,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    // Traseu complet (gri)
    const full = L.polyline(routeLatLng, { color:'#ffffff', opacity:0.35, weight:6 }).addTo(map);
    fullRef.current = full;

    // Traseu rămas (albastru)
    const remain = L.polyline([], { color:'#3fb0ff', weight:6 }).addTo(map);
    remainRef.current = remain;

    // Marker „eu”
    const me = L.circleMarker(routeLatLng[0], { radius:6, color:'#fff', weight:2, fillColor:'#3fb0ff', fillOpacity:1 }).addTo(map);
    meRef.current = me;

    map.fitBounds(full.getBounds(), { padding:[80,40], maxZoom:16 });

    return () => {
      map.remove();
      mapRef.current = null;
      fullRef.current = null;
      remainRef.current = null;
      meRef.current = null;
    };
  }, [routeLatLng]);

  // GPS tracking + snap + remaining
  useEffect(() => {
    if (!routeLonLat.length) return;
    let watchId = null;

    const onPos = (pos) => {
      try {
        const lon = pos.coords.longitude;
        const lat = pos.coords.latitude;

        const closest = closestOnPolyline(routeLonLat, lon, lat);
        if (!closest) return;

        // >150m = off-route
        const tooFar = Math.sqrt(closest.d2) * 111 > 0.15;
        setOffRoute(tooFar);

        const rem = sliceRemaining(routeLonLat, closest);
        setRemainKm(approxLengthKm(rem));

        const remLatLng = rem.map(([LON, LAT]) => [LAT, LON]);

        const map = mapRef.current;
        const remain = remainRef.current;
        const me = meRef.current;
        if (!map || !remain || !me) return;

        remain.setLatLngs(remLatLng);
        me.setLatLng([lat, lon]);
        map.panTo([lat, lon], { animate:true, duration:0.25 });
      } catch (e) {
        // nu aruncăm, evităm ecran alb
        console.warn('GPS update error:', e);
      }
    };

    if ('geolocation' in navigator) {
      setGpsOn(true);
      watchId = navigator.geolocation.watchPosition(
        onPos,
        (err) => { console.warn('GPS error:', err); setGpsOn(false); },
        { enableHighAccuracy:true, maximumAge:1500, timeout:10000 }
      );
    } else {
      setGpsOn(false);
    }
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [routeLonLat]);

  if (!valid || !routeLatLng.length) {
    return (
      <div style={wrap}>
        <div style={header}>
          <div style={titleSt}>{title || 'Navigare'}</div>
          <button style={closeBtn} onClick={onClose}>Închide</button>
        </div>
        <div style={{ color:'#fff', padding:16 }}>Ruta nu este disponibilă sau este invalidă.</div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={header}>
        <div style={titleSt}>{title || 'Navigare'}</div>
        <button style={closeBtn} onClick={onClose}>Închide</button>
      </div>
      <div ref={mapEl} style={{ flex:1 }} />
      <div style={footer}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={pill}>GPS: {gpsOn ? 'ON' : 'OFF'}</span>
          {offRoute && <span style={{ ...pill, background:'rgba(255,99,71,.25)', border:'1px solid rgba(255,99,71,.6)' }}>În afara rutei</span>}
        </div>
        <div><span style={pill}>Rămas: {remainKm.toFixed(1)} km</span></div>
      </div>
    </div>
  );
}