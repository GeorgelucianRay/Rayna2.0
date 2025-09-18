// src/components/GpsPro/MapPanel.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './GpsPro.module.css';
import useRouteRecorder, { parseCoords } from './hooks/useRouteRecorder';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';

// fix icons in Leaflet (optional, dacă ai deja global, poți elimina)
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = new L.Icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapPanel({ client, onClose }) {
  const mapRef = useRef(null);
  const layerRef = useRef({}); // stocăm layerele pentru switch
  const routeLayerRef = useRef(null);
  const vehicleMarkerRef = useRef(null);

  const { user, profile } = useAuth();
  const isDispecer = profile?.role === 'dispecer';

  const [baseName, setBaseName] = useState('normal'); // normal | satelite | black
  const [saving, setSaving] = useState(false);

  const {
    active, precision, setPrecision,
    points, distanceM,
    start, stop, reset, toGeoJSON
  } = useRouteRecorder();

  // destinatión presetată a clientului
  const clientDest = useMemo(() => {
    // prefer dest_coords; fallback pe coordenadas
    return parseCoords(client?.dest_coords || client?.coordenadas || null);
  }, [client]);

  // inițializează harta
  useEffect(() => {
    if (mapRef.current) return; // deja creată
    const map = L.map('gpspro-map', {
      center: clientDest ? [clientDest.lat, clientDest.lng] : [41.390205, 2.154007], // Barcelona fallback
      zoom: clientDest ? 12 : 6,
      zoomControl: false
    });
    mapRef.current = map;

    // controale
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // layere baza
    const normal = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // NASA GIBS TrueColor (zoom <= 9)
    const satelite = L.tileLayer(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
      { tileSize: 256, time: 'latest', maxZoom: 9, attribution: 'NASA GIBS' }
    );

    // CARTO Dark Matter (fără cheie)
    const black = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 19, attribution: '&copy; CARTO' }
    );

    layerRef.current = { normal, satelite, black };

    // marker destinație client (dacă avem)
    if (clientDest) {
      L.marker([clientDest.lat, clientDest.lng]).addTo(map)
        .bindPopup(`<b>${client?.nombre || 'Cliente'}</b><br/>Destino presetado`);
    }

    // strat polilinie rută
    routeLayerRef.current = L.polyline([], { color: '#00e5ff', weight: 5, opacity: 0.9 }).addTo(map);

    // marker vehicul (poziția curentă)
    vehicleMarkerRef.current = L.marker([0, 0], { opacity: 0 }).addTo(map); // ascuns până primim poziție
  }, [client, clientDest]);

  // comută stratul de bază
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layerRef.current) return;
    // scoate toate baza
    Object.values(layerRef.current).forEach((l) => map.removeLayer(l));
    // adaugă stratul ales
    const layer = layerRef.current[baseName];
    if (layer) layer.addTo(map);
  }, [baseName]);

  // actualizează ruta și markerul vehiculului
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeLayerRef.current || !vehicleMarkerRef.current) return;

    if (points.length > 0) {
      const latlngs = points.map((p) => [p.lat, p.lng]);
      routeLayerRef.current.setLatLngs(latlngs);

      // marker vehicul = ultimul punct
      const last = latlngs[latlngs.length - 1];
      vehicleMarkerRef.current.setLatLng(last);
      vehicleMarkerRef.current.setOpacity(1);

      map.panTo(last, { animate: true });
    } else {
      routeLayerRef.current.setLatLngs([]);
      vehicleMarkerRef.current.setOpacity(0);
    }
  }, [points]);

  const handleStartStop = async () => {
    if (active) {
      stop();
    } else {
      reset(); // curățăm orice rămășiță
      start();
    }
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
        origin_terminal_id: null, // dacă ai un terminal selectat, pune-l aici
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
        created_by: (/* user id dacă îl ai */ null),
      };

      // dacă folosești RLS pe created_by, setează auth id
      // const { user } = supabase.auth; // în unele versiuni e supabase.auth.getUser()
      // payload.created_by = user?.id || null;

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