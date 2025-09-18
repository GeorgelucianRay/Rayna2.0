// src/components/GpsPro/map/MapPanelCore.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from '../GpsPro.module.css';

import MapControls from './MapControls';
import useRouteRecorder, { parseCoords } from '../hooks/useRouteRecorder';
import { createBaseLayers } from '../tiles/baseLayers';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../AuthContext';
import useWakeLockIOS from '../hooks/useWakeLockIOS'; // 👈 anti-sleep iPhone

// Fix icons (vite/webpack/CRA)
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = new L.Icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapPanelCore({ client, destination, autoStart = false, onClose }) {
  const mapRef = useRef(null);
  const basesRef = useRef({});
  const routeLayerRef = useRef(null);
  const vehicleMarkerRef = useRef(null);

  const { user, profile } = useAuth();
  const isDispecer = profile?.role === 'dispecer';

  const [baseName, setBaseName] = useState('normal');
  const [saving, setSaving] = useState(false);

  const { active, precision, setPrecision, points, distanceM, start, stop, reset, toGeoJSON } = useRouteRecorder();
  const wake = useWakeLockIOS(); // 👈

  // destinații
  const clientDest = useMemo(
    () => parseCoords(client?.dest_coords || client?.coordenadas || null),
    [client]
  );
  const pickedDest = useMemo(
    () => (destination?.coords ? parseCoords(destination.coords) : null),
    [destination]
  );

  // init hartă (safe)
  useEffect(() => {
    if (mapRef.current) return;
    const container = document.getElementById('gpspro-map');
    if (!container) return;

    const startCenter = pickedDest || clientDest;
    const center = startCenter ? [startCenter.lat, startCenter.lng] : [41.390205, 2.154007]; // Barcelona fallback
    const zoom = startCenter ? 12 : 6;

    try {
      const map = L.map(container, { center, zoom, zoomControl: false });
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapRef.current = map;

      // straturi de bază
      basesRef.current = createBaseLayers();
      (basesRef.current.normal)?.addTo(map);

      // marker destinație (prioritar: aleasă din picker; altfel cea salvată la client)
      if (pickedDest) {
        L.marker([pickedDest.lat, pickedDest.lng]).addTo(map)
          .bindPopup(`<b>${destination?.label || 'Destino'}</b>`);
      } else if (clientDest) {
        L.marker([clientDest.lat, clientDest.lng]).addTo(map)
          .bindPopup(`<b>${client?.nombre || 'Cliente'}</b>`);
      }

      // straturi pentru ruta curentă
      routeLayerRef.current = L.polyline([], { color: '#00e5ff', weight: 5, opacity: 0.9 }).addTo(map);
      vehicleMarkerRef.current = L.marker([0, 0], { opacity: 0 }).addTo(map);
    } catch (err) {
      console.error('Leaflet init error:', err);
    }
  }, [client, clientDest, pickedDest, destination?.label]);

  // comutare strat bază
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !basesRef.current) return;
    try {
      Object.values(basesRef.current).forEach(layer => { if (map.hasLayer(layer)) map.removeLayer(layer); });
      (basesRef.current[baseName] || basesRef.current.normal)?.addTo(map);
    } catch (err) {
      console.error('Layer switch error:', err);
    }
  }, [baseName]);

  // update traseu în timp real
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeLayerRef.current || !vehicleMarkerRef.current) return;

    if (!points || points.length === 0) {
      routeLayerRef.current.setLatLngs([]);
      vehicleMarkerRef.current.setOpacity(0);
      return;
    }

    const latlngs = points.map(p => [p.lat, p.lng]);
    routeLayerRef.current.setLatLngs(latlngs);

    const last = latlngs[latlngs.length - 1];
    vehicleMarkerRef.current.setLatLng(last);
    vehicleMarkerRef.current.setOpacity(1);

    map.panTo(last, { animate: true });
  }, [points]);

  // autoStart (pornește recorder + wake lock)
  useEffect(() => {
    if (!autoStart) return;
    reset();
    const t = setTimeout(() => {
      start();
      wake.enable(); // 👈 ține ecranul „treaz” pe iPhone
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const onStartStop = () => {
    if (active) {
      stop();
      wake.disable(); // 👈 eliberează când oprești
    } else {
      reset();
      start();
      wake.enable(); // 👈 pornește anti-sleep
    }
  };

  const onSave = async () => {
    if (!isDispecer) return alert('Solo el dispecer puede guardar rutas.');
    const geojson = toGeoJSON();
    if (!geojson) return alert('Ruta es demasiado corta para guardar.');

    setSaving(true);
    try {
      const payload = {
        client_id: client?.id || null, // dacă deschizi din Clientes rămâne asociat; din Parking poate fi null
        origin_terminal_id: null,
        name: `Ruta ${client?.nombre || destination?.label || 'sin nombre'} · ${new Date().toLocaleString()}`,
        mode: 'manual',
        provider: null,
        geojson,
        points,
        distance_m: Number.isFinite(distanceM) ? distanceM : null,
        duration_s: null,
        round_trip: true,
        sampling: { mode: precision ? 'precision' : 'normal', threshold_m: precision ? 100 : 20000 },
        meta: destination ? { picked_destination: destination } : null,
        created_by: user?.id || null,
      };
      const { error } = await supabase.from('gps_routes').insert([payload]);
      if (error) throw error;
      alert('¡Ruta guardada con éxito!');
      reset();
      wake.disable(); // oprește anti-sleep după salvare
    } catch (e) {
      console.error(e);
      alert(`Error al guardar la ruta: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.mapPanelBackdrop} onClick={onClose}>
      <div className={styles.mapPanel} onClick={(e)=> e.stopPropagation()}>
        <div className={styles.mapHeader}>
          <div className={styles.mapTitle}>
            <span className={styles.dotGlow}/> GPS<span className={styles.brandAccent}>Pro</span> · {client?.nombre || destination?.label || 'Mapa'}
          </div>
          <button className={styles.iconBtn} onClick={() => { wake.disable(); onClose(); }}>✕</button>
        </div>

        <MapControls
          baseName={baseName}
          setBaseName={setBaseName}
          active={active}
          onStartStop={onStartStop}
          precision={precision}
          setPrecision={setPrecision}   // 👈 comută 100 m ↔ 20 km în mers (hook-ul trebuie să suporte!)
          onSave={onSave}
          saving={saving}
          pointsCount={points?.length || 0}
          distanceM={distanceM || 0}
        />

        <div id="gpspro-map" className={styles.mapCanvas}/>
      </div>
    </div>
  );
}