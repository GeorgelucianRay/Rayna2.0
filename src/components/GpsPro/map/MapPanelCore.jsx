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

// wake lock strict cross-platform + overlay (fără npm)
import useWakeLockStrict, { WakePrompt } from '../hooks/useWakeLockStrict.jsx';

// Fix Leaflet icons
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
  const wake = useWakeLockStrict();

  // destinații pentru centrare / pin
  const clientDest = useMemo(() => parseCoords(client?.dest_coords || client?.coordenadas || null), [client]);
  const pickedDest = useMemo(() => (destination?.coords ? parseCoords(destination.coords) : null), [destination]);

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

      // marker destinație
      if (pickedDest) {
        L.marker([pickedDest.lat, pickedDest.lng]).addTo(map).bindPopup(`<b>${destination?.label || 'Destino'}</b>`);
      } else if (clientDest) {
        L.marker([clientDest.lat, clientDest.lng]).addTo(map).bindPopup(`<b>${client?.nombre || 'Cliente'}</b>`);
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

  // autoStart: cere wake-lock (fără gest) ca să afișeze overlay; pornirea efectivă se face la primul tap Start
  useEffect(() => {
    if (!autoStart) return;
    reset();
    // acesta va seta needsPrompt=true dacă nu e din gest
    wake.enable(false);
    // nu chemăm start() aici; se va porni la buton sau automat imediat după ce wake devine activ (vezi efectul de mai jos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // dacă ai venit cu autoStart și userul confirmă wake (devine activ) iar recorderul nu e pornit → pornește automat
  useEffect(() => {
    if (autoStart && wake.active && !active) {
      // nu mai chemăm wake.enable aici (deja e activ), doar pornim înregistrarea
      reset();
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, wake.active]);

  // start/stop din buton — IMPORTANT: wake.enable(true) în același gest, înainte de start()
  const onStartStop = () => {
    if (active) {
      stop();
      wake.disable();
    } else {
      wake.enable(true);   // în gestul utilizatorului
      reset();
      start();
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
      wake.disable();
    } catch (e) {
      console.error(e);
      alert(`Error al guardar la ruta: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  // închidere sigură
  const safeClose = () => {
    if (active) {
      const ok = window.confirm('La grabación está en curso. ¿Cerrar el mapa?');
      if (!ok) return;
    }
    wake.disable();
    onClose();
  };

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