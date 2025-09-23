// src/components/GpsPro/NavOverlay.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// marker mic tip “blue dot”
const meIcon = new L.DivIcon({
  className: '',
  html: `
    <div style="
      width:16px;height:16px;border-radius:50%;
      background:#3aa0ff;border:3px solid #fff;box-shadow:0 0 8px rgba(0,0,0,.35);
    "></div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// ===== helpers =====
function toLatLngsFromGeoJSON(geojson) {
  const gj = typeof geojson === 'string' ? JSON.parse(geojson) : geojson;
  if (!gj) return [];

  const lines = [];

  const pushCoords = (coords) => {
    // coords: [[lon,lat], ...]
    lines.push(coords.map(([lon, lat]) => [lat, lon]));
  };

  if (gj.type === 'FeatureCollection') {
    gj.features?.forEach((f) => {
      const g = f?.geometry;
      if (!g) return;
      if (g.type === 'LineString') pushCoords(g.coordinates);
      if (g.type === 'MultiLineString') g.coordinates.forEach(pushCoords);
    });
  } else if (gj.type === 'Feature') {
    const g = gj.geometry;
    if (g?.type === 'LineString') pushCoords(g.coordinates);
    if (g?.type === 'MultiLineString') g.coordinates.forEach(pushCoords);
  } else if (gj.type === 'LineString') {
    pushCoords(gj.coordinates);
  } else if (gj.type === 'MultiLineString') {
    gj.coordinates.forEach(pushCoords);
  }

  // îmbinăm toate segmentele într-o singură polilinie (simplu)
  return lines.flat();
}

function distMeters(a, b) {
  const toRad = (t) => (t * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function nearestIndexOnRoute(pos, routeLatLngs) {
  if (!pos || !routeLatLngs?.length) return 0;
  let bestI = 0;
  let bestD = Infinity;
  for (let i = 0; i < routeLatLngs.length; i++) {
    const d = distMeters([pos.lat, pos.lng], routeLatLngs[i]);
    if (d < bestD) { bestD = d; bestI = i; }
  }
  return bestI;
}

function FitOnInit({ latlngs }) {
  const map = useMap();
  useEffect(() => {
    if (latlngs?.length) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24] });
    }
  }, [map, latlngs]);
  return null;
}

// ===== component =====
export default function NavOverlay({ title = 'Ruta', geojson, onClose }) {
  const routeLatLngs = useMemo(() => toLatLngsFromGeoJSON(geojson), [geojson]);

  const [following, setFollowing] = useState(true);
  const [me, setMe] = useState(null);             // {lat,lng,heading?,speed?}
  const watchIdRef = useRef(null);
  const mapRef = useRef(null);
  const [startIdx, setStartIdx] = useState(0);

  // pornește GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      alert('Geolocația nu este disponibilă pe acest dispozitiv.');
      return;
    }
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, heading, speed } = pos.coords || {};
          const fix = { lat: latitude, lng: longitude, heading, speed };
          setMe(fix);

          // când vine primul fix -> alege cel mai apropiat punct de rută
          if (routeLatLngs.length && startIdx === 0) {
            const idx = nearestIndexOnRoute(fix, routeLatLngs);
            setStartIdx(idx);
          }

          if (following && mapRef.current) {
            mapRef.current.setView([latitude, longitude], Math.max(mapRef.current.getZoom(), 15), {
              animate: false,
            });
          }
        },
        (err) => console.warn('GPS error:', err?.message || err),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
      );
    } catch (e) {
      console.warn('Geolocation error', e);
    }
    return () => {
      const id = watchIdRef.current;
      if (id !== null) {
        try { navigator.geolocation.clearWatch(id); } catch {}
      }
    };
  }, [following, routeLatLngs, startIdx]);

  // culoare rută
  const routeColor = '#7A86FF';

  // UI – stiluri inline ca să nu depindem de CSS extra
  const headerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: 'white',
    zIndex: 5000,
    pointerEvents: 'none',
  };
  const pillStyle = {
    background: 'rgba(0,0,0,.55)',
    backdropFilter: 'blur(4px)',
    borderRadius: 12,
    padding: '6px 10px',
    fontSize: 14,
    lineHeight: '18px',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };
  const btnStyle = {
    background: 'rgba(0,0,0,.65)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,.2)',
    borderRadius: 10,
    padding: '8px 10px',
    fontSize: 14,
    lineHeight: '16px',
    cursor: 'pointer',
  };

  const centerMe = () => {
    if (!me || !mapRef.current) return;
    mapRef.current.setView([me.lat, me.lng], Math.max(mapRef.current.getZoom(), 16), { animate: true });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 4000, background: '#000'
    }}>
      {/* HEADER */}
      <div style={headerStyle}>
        <div style={pillStyle}>
          <strong style={{ fontWeight: 700 }}>{title}</strong>
        </div>
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <button style={btnStyle} onClick={() => setFollowing((f) => !f)}>
            {following ? 'Stop' : 'Start'}
          </button>
          <button style={btnStyle} onClick={centerMe}>Centrează</button>
          <button style={{ ...btnStyle, background: '#d33' }} onClick={onClose}>Închide</button>
        </div>
      </div>

      {/* MAPA */}
      <MapContainer
        ref={(ref) => (mapRef.current = ref)}
        style={{ position: 'absolute', inset: 0 }}
        center={routeLatLngs[0] || [41.39, 2.17]}
        zoom={13}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* RUTA */}
        {routeLatLngs.length > 0 && (
          <>
            <Polyline
              positions={routeLatLngs}
              pathOptions={{ color: routeColor, weight: 10, opacity: 0.35 }}
            />
            <Polyline
              positions={routeLatLngs}
              pathOptions={{ color: routeColor, weight: 4, opacity: 0.9 }}
            />
            <FitOnInit latlngs={routeLatLngs} />
          </>
        )}

        {/* ME */}
        {me && <Marker position={[me.lat, me.lng]} icon={meIcon} />}

        {/* (opțional) progres de la startIdx până la poziția cea mai apropiată */}
        {me && routeLatLngs.length > 1 && (() => {
          const curIdx = nearestIndexOnRoute(me, routeLatLngs);
          const a = Math.min(startIdx, curIdx);
          const b = Math.max(startIdx, curIdx);
          const slice = routeLatLngs.slice(a, b + 1);
          return slice.length > 1 ? (
            <Polyline positions={slice} pathOptions={{ color: '#25c59e', weight: 6, opacity: 0.9 }} />
          ) : null;
        })()}
      </MapContainer>
    </div>
  );
}