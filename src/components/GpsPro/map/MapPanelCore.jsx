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

// Fix icons (vite/webpack)
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

  const {
    active, precision, setPrecision,
    points, distanceM, start, stop, reset, toGeoJSON
  } = useRouteRecorder();

  const clientDest = useMemo(() => parseCoords(client?.dest_coords || client?.coordenadas || null), [client]);

  // init map
  useEffect(() => {
    if (mapRef.current) return;
    const center = clientDest ? [clientDest.lat, clientDest.lng] : [41.390205, 2.154007];
    const zoom = clientDest ? 12 : 6;

    const map = L.map('gpspro-map', { center, zoom, zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;

    basesRef.current = createBaseLayers();
    basesRef.current.normal.addTo(map); // default

    // marker client dest (dacă există)
    if (clientDest) {
      L.marker([clientDest.lat, clientDest.lng]).addTo(map)
        .bindPopup(`<b>${client?.nombre || 'Cliente'}</b>`);
    }

    routeLayerRef.current = L.polyline([], { color: '#00e5ff', weight: 5, opacity: 0.9 }).addTo(map);
    vehicleMarkerRef.current = L.marker([0,0], { opacity: 0 }).addTo(map);
  }, [client, clientDest]);

  // switch base
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const bases = basesRef.current;
    Object.values(bases).forEach(layer => { try { map.removeLayer(layer); } catch {} });
    (bases[baseName] || bases.normal).addTo(map);
  }, [baseName]);

  // update route and last point
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (points.length === 0) {
      routeLayerRef.current?.setLatLngs([]);
      vehicleMarkerRef.current?.setOpacity(0);
      return;
    }
    const latlngs = points.map(p => [p.lat, p.lng]);
    routeLayerRef.current?.setLatLngs(latlngs);
    const last = latlngs[latlngs.length - 1];
    vehicleMarkerRef.current?.setLatLng(last);
    vehicleMarkerRef.current?.setOpacity(1);
    map.panTo(last, { animate: true });
  }, [points]);

  const onStartStop = () => active ? stop() : (reset(), start());

  const onSave = async () => {
    if (!isDispecer) return alert('Solo el dispecer puede guardar rutas.');
    const geojson = toGeoJSON();
    if (!geojson) return alert('Ruta es demasiado corta para guardar.');
    setSaving(true);
    try {
      const payload = {
        client_id: client.id,
        origin_terminal_id: null,
        name: `Ruta ${client?.nombre || ''} ${new Date().toLocaleString()}`,
        mode: 'manual',
        provider: null,
        geojson,
        points,
        distance_m: Number.isFinite(distanceM) ? distanceM : null,
        duration_s: null,
        round_trip: true,
        sampling: { mode: precision ? 'precision' : 'normal', threshold_m: precision ? 100 : 20000 },
        meta: null,
        created_by: user?.id || null,
      };
      const { error } = await supabase.from('gps_routes').insert([payload]);
      if (error) throw error;
      alert('¡Ruta guardada con éxito!');
      reset();
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
            <span className={styles.dotGlow}/> GPS<span className={styles.brandAccent}>Pro</span> · {client?.nombre || 'Cliente'}
          </div>
          <button className={styles.iconBtn} onClick={onClose}>✕</button>
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
          pointsCount={points.length}
          distanceM={distanceM}
        />

        <div id="gpspro-map" className={styles.mapCanvas}/>
      </div>
    </div>
  );
}