import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './GpsPro.module.css';
import useRouteRecorder, { parseCoords } from './hooks/useRouteRecorder';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';

// Fix icons (vite/webpack)
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = new L.Icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapPanel({ client, onClose }) {
  const mapRef = useRef(null);
  const baseRef = useRef({});
  const routeLayerRef = useRef(null);
  const vehicleMarkerRef = useRef(null);

  const [baseName, setBaseName] = useState('normal'); // normal | satelite | black
  const [saving, setSaving] = useState(false);

  const { user, profile } = useAuth();
  const isDispecer = profile?.role === 'dispecer';

  const {
    active, precision, setPrecision,
    points, distanceM,
    start, stop, reset, toGeoJSON
  } = useRouteRecorder();

  const clientDest = useMemo(() => {
    return parseCoords(client?.dest_coords || client?.coordenadas || null);
  }, [client]);

  // init map
  useEffect(() => {
    if (mapRef.current) return;
    const center = clientDest ? [clientDest.lat, clientDest.lng] : [41.390205, 2.154007];
    const zoom = clientDest ? 12 : 6;

    const map = L.map('gpspro-map', { center, zoom, zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;

    const normal = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const satelite = L.tileLayer(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
      { tileSize: 256, time: 'latest', maxZoom: 9, attribution: 'NASA GIBS' }
    );

    // CARTO Dark (fără cheie)
    const black = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 19, attribution: '&copy; CARTO' });

    baseRef.current = { normal, satelite, black };

    if (clientDest) {
      L.marker([clientDest.lat, clientDest.lng]).addTo(map)
        .bindPopup(`<b>${client?.nombre || 'Cliente'}</b><br/>Destino predefinido`);
    }

    routeLayerRef.current = L.polyline([], { color: '#00e5ff', weight: 5, opacity: 0.9 }).addTo(map);
    vehicleMarkerRef.current = L.marker([0,0], { opacity: 0 }).addTo(map);
  }, [client, clientDest]);

  // switch base layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(baseRef.current).forEach((l) => { try { map.removeLayer(l); } catch {} });
    const layer = baseRef.current[baseName];
    if (layer) layer.addTo(map);
  }, [baseName]);

  // update route + vehicle marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeLayerRef.current || !vehicleMarkerRef.current) return;

    if (points.length > 0) {
      const latlngs = points.map((p) => [p.lat, p.lng]);
      routeLayerRef.current.setLatLngs(latlngs);
      const last = latlngs[latlngs.length - 1];
      vehicleMarkerRef.current.setLatLng(last);
      vehicleMarkerRef.current.setOpacity(1);
      map.panTo(last, { animate: true });
    } else {
      routeLayerRef.current.setLatLngs([]);
      vehicleMarkerRef.current.setOpacity(0);
    }
  }, [points]);

  const handleStartStop = () => {
    if (active) stop(); else { reset(); start(); }
  };

  const handleSave = async () => {
    const geojson = toGeoJSON();
    if (!geojson || points.length < 2) {
      alert('Ruta es demasiado corta para guardar.');
      return;
    }
    if (!isDispecer) {
      alert('Solo el dispecer puede guardar rutas.');
      return;
    }

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

        <div className={styles.mapToolbar}>
          <div className={styles.segmented}>
            <button className={`${styles.segBtn} ${baseName==='normal'?styles.segActive:''}`} onClick={()=> setBaseName('normal')}>Normal</button>
            <button className={`${styles.segBtn} ${baseName==='satelite'?styles.segActive:''}`} onClick={()=> setBaseName('satelite')}>Satélite</button>
            <button className={`${styles.segBtn} ${baseName==='black'?styles.segActive:''}`} onClick={()=> setBaseName('black')}>Black</button>
          </div>

          <div className={styles.controls}>
            <label className={styles.switch}>
              <input type="checkbox" checked={precision} onChange={(e)=> setPrecision(e.target.checked)} />
              <span /> Precisión (100 m)
            </label>

            <button className={`${styles.btn} ${active?styles.btnDanger:styles.btnPrimary}`} onClick={handleStartStop}>
              {active ? 'Detener' : 'Iniciar'}
            </button>

            <button className={styles.btn} onClick={handleSave} disabled={active || saving || points.length < 2}>
              {saving ? 'Guardando…' : 'Guardar ruta'}
            </button>

            <div className={styles.kpis}>
              <span className={styles.kpi}><strong>Puntos:</strong> {points.length}</span>
              <span className={styles.kpi}><strong>Distancia:</strong> {Math.round(distanceM/100)/10} km</span>
            </div>
          </div>
        </div>

        <div id="gpspro-map" className={styles.mapCanvas} />
      </div>
    </div>
  );
}