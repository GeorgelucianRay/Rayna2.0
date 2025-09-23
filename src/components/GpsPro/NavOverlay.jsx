// src/components/GpsPro/NavOverlay.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { fromLonLat } from 'ol/proj';
import { Style, Stroke, Circle as CircleStyle, Fill } from 'ol/style';

const containerStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  background: '#0b1220',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle = {
  height: 56,
  padding: '0 12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  color: '#fff',
  borderBottom: '1px solid rgba(255,255,255,.08)',
};

const titleStyle = { fontSize: 16, fontWeight: 600 };
const closeBtnStyle = {
  appearance: 'none',
  background: 'transparent',
  color: '#fff',
  border: '1px solid rgba(255,255,255,.25)',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 14,
};

const footerStyle = {
  padding: 10,
  color: '#fff',
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'linear-gradient(180deg, rgba(11,18,32,0.5) 0%, rgba(11,18,32,1) 70%)',
  borderTop: '1px solid rgba(255,255,255,.08)',
};

const pillStyle = {
  padding: '6px 10px',
  borderRadius: 10,
  background: 'rgba(255,255,255,.08)',
  fontSize: 13,
};

// ===== Helpers geo  =====

// Equirectangular approx (bun pentru distanțe scurte)
function dist2(lon1, lat1, lon2, lat2) {
  const x = (lon2 - lon1) * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  const y = (lat2 - lat1);
  return x * x + y * y; // în „grade pătrate”
}

// Proiecția punctului P pe segment AB (lon/lat), returnează t în [0..1] și coordonate
function projectOnSegment(a, b, p) {
  const [ax, ay] = a, [bx, by] = b, [px, py] = p;
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const vv = vx * vx + vy * vy || 1e-9;
  let t = (wx * vx + wy * vy) / vv;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return [ax + t * vx, ay + t * vy, t];
}

// Caută cel mai apropiat punct pe linie și segmentul (index) pentru coords = [[lon,lat]...]
function closestOnPolyline(coords, pLon, pLat) {
  if (!coords || coords.length < 2) return null;
  let best = null;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const [x, y, t] = projectOnSegment(a, b, [pLon, pLat]);
    const d2 = dist2(x, y, pLon, pLat);
    if (!best || d2 < best.d2) best = { i, t, coord: [x, y], d2 };
  }
  return best; // { i, t, coord:[lon,lat], d2 }
}

// Extrage primul LineString (sau concatenează) dintr-un FeatureCollection
function extractRouteCoords(geojson) {
  try {
    const f = (geojson?.features || []).find(
      (ft) =>
        (ft.geometry?.type === 'LineString' && Array.isArray(ft.geometry.coordinates)) ||
        (ft.geometry?.type === 'MultiLineString' && Array.isArray(ft.geometry.coordinates))
    );
    if (!f) return [];
    if (f.geometry.type === 'LineString') return f.geometry.coordinates.slice();
    // MultiLineString → concatenăm liniile
    const out = [];
    for (const line of f.geometry.coordinates) {
      for (const c of line) out.push(c);
    }
    return out;
  } catch {
    return [];
  }
}

// Decupează traseul rămas de la „closest” (poate fi între puncte) până la final
function sliceRemaining(coords, closest) {
  if (!closest || !coords?.length) return [];
  const { i, t, coord } = closest;
  const out = [coord];
  // dacă t>0, înseamnă că suntem pe segmentul [i,i+1]; începem după punctul proiectat
  for (let k = i + 1; k < coords.length; k++) out.push(coords[k]);
  return out;
}

// Suma lungimii pentru coords (equirectangular → aproximare; suficient pentru ETA UI)
function approxLengthKm(coords) {
  if (!coords || coords.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i], b = coords[i + 1];
    // factor ~111km/grad
    const d = Math.sqrt(dist2(a[0], a[1], b[0], b[1])) * 111;
    sum += d;
  }
  return sum;
}

// ===== Componenta principală =====

export default function NavOverlay({ title, geojson, onClose }) {
  // Gărzi anti ecran alb
  const valid = geojson && geojson.type === 'FeatureCollection' && Array.isArray(geojson.features) && geojson.features.length > 0;
  const routeCoords = useMemo(() => (valid ? extractRouteCoords(geojson) : []), [valid, geojson]);

  const mapDiv = useRef(null);
  const mapRef = useRef(null);
  const routeLayerRef = useRef(null);
  const remainLayerRef = useRef(null);
  const meLayerRef = useRef(null);

  const [remainKm, setRemainKm] = useState(0);
  const [gpsOn, setGpsOn] = useState(false);
  const [offRoute, setOffRoute] = useState(false);

  // Inițializează harta
  useEffect(() => {
    if (!mapDiv.current) return;
    if (!routeCoords.length) return;

    // Map + OSM
    const map = new Map({
      target: mapDiv.current,
      layers: [new TileLayer({ source: new OSM() })],
      view: new View({
        center: fromLonLat(routeCoords[0]),
        zoom: 14,
      }),
    });
    mapRef.current = map;

    // Stratul întregii rute (gri)
    const routeSrc = new VectorSource();
    const routeLayer = new VectorLayer({
      source: routeSrc,
      style: new Style({
        stroke: new Stroke({ color: 'rgba(255,255,255,0.35)', width: 6 }),
      }),
    });
    map.addLayer(routeLayer);
    routeLayerRef.current = routeLayer;

    // Stratul „remaining” (albastru)
    const remainSrc = new VectorSource();
    const remainLayer = new VectorLayer({
      source: remainSrc,
      style: new Style({
        stroke: new Stroke({ color: '#3fb0ff', width: 6 }),
      }),
    });
    map.addLayer(remainLayer);
    remainLayerRef.current = remainLayer;

    // Marker „eu”
    const meSrc = new VectorSource();
    const meLayer = new VectorLayer({
      source: meSrc,
      style: new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: '#3fb0ff' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
        }),
      }),
    });
    map.addLayer(meLayer);
    meLayerRef.current = meLayer;

    // Desenează linia integrală
    const fullLine = new LineString(routeCoords.map((c) => fromLonLat(c)));
    routeSrc.addFeature(new Feature({ geometry: fullLine }));

    // Fit to route
    map.getView().fit(fullLine, { padding: [80, 40, 120, 40], maxZoom: 16, duration: 300 });

    return () => {
      map.setTarget(null);
      mapRef.current = null;
    };
  }, [routeCoords]);

  // Urmărire GPS + snap & decupare
  useEffect(() => {
    if (!routeCoords.length) return;
    let watchId = null;

    function updateWithPosition(pos) {
      const lon = pos.coords.longitude;
      const lat = pos.coords.latitude;

      // snap pe linie
      const closest = closestOnPolyline(routeCoords, lon, lat);
      if (!closest) return;

      // dacă e prea departe de rută (> ~150m), marcăm off-route
      // prag în grade ~ 150m/111km ≈ 0.00135 (equirectangular aprox)
      const tooFar = Math.sqrt(closest.d2) * 111 > 0.15;
      setOffRoute(tooFar);

      // „remaining”
      const rem = sliceRemaining(routeCoords, closest);
      setRemainKm(approxLengthKm(rem));

      // redă pe hartă
      const map = mapRef.current;
      const remainLayer = remainLayerRef.current;
      const meLayer = meLayerRef.current;
      if (!map || !remainLayer || !meLayer) return;

      // actualizează stratul remaining
      const remainSrc = remainLayer.getSource();
      remainSrc.clear();
      if (rem.length >= 2) {
        const ls = new LineString(rem.map((c) => fromLonLat(c)));
        remainSrc.addFeature(new Feature({ geometry: ls }));
      }

      // marker eu
      const meSrc = meLayer.getSource();
      meSrc.clear();
      meSrc.addFeature(new Feature({ geometry: new Point(fromLonLat([lon, lat])) }));

      // center follow
      map.getView().animate({ center: fromLonLat([lon, lat]), zoom: Math.max(15, map.getView().getZoom() || 15), duration: 250 });
    }

    if ('geolocation' in navigator) {
      setGpsOn(true);
      watchId = navigator.geolocation.watchPosition(
        updateWithPosition,
        (err) => {
          console.warn('GPS error', err);
          setGpsOn(false);
        },
        { enableHighAccuracy: true, maximumAge: 1500, timeout: 10000 }
      );
    } else {
      setGpsOn(false);
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [routeCoords]);

  if (!valid || !routeCoords.length) {
    // Pentru orice motiv – nu crăpăm UI
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>{title || 'Navigare'}</div>
          <button style={closeBtnStyle} onClick={onClose}>Închide</button>
        </div>
        <div style={{ color: '#fff', padding: 16 }}>
          Ruta nu este disponibilă sau este invalidă.
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>{title || 'Navigare'}</div>
        <button style={closeBtnStyle} onClick={onClose}>Închide</button>
      </div>

      <div ref={mapDiv} style={{ flex: 1 }} />

      <div style={footerStyle}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={pillStyle}>GPS: {gpsOn ? 'ON' : 'OFF'}</span>
          {offRoute && <span style={{ ...pillStyle, background: 'rgba(255,99,71,.25)', border: '1px solid rgba(255,99,71,.6)' }}>În afara rutei</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={pillStyle}>Rămas: {remainKm.toFixed(1)} km</span>
        </div>
      </div>
    </div>
  );
}