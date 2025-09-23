// src/components/GpsPro/map/MapPanelCore.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// IMPORTANT: ai nevoie de CSS-ul Leaflet undeva global (index.html sau main CSS):
// <link
//  rel="stylesheet"
//  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
//  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
//  crossOrigin=""
// />

// icon fix pt. Leaflet pe bundlere moderne
const defaultIcon = new L.Icon({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

const WRAP_STYLE = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  background: '#0b1320',
  display: 'flex',
  flexDirection: 'column',
};

const TOPBAR_STYLE = {
  position: 'absolute',
  top: 8,
  left: 8,
  right: 8,
  zIndex: 1000,
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  justifyContent: 'space-between',
  pointerEvents: 'none',
};

const BTN_ROW_STYLE = {
  display: 'flex',
  gap: 8,
  pointerEvents: 'auto',
  flexWrap: 'wrap',
};

const BTN_STYLE = {
  appearance: 'none',
  border: '1px solid #2c3f66',
  background: 'rgba(15,25,45,.9)',
  color: 'white',
  padding: '10px 12px',
  borderRadius: 10,
  fontSize: 14,
  lineHeight: 1,
  cursor: 'pointer',
  backdropFilter: 'blur(6px)',
};

const BADGE_STYLE = {
  pointerEvents: 'auto',
  border: '1px solid #2c3f66',
  background: 'rgba(15,25,45,.85)',
  color: '#9fc4ff',
  padding: '8px 10px',
  borderRadius: 10,
  fontSize: 13,
};

const FOOTER_STYLE = {
  position: 'absolute',
  bottom: 8,
  left: 8,
  right: 8,
  zIndex: 1000,
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  justifyContent: 'space-between',
  pointerEvents: 'none',
};

const INFO_STYLE = {
  ...BADGE_STYLE,
};

const SAMPLING_STEPS = [80, 100, 200, 500, 1000]; // metri

function haversine(a, b) {
  const R = 6371000; // Earth radius (m)
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Centrează harta pe coord. date */
function FlyTo({ center, zoom = 16 }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.flyTo(center, zoom, { animate: true, duration: 0.6 });
  }, [center, zoom, map]);
  return null;
}

export default function MapPanelCore({
  // compat props vechi
  client,
  destination,
  autoStart = false,
  onClose,

  // extensii moderne
  subject, // {type,id,label,coords?} – dacă există, e preferat față de client
  onSaveSegment, // (payload) => void | Promise<void>
}) {
  const subj = subject || (client ? {
    type: client._subject?.type || 'custom',
    id: client._subject?.id || client.id,
    label: client._subject?.label || client.nombre || 'Subiect',
    coords: client._subject?.coords || client.coordenadas || null,
  } : null);

  const [watchId, setWatchId] = useState(null);
  const [hasPermission, setHasPermission] = useState(null); // null/true/false
  const [gpsError, setGpsError] = useState(null);

  const [isRecording, setIsRecording] = useState(!!autoStart);
  const [points, setPoints] = useState([]); // [{lat,lng,ts}]
  const [distance, setDistance] = useState(0); // m
  const [samplingIdx, setSamplingIdx] = useState(1); // pornește la 100m
  const samplingThreshold = SAMPLING_STEPS[samplingIdx];

  const [center, setCenter] = useState(
    // dacă avem coordonate la subiect, centrează inițial acolo
    subj?.coords
      ? strToLatLng(subj.coords) || null
      : null
  );

  function strToLatLng(str) {
    if (!str || typeof str !== 'string') return null;
    const parts = str.split(',').map(s => s.trim());
    if (parts.length !== 2) return null;
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  }

  // schimbă sampling din mers
  const cycleSampling = useCallback(() => {
    setSamplingIdx((i) => (i + 1) % SAMPLING_STEPS.length);
  }, []);

  // adaugă punct respectând sampling-ul
  const pushPoint = useCallback((p) => {
    setPoints((prev) => {
      if (prev.length === 0) return [p];

      const last = prev[prev.length - 1];
      const d = haversine(last, p);
      if (d < samplingThreshold) return prev; // prea aproape – skip

      return [...prev, p];
    });
  }, [samplingThreshold]);

  // calc distanță când se schimbă punctele
  useEffect(() => {
    if (points.length < 2) return setDistance(0);
    let d = 0;
    for (let i = 1; i < points.length; i += 1) {
      d += haversine(points[i - 1], points[i]);
    }
    setDistance(d);
  }, [points]);

  // pornește/închide watchPosition
  useEffect(() => {
    if (!navigator.geolocation) {
      setHasPermission(false);
      setGpsError('Geolocația nu este disponibilă în acest browser.');
      return;
    }

    if (!isRecording && watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      return;
    }

    if (isRecording && !watchId) {
      try {
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            setHasPermission(true);
            setGpsError(null);
            const { latitude, longitude } = pos.coords;
            const now = Date.now();
            const p = { lat: latitude, lng: longitude, ts: now };
            setCenter((c) => c || { lat: latitude, lng: longitude }); // setează prima centrare
            pushPoint(p);
          },
          (err) => {
            setHasPermission(false);
            setGpsError(err?.message || 'Eroare GPS.');
          },
          {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 15000,
          }
        );
        setWatchId(id);
      } catch (e) {
        setHasPermission(false);
        setGpsError(e?.message || 'Eroare inițializare GPS.');
      }
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isRecording, watchId, pushPoint]);

  // START/STOP/UNDO/FINALIZE
  const handleStart = useCallback(() => {
    setIsRecording(true);
    // nu resetăm punctele automat – poți continua
  }, []);

  const handleStop = useCallback(() => {
    setIsRecording(false);
  }, []);

  const handleUndo = useCallback(() => {
    setPoints((prev) => (prev.length ? prev.slice(0, -1) : prev));
  }, []);

  const handleFinalize = useCallback(async () => {
    if (points.length < 2) {
      alert('Ai nevoie de minim două puncte pentru o rută.');
      return;
    }

    const payload = {
      subject: subj ? { type: subj.type, id: subj.id, label: subj.label || '' } : null,
      points,
      distance_m: Math.round(distance),
      sampling_threshold_m: samplingThreshold,
      created_at: new Date().toISOString(),
    };

    try {
      if (typeof onSaveSegment === 'function') {
        await onSaveSegment(payload);
      } else {
        // fallback: doar afișează sumar
        alert(
          `Segment salvat local:\n` +
          `Puncte: ${points.length}\n` +
          `Distanță: ${(distance/1000).toFixed(2)} km\n` +
          `Sampling: ${samplingThreshold} m`
        );
      }
      // după salvare curățăm
      setIsRecording(false);
      setPoints([]);
      setDistance(0);
    } catch (e) {
      console.error(e);
      alert(`Eroare la salvare: ${e.message || e}`);
    }
  }, [points, distance, samplingThreshold, onSaveSegment, subj]);

  // linii & markere
  const polyPositions = useMemo(() => points.map(p => [p.lat, p.lng]), [points]);
  const startPos = points[0] ? [points[0].lat, points[0].lng] : null;
  const lastPos = points.length ? [points[points.length - 1].lat, points[points.length - 1].lng] : null;

  return (
    <div style={WRAP_STYLE}>
      {/* Harta */}
      <div style={{ position: 'relative', flex: 1 }}>
        <MapContainer
          center={center || [45.9432, 24.9668]} // fallback România
          zoom={center ? 16 : 6}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {center && <FlyTo center={center} zoom={16} />}

          {polyPositions.length >= 2 && (
            <Polyline positions={polyPositions} weight={6} opacity={0.9} />
          )}

          {startPos && <Marker position={startPos} />}
          {lastPos && <Marker position={lastPos} />}

        </MapContainer>

        {/* Top bar – stânga: controale | dreapta: închidere */}
        <div style={TOPBAR_STYLE}>
          <div style={BTN_ROW_STYLE}>
            {!isRecording ? (
              <button style={BTN_STYLE} onClick={handleStart}>⏺ Start</button>
            ) : (
              <button style={BTN_STYLE} onClick={handleStop}>⏹ Pauză</button>
            )}

            <button style={BTN_STYLE} onClick={handleUndo} disabled={points.length === 0}>
              ↩ Undo
            </button>

            <button style={BTN_STYLE} onClick={cycleSampling}>
              📏 {samplingThreshold >= 1000 ? `${(samplingThreshold/1000).toFixed(0)} km` : `${samplingThreshold} m`}
            </button>

            <button
              style={{ ...BTN_STYLE, borderColor: '#2b9158', background: 'rgba(25,45,25,.9)' }}
              onClick={handleFinalize}
              disabled={points.length < 2}
              title={points.length < 2 ? 'Ai nevoie de minim 2 puncte' : 'Salvează segment'}
            >
              ✅ Finalizare
            </button>
          </div>

          <div style={BTN_ROW_STYLE}>
            <button style={BTN_STYLE} onClick={() => onClose && onClose()}>
              ✕ Închide
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div style={FOOTER_STYLE}>
          <div style={INFO_STYLE}>
            {isRecording ? 'Înregistrare activă' : 'Înregistrare oprită'} • Puncte: {points.length} • Distanță: {(distance/1000).toFixed(2)} km
          </div>
          <div style={INFO_STYLE}>
            {hasPermission === false
              ? (gpsError || 'Permisiune GPS refuzată')
              : hasPermission === null
              ? 'Aștept permisiunea GPS…'
              : 'GPS OK'}
          </div>
        </div>
      </div>
    </div>
  );
}