// src/components/GpsPro/map/MapPanelCore.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import useWakeLockStrict from '../hooks/useWakeLockStrict';

// markers implicite pentru Leaflet
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

// praguri de sampling (metri): 80 m, 500 m, 1000 m
const SAMPLING_STEPS = [80, 500, 1000];

// funcţie Haversine (metri)
function haversine(a, b) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s1 =
    Math.sin(dLat/2)**2 +
    Math.cos(a.lat * Math.PI/180) * Math.cos(b.lat * Math.PI/180) *
    Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(s1));
}

// componentă mică care mută harta la un centru dat
function FlyTo({ center, zoom = 16 }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.flyTo(center, zoom, { animate: true, duration: 0.6 });
  }, [center, zoom, map]);
  return null;
}

export default function MapPanelCore({ subject = null, onClose, onSaveSegment }) {
  // „subject” conține informații despre client/terminal etc.; folosit ca reper inițial
  const subj = subject || null;

  // hook pentru menținerea ecranului deschis (Wake Lock)
  const { enable: enableWake, disable: disableWake } = useWakeLockStrict();

  const [isRecording, setIsRecording] = useState(false);
  const [points, setPoints] = useState([]);       // [{lat,lng,ts}]
  const [distance, setDistance] = useState(0);     // metri
  const [samplingIdx, setSamplingIdx] = useState(0); // index în SAMPLING_STEPS
  const samplingThreshold = SAMPLING_STEPS[samplingIdx];
  const [center, setCenter] = useState(subj?.coords ? parseCoords(subj.coords) : null);

  // convertește string "lat,lon" în {lat,lng}
  function parseCoords(str) {
    const [lat, lng] = str.split(',').map((s) => Number(s.trim()));
    return { lat, lng };
  }

  // actualizează distanța când se modifică punctele
  useEffect(() => {
    if (points.length < 2) {
      setDistance(0);
      return;
    }
    let d = 0;
    for (let i = 1; i < points.length; i++) {
      d += haversine(points[i - 1], points[i]);
    }
    setDistance(d);
  }, [points]);

  // inițializează/închide gps watchPosition
  const watchIdRef = useRef(null);
  useEffect(() => {
    if (!navigator.geolocation) return;

    if (isRecording) {
      enableWake(); // menține ecranul deschis când începe înregistrarea
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const now = Date.now();
          const p = { lat: latitude, lng: longitude, ts: now };

          setCenter((c) => c || { lat: latitude, lng: longitude });

          // adaugă noul punct doar dacă depășește pragul față de ultimul punct păstrat
          setPoints((prev) => {
            if (prev.length === 0) return [p];
            const last = prev[prev.length - 1];
            const d = haversine(last, p);
            if (d < samplingThreshold) return prev;
            return [...prev, p];
          });
        },
        (err) => {
          console.warn('Geo error', err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 15000,
        }
      );
    } else if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      disableWake(); // eliberează Wake Lock când se oprește înregistrarea
    }

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isRecording, samplingThreshold, enableWake, disableWake]);

  // schimbă pragul de sampling
  const cycleSampling = () => {
    setSamplingIdx((i) => (i + 1) % SAMPLING_STEPS.length);
  };

  // start/pause înregistrare
  const toggleRecording = () => {
    setIsRecording((r) => !r);
  };

  // șterge ultimul punct
  const undoLast = () => {
    setPoints((prev) => (prev.length ? prev.slice(0, -1) : prev));
  };

  // salvează segmentul (apelează callback)
  const finalize = async () => {
    if (points.length < 2) {
      alert('Ai nevoie de minim două puncte pentru a salva un segment.');
      return;
    }
    const payload = {
      subject,
      points,
      distance_m: Math.round(distance),
      sampling_threshold_m: samplingThreshold,
      created_at: new Date().toISOString(),
    };
    try {
      await onSaveSegment?.(payload);
      // reset după salvare
      setIsRecording(false);
      setPoints([]);
      setDistance(0);
    } catch (e) {
      console.error(e);
      alert(`Eroare la salvare: ${e.message || e}`);
    }
  };

  // pregătește polilinia și markerele pentru hartă
  const polyPositions = points.map((p) => [p.lat, p.lng]);
  const startPos   = points[0] ? [points[0].lat, points[0].lng] : null;
  const lastPos    = points.length ? [points[points.length - 1].lat, points[points.length - 1].lng] : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0b1320', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <MapContainer center={center || [45.9432, 24.9668]} zoom={center ? 16 : 6} style={{ width: '100%', height: '100%' }}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {center && <FlyTo center={center} zoom={16} />}
          {polyPositions.length >= 2 && <Polyline positions={polyPositions} weight={6} opacity={0.9} />}
          {startPos && <Marker position={startPos} />}
          {lastPos && <Marker position={lastPos} />}
        </MapContainer>

        {/* Top bar: controale */}
        <div style={{
          position: 'absolute', top: 8, left: 8, right: 8, zIndex: 1000,
          display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={toggleRecording}>
              {isRecording ? '⏹ Pauză' : '⏺ Start'}
            </button>
            <button onClick={undoLast} disabled={points.length === 0}>
              ↩ Undo
            </button>
            <button onClick={cycleSampling} title="Schimbă pragul de sampling">
              {samplingThreshold >= 1000 ? `${(samplingThreshold/1000).toFixed(0)} km` : `${samplingThreshold} m`}
            </button>
            <button onClick={finalize} disabled={points.length < 2}>
              ✅ Salvează segment
            </button>
          </div>
          <button onClick={onClose}>✕ Închide</button>
        </div>

        {/* Footer: informaţii live */}
        <div style={{
          position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 1000,
          display: 'flex', justifyContent: 'space-between', color: '#9fc4ff',
        }}>
          <span>{isRecording ? 'Înregistrare activă' : 'Oprit'} • Puncte: {points.length} • Distanţă: {(distance/1000).toFixed(2)} km</span>
        </div>
      </div>
    </div>
  );
}