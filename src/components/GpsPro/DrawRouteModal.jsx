import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import styles from './GpsPro.module.css';

// culori pentru markere şi linie
const ORIGIN_COLOR = '#2E86DE';
const DEST_COLOR   = '#E74C3C';
const PATH_COLOR   = '#27AE60';

// funcţii de utilitate (parsează coordonate string sau array)
function parseCoords(strOrObj) {
  if (!strOrObj) return null;
  if (typeof strOrObj === 'string') {
    const [lat, lon] = strOrObj.split(',').map((s) => Number(s.trim()));
    if (Number.isFinite(lat) && Number.isFinite(lon)) return [lat, lon];
    return null;
  }
  if (Array.isArray(strOrObj) && strOrObj.length === 2) {
    const a = Number(strOrObj[0]);
    const b = Number(strOrObj[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) return [a, b];
  }
  if (typeof strOrObj === 'object') {
    const lat = Number(strOrObj.lat ?? strOrObj.latitude);
    const lon = Number(strOrObj.lon ?? strOrObj.lng ?? strOrObj.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return [lat, lon];
  }
  return null;
}

// componentă auxiliară: layer care adaugă puncte pe click
function PolyEditLayer({ points, setPoints, hasDest }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPoints((prev) => {
        // dacă avem destinaţie şi avem deja cel puţin două puncte (origine + destinaţie),
        // inserează noul punct înainte de ultimul element (destinaţia)
        if (hasDest && prev.length >= 2) {
          return [...prev.slice(0, prev.length - 1), [lat, lng], prev[prev.length - 1]];
        }
        // altfel adaugă la final
        return [...prev, [lat, lng]];
      });
    },
  });
  return null;
}

// marker care poate fi tras pentru a ajusta punctele
function DraggableMarker({ idx, pos, onMove, color }) {
  const icon = useMemo(() => {
    const svg = encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="40" viewBox="0 0 26 40">
        <path fill="${color}" d="M13 0C5.8 0 0 5.8 0 13c0 9.7 13 27 13 27s13-17.3 13-27C26 5.8 20.2 0 13 0z"/>
        <circle cx="13" cy="13" r="6" fill="#fff"/>
      </svg>
    `);
    return L.icon({
      iconUrl: `data:image/svg+xml;charset=UTF-8,${svg}`,
      iconSize: [26, 40],
      iconAnchor: [13, 40],
    });
  }, [color]);

  return (
    <Marker
      position={pos}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const ll = e.target.getLatLng();
          onMove(idx, [ll.lat, ll.lng]);
        },
      }}
      icon={icon}
    />
  );
}

// componenta principală
export default function DrawRouteModal({ onClose, onSave }) {
  const [originSel, setOriginSel] = useState(null);
  const [destSel, setDestSel]     = useState(null);
  const [points, setPoints]       = useState([]);

  // când alegem origine/destinaţie, iniţializează vectorul points
  useEffect(() => {
    const o = parseCoords(originSel?.coords);
    const d = parseCoords(destSel?.coords);
    if (o && d) {
      setPoints([o, d]);       // origine + destinaţie
    } else if (o) {
      setPoints([o]);          // doar origine
    } else {
      setPoints([]);
    }
  }, [originSel, destSel]);

  // inserează un punct într-o anumită poziţie (folosit la drag)
  const movePoint = useCallback((index, newPos) => {
    setPoints((prev) => {
      const copy = prev.slice();
      copy[index] = newPos;
      return copy;
    });
  }, []);

  // funcţia undo: şterge ultimul punct intermediar, dar păstrează destinaţia la final
  const removeLast = useCallback(() => {
    setPoints((prev) => {
      // dacă avem destinaţie şi cel puţin un punct intermediar, eliminăm penultimul element
      if (destSel?.coords && prev.length >= 3) {
        return [...prev.slice(0, prev.length - 2), prev[prev.length - 1]];
      }
      // altfel eliminăm ultimul element
      return prev.slice(0, -1);
    });
  }, [destSel]);

  // salvează ruta: construieşte geojson şi trimite prin callback
  const handleSave = useCallback(() => {
    if (points.length < 2) {
      alert('Desenează cel puţin origine şi destinaţie.');
      return;
    }
    const coords = points.map(([lat, lon]) => [lon, lat]); // GeoJSON: [lon, lat]
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      ],
    };
    const distance = 0; // poţi calcula haversine aici dacă doreşti
    onSave?.({ geojson, points, distance_m: distance });
  }, [points, onSave]);

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Aici ar veni selectorul de origine/destinaţie (de ex. SelectList din mesajele anterioare) */}
        {/* … */}
        <div style={{ height: '400px', marginTop: '1rem' }}>
          <MapContainer
            center={points[0] || [45.9432, 24.9668]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* stratul care inserează puncte prin click */}
            <PolyEditLayer points={points} setPoints={setPoints} hasDest={!!destSel?.coords} />
            {/* marcaje şi linia traseului */}
            {points.map((p, i) => (
              <DraggableMarker
                key={i}
                idx={i}
                pos={p}
                onMove={movePoint}
                color={i === 0 ? ORIGIN_COLOR : i === points.length - 1 ? DEST_COLOR : '#00BCD4'}
              />
            ))}
            {points.length >= 2 && (
              <Polyline positions={points} pathOptions={{ color: PATH_COLOR, weight: 6, opacity: 0.9 }} />
            )}
          </MapContainer>
        </div>
        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={removeLast}>Undo</button>
          <button onClick={handleSave}>Salvează ruta</button>
          <button onClick={onClose}>Închide</button>
        </div>
      </div>
    </div>
  );
}