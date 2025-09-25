// src/components/GpsPro/DrawRouteModal.jsx

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Asigură-te că CSS-ul Leaflet este importat

import { supabase } from '../../supabaseClient';
import styles from './GpsPro.module.css';

// --- Sub-componente (la fel ca în RouteWizard) ---

const TABS = ['clientes', 'parkings', 'servicios', 'terminale'];
const TAB_NAMES = {
  clientes: 'Clienți',
  parkings: 'Parkinguri',
  servicios: 'Servicii',
  terminale: 'Terminale',
};

function List({ table, term, onPick }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    async function run() {
      const { data, error } = await supabase
        .from(`gps_${table}`)
        .select('id, nombre, coordenadas, detalles')
        .ilike('nombre', term ? `%${term}%` : '%')
        .order('nombre', { ascending: true })
        .limit(100);
      setItems(error ? [] : data || []);
    }
    run();
  }, [table, term]);

  return (
    <ul className={styles.destList}>
      {items.map((it) => (
        <li key={it.id}>
          <button
            className={styles.destItem}
            onClick={() => onPick({ type: table, id: it.id, label: it.nombre, coords: it.coordenadas })}
          >
            <div className={styles.destTitle}>{it.nombre}</div>
            {it.detalles && <div className={styles.destSub}>{it.detalles}</div>}
          </button>
        </li>
      ))}
    </ul>
  );
}

// --- Sub-componente pentru Harta Interactivă ---

// Funcție pentru a parsa coordonatele dintr-un string
function parseCoords(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.split(',').map(s => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]]; // Leaflet folosește [lat, lng]
  }
  return null;
}

// Layer invizibil care adaugă puncte pe hartă la click
function PolyEditLayer({ points, setPoints }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      // Inserează noul punct înainte de ultimul element (destinația)
      if (points.length >= 2) {
        setPoints([...points.slice(0, -1), [lat, lng], points.slice(-1)[0]]);
      } else {
        setPoints([...points, [lat, lng]]);
      }
    },
  });
  return null;
}

// Marker personalizat care poate fi mutat prin drag & drop
function DraggableMarker({ idx, pos, onMove, color }) {
  const icon = useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 28 42"><path fill="${color}" stroke="#000" stroke-width="1" d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 28 14 28s14-17.5 14-28C28 6.268 21.732 0 14 0z"/><circle cx="14" cy="14" r="7" fill="#fff"/></svg>`;
    return L.icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
      iconSize: [28, 42],
      iconAnchor: [14, 42],
    });
  }, [color]);

  return (
    <Marker
      position={pos}
      draggable
      eventHandlers={{
        dragend: (e) => onMove(idx, e.target.getLatLng()),
      }}
      icon={icon}
    />
  );
}

// --- Componenta Principală ---

export default function DrawRouteModal({ onClose, onSave }) {
  const [step, setStep] = useState(1); // 1: Alege Origine, 2: Alege Destinație, 3: Desenează
  const [tab, setTab] = useState('clientes');
  const [term, setTerm] = useState('');
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [points, setPoints] = useState([]); // Lista de coordonate [lat, lng] pentru traseu

  // Inițializează punctele pe hartă odată ce originea și destinația sunt setate
  useEffect(() => {
    const oCoords = origin ? parseCoords(origin.coords) : null;
    const dCoords = destination ? parseCoords(destination.coords) : null;
    
    const initialPoints = [];
    if (oCoords) initialPoints.push(oCoords);
    if (dCoords) initialPoints.push(dCoords);
    
    setPoints(initialPoints);
  }, [origin, destination]);

  const handlePick = (item) => {
    if (step === 1) {
      setOrigin(item);
      setStep(2);
      setTab('clientes');
      setTerm('');
    } else {
      setDestination(item);
      setStep(3); // Treci la ecranul cu harta
    }
  };

  const movePoint = useCallback((index, newLatLng) => {
    const newPoints = [...points];
    newPoints[index] = [newLatLng.lat, newLatLng.lng];
    setPoints(newPoints);
  }, [points]);

  const removeLastPoint = useCallback(() => {
    // Șterge ultimul punct adăugat, dar nu șterge originea sau destinația
    if (points.length > 2) {
      setPoints([...points.slice(0, -2), points.slice(-1)[0]]);
    }
  }, [points]);

  const handleSave = useCallback(() => {
    if (points.length < 2) {
      alert('Traseul trebuie să conțină cel puțin o origine și o destinație.');
      return;
    }
    // GeoJSON cere formatul [longitudine, latitudine]
    const geojsonCoords = points.map(([lat, lng]) => [lng, lat]);
    const geojson = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: geojsonCoords },
      }],
    };
    
    const now = new Date().toLocaleString('ro-RO');
    const name = `Ruta (manual) ${origin.label} → ${destination.label} · ${now}`;

    // Pregătește payload-ul pentru a fi trimis componentei părinte (ListView)
    // Acesta respectă NOUA structură a bazei de date
    const routePayload = {
      name,
      origin_type: origin.type,
      origin_id: origin.id,
      destination_type: destination.type,
      destination_id: destination.id,
      geojson,
      points, // Păstrăm și punctele în format [lat,lng] dacă e util
      distance_m: 0, // Aici poți adăuga calculul distanței Haversine dacă dorești
      duration_s: null,
      mode: 'manual',
      provider: 'user',
      meta: { origin, destination },
    };

    onSave(routePayload);
  }, [points, origin, destination, onSave]);

  const renderContent = () => {
    if (step < 3) { // Etapele de selecție
      return (
        <>
          <div className={styles.modalHeader}>
            <h3>{step === 1 ? 'Pasul 1: Alege Originea' : 'Pasul 2: Alege Destinația'}</h3>
          </div>
          <div className={styles.modalBody}>
            <div className={styles.destTabs}>
              {TABS.map((t) => (
                <button
                  key={t}
                  className={`${styles.navBtn} ${tab === t ? styles.navBtnActive : ''}`}
                  onClick={() => setTab(t)}
                >
                  {TAB_NAMES[t]}
                </button>
              ))}
            </div>
            <div className={styles.search} style={{ marginTop: 8 }}>
              <input placeholder="Caută după nume…" value={term} onChange={(e) => setTerm(e.target.value)} />
            </div>
            <List table={tab} term={term} onPick={handlePick} />
          </div>
        </>
      );
    }

    // Etapa de desenare pe hartă
    return (
      <>
        <div className={styles.modalHeader}>
          <h3>Pasul 3: Desenează și ajustează ruta</h3>
        </div>
        <div className={styles.modalBody} style={{ padding: 0, height: '60vh', minHeight: '400px' }}>
          <MapContainer
            center={points[0] || [45.9432, 24.9668]}
            zoom={points.length > 0 ? 13 : 6}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
            <PolyEditLayer points={points} setPoints={setPoints} />
            {points.length >= 2 && <Polyline positions={points} pathOptions={{ color: '#007bff', weight: 5, opacity: 0.8 }} />}
            {points.map((p, i) => (
              <DraggableMarker
                key={i}
                idx={i}
                pos={p}
                onMove={movePoint}
                color={i === 0 ? '#28a745' : i === points.length - 1 ? '#dc3545' : '#17a2b8'}
              />
            ))}
          </MapContainer>
        </div>
      </>
    );
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalLarge}`} onClick={(e) => e.stopPropagation()}>
        {renderContent()}
        <div className={styles.modalFooter}>
          <div style={{ color: 'var(--muted)', maxWidth: '50%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {origin && <>Orig.: <strong>{origin.label}</strong></>}
            {destination && <> · Dest.: <strong>{destination.label}</strong></>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {step === 2 && <button className={styles.btn} onClick={() => setStep(1)}>Înapoi</button>}
            {step === 3 && <button className={styles.btn} onClick={() => setStep(2)}>Alege altă destinație</button>}
            {step === 3 && <button className={styles.btn} onClick={removeLastPoint} disabled={points.length <= 2}>Șterge ultimul punct</button>}
            <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={step !== 3} onClick={handleSave}>
              Salvează Ruta Desenată
            </button>
            <button className={styles.btn} onClick={onClose}>Anulează</button>
          </div>
        </div>
      </div>
    </div>
  );
}
