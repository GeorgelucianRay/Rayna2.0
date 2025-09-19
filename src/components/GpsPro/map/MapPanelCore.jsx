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

// 🔒 wake lock strict cross-platform + overlay
import useWakeLockStrict, { WakePrompt } from '../hooks/useWakeLockStrict';

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

  // 🔒 wake lock cross-platform (Android + iOS)
  const wake = useWakeLockStrict();

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
    const center = startCenter ? [startCenter.lat, startCenter.lng] : [41.390205, 2.154007]; // fallback Barcelona
    const zoom = startCenter ? 12 : 6;

    try {
      const map = L.map(container, { center, zoom, zoomControl: false });
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapRef.current = map;

      // straturi de bază
      basesRef.current = createBaseLayers();
      (basesRef.current.normal)?.addTo(map);

      // marker destinație
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
    const t = setTimeout(async () => {
      start();
      await wake.enable(); // 🔒 ține ecranul treaz
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // cleanup complet
  useEffect(() => {
    return () => {
      try { stop?.(); } catch {}
      try { wake.disable?.(); } catch {}
      try {
        routeLayerRef.current?.remove();
        vehicleMarkerRef.current?.remove();
        routeLayerRef.current = null;
        vehicleMarkerRef.current = null;
      } catch {}
      try { mapRef.current?.remove(); mapRef.current = null; } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onStartStop = async () => {
    if (active) {
      stop();
      await wake.disable();
    } else {
      reset();
      start();
      await wake.enable();
    }
  };

  const onSave = async () => {
    if (!isDispecer) return alert('Solo el dispecer puede guardar rutas.');
    const geojson = toGeoJSON();
    if (!geojson) return alert('Ruta es demasiado corta para guardar.');

    setSaving(true);
    try {
      const payload = {
        client_id: client?.id || null,
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
      await wake.disable();
    } catch (e) {
      console.error(e);
      alert(`Error al guardar la ruta: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  // protejează închiderea accidentală când înregistrezi
  const safeClose = async () => {
    if (active) {
      const ok = window.confirm('La grabación está en curso. ¿Cerrar el mapa?');
      if (!ok) return;
    }
    await wake.disable();
    onClose();
  };

  return (
    <div
      className={styles.mapPanelBackdrop}
      onClick={wake.needsPrompt ? undefined : safeClose}
    >
      <div className={styles.mapPanel} onClick={(e)=> e.stopPropagation()}>
        <div className={styles.mapHeader}>
          <div className={styles.mapTitle}>
            <span className={styles.dotGlow}/> GPS<span className={styles.brandAccent}>Pro</span> · {client?.nombre || destination?.label || 'Mapa'}
          </div>
          <button className={styles.iconBtn} onClick={safeClose}>✕</button>
        </div>

        <MapControls
          baseName={baseName}
          setBaseName={setBaseName}
          active={active}
          onStartStop={onStartStop}
          precision={precision}
          setPrecision={setPrecision}
          onSave={onSave}
          saving={saving}
          pointsCount={points?.length || 0}
          distanceM={distanceM || 0}
        />

        <div id="gpspro-map" className={styles.mapCanvas}/>

        {/* Overlay pentru confirmare wake-lock pe iOS/Android */}
        <WakePrompt
          visible={wake.needsPrompt}
          onConfirm={() => wake.confirmEnable()}
          onCancel={() => wake.disable()}
        />
      </div>
    </div>
  );
}