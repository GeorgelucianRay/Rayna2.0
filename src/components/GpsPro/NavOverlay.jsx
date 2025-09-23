// src/components/GpsPro/NavOverlay.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-geometryutil'; // Importăm pachetul ajutător

// Repară problema iconițelor default din Leaflet cu bundlere moderne
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;


// ===== Stiluri (rămân la fel) =====
const containerStyle = { position: 'fixed', inset: 0, zIndex: 9999, background: '#0b1220', display: 'flex', flexDirection: 'column' };
const headerStyle = { height: 56, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', borderBottom: '1px solid rgba(255,255,255,.08)' };
const titleStyle = { fontSize: 16, fontWeight: 600 };
const closeBtnStyle = { appearance: 'none', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.25)', borderRadius: 8, padding: '6px 10px', fontSize: 14 };
const footerStyle = { padding: 10, color: '#fff', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(180deg, rgba(11,18,32,0.5) 0%, rgba(11,18,32,1) 70%)', borderTop: '1px solid rgba(255,255,255,.08)' };
const pillStyle = { padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,.08)', fontSize: 13 };

// ===== Helpers (adaptate pentru Leaflet) =====

// Extrage coordonatele [lat, lon] din GeoJSON (Leaflet folosește [lat, lon])
function extractRouteCoords(geojson) {
  try {
    const feature = (geojson?.features || []).find(
      (ft) => ft.geometry?.type === 'LineString' || ft.geometry?.type === 'MultiLineString'
    );
    if (!feature) return [];
    
    const coords = feature.geometry.coordinates;
    // Leaflet vrea [lat, lon], GeoJSON are [lon, lat]. Inversăm.
    if (feature.geometry.type === 'LineString') {
        return coords.map(c => [c[1], c[0]]);
    }
    // MultiLineString
    const out = [];
    for (const line of coords) {
        for (const c of line) out.push([c[1], c[0]]);
    }
    return out;
  } catch {
    return [];
  }
}

// Calculează lungimea unei polilinii (în km)
function calculatePolylineLengthKm(latLngs) {
    let totalDistance = 0;
    if (!latLngs || latLngs.length < 2) return 0;
    for (let i = 0; i < latLngs.length - 1; i++) {
        totalDistance += latLngs[i].distanceTo(latLngs[i + 1]);
    }
    return totalDistance / 1000;
}


// ===== Componenta principală (rescrisă cu Leaflet) =====

export default function NavOverlay({ title, geojson, onClose }) {
  const valid = geojson && geojson.type === 'FeatureCollection' && Array.isArray(geojson.features);
  // Coordonatele sunt acum în format [lat, lon]
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
    if (!mapDiv.current || !routeCoords.length || mapRef.current) return;

    // Creăm harta Leaflet
    const map = L.map(mapDiv.current).setView(routeCoords[0], 14);
    mapRef.current = map;

    // Adăugăm stratul de la OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Stratul întregii rute (gri)
    const fullRoute = L.polyline(routeCoords, { color: 'rgba(255,255,255,0.35)', weight: 6 }).addTo(map);
    routeLayerRef.current = fullRoute;

    // Zoom pentru a încadra toată ruta
    map.fitBounds(fullRoute.getBounds(), { padding: [40, 40] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [routeCoords]);

  // Urmărire GPS
  useEffect(() => {
    if (!routeCoords.length || !mapRef.current) return;
    let watchId = null;
    const map = mapRef.current;

    function updateWithPosition(pos) {
      const userLatLng = L.latLng(pos.coords.latitude, pos.coords.longitude);

      // Găsim cel mai apropiat punct pe rută folosind 'leaflet-geometryutil'
      const closestPointResult = L.GeometryUtil.closest(map, routeLayerRef.current, userLatLng);
      if (!closestPointResult) return;

      const closestLatLng = closestPointResult.latlng;
      const closestIndex = closestPointResult.predecessor;

      // Verificăm dacă suntem prea departe de rută (> 150m)
      const distanceToRoute = userLatLng.distanceTo(closestLatLng);
      setOffRoute(distanceToRoute > 150);

      // Decupăm traseul rămas
      const remainingCoords = [closestLatLng, ...routeCoords.slice(closestIndex + 1)];
      const remainingLatLngs = remainingCoords.map(c => L.latLng(c));
      
      setRemainKm(calculatePolylineLengthKm(remainingLatLngs));

      // Actualizăm stratul "remaining" (albastru)
      if (!remainLayerRef.current) {
        remainLayerRef.current = L.polyline(remainingLatLngs, { color: '#3fb0ff', weight: 6 }).addTo(map);
      } else {
        remainLayerRef.current.setLatLngs(remainingLatLngs);
      }

      // Actualizăm marker-ul "eu"
      if (!meLayerRef.current) {
        const customIcon = L.divIcon({
            className: 'custom-gps-marker',
            html: `<div style="background-color:#3fb0ff; width:12px; height:12px; border-radius:50%; border: 2px solid #fff;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        meLayerRef.current = L.marker(userLatLng, { icon: customIcon }).addTo(map);
      } else {
        meLayerRef.current.setLatLng(userLatLng);
      }

      // Centram harta pe utilizator
      map.setView(userLatLng, Math.max(15, map.getZoom()), { animate: true, pan: { duration: 0.5 } });
    }

    if ('geolocation' in navigator) {
      setGpsOn(true);
      watchId = navigator.geolocation.watchPosition(
        updateWithPosition,
        (err) => { console.warn('GPS error', err); setGpsOn(false); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 1500 }
      );
    } else {
      setGpsOn(false);
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [routeCoords]);

  if (!valid || !routeCoords.length) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>{title || 'Navigare'}</div>
          <button style={closeBtnStyle} onClick={onClose}>Închide</button>
        </div>
        <div style={{ color: '#fff', padding: 16 }}>Ruta nu este disponibilă sau este invalidă.</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>{title || 'Navigare'}</div>
        <button style={closeBtnStyle} onClick={onClose}>Închide</button>
      </div>
      <div ref={mapDiv} style={{ flex: 1, backgroundColor: '#0b1220' }} />
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
