// src/components/GpsPro/DrawRouteModal.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../supabaseClient';

// fix default marker icons in Leaflet (vite)
import icon2x from 'leaflet/dist/images/marker-icon-2x.png';
import icon1x from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: icon2x,
  iconUrl: icon1x,
  shadowUrl: iconShadow,
});

// ————————————————————————————————————————————————
// Helpers
// ————————————————————————————————————————————————
const ORIGIN_COLOR = '#2E86DE';
const DEST_COLOR = '#E74C3C';
const PATH_COLOR = '#27AE60';

function parseCoords(strOrObj) {
  if (!strOrObj) return null;
  if (typeof strOrObj === 'string') {
    const [lat, lon] = strOrObj.split(',').map(s => Number(s.trim()));
    if (Number.isFinite(lat) && Number.isFinite(lon)) return [lat, lon];
    return null;
  }
  if (Array.isArray(strOrObj) && strOrObj.length === 2) {
    const a = Number(strOrObj[0]); const b = Number(strOrObj[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) return [a, b];
  }
  if (typeof strOrObj === 'object') {
    const lat = Number(strOrObj.lat ?? strOrObj.latitude);
    const lon = Number(strOrObj.lon ?? strOrObj.lng ?? strOrObj.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return [lat, lon];
  }
  return null;
}

function toFeatureCollectionLineString(latlngs) {
  const coords = latlngs.map(([lat, lon]) => [lon, lat]); // GeoJSON = [lon,lat]
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: coords }
    }]
  };
}

// haversine (metri)
function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 6371000;
  const toRad = (v) => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(toRad(lat1))*Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function pathDistanceMeters(latlngs) {
  let d = 0;
  for (let i=1;i<latlngs.length;i++) d += haversine(latlngs[i-1], latlngs[i]);
  return Math.round(d);
}

function PolyEditLayer({ points, setPoints }) {
  // Click pe hartă = adaugă punct
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPoints(prev => [...prev, [lat, lng]]);
    }
  });

  const map = useMapEvents({});
  // Fit bounds când punctele cresc
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map(([lat, lon]) => [lat, lon]));
      map.fitBounds(bounds.pad(0.2));
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [points, map]);

  return null;
}

function DraggableMarker({ idx, pos, onMove, color }) {
  const markerRef = useRef(null);
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
      popupAnchor: [0, -36],
      shadowUrl: iconShadow,
      shadowSize: [41, 41],
      shadowAnchor: [13, 40],
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
        }
      }}
      icon={icon}
      ref={markerRef}
    />
  );
}

// ————————————————————————————————————————————————
// Componente UI
// ————————————————————————————————————————————————
const headerBtn = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,.2)',
  background: 'rgba(0,0,0,.6)',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const chip = {
  padding: '4px 10px',
  borderRadius: 999,
  background: 'rgba(255,255,255,.08)',
  border: '1px solid rgba(255,255,255,.15)',
  color: '#fff',
  fontSize: 12,
};

// ————————————————————————————————————————————————
// MAIN: DrawRouteModal
// ————————————————————————————————————————————————
/**
 * Mod de utilizare:
 *  - se poate deschide fără subiect (generic) -> utilizatorul alege Origine/Destinație din liste
 *  - sau cu prop `subject` (preselectare), dar nu e obligatoriu
 *
 * Props:
 *  - subject?: { type: 'clientes'|'terminale'|'servicios'|'parkings', id, label, coords }
 *  - onClose(): void
 *  - onSave({ geojson, points, distance_m }): Promise|void
 */
export default function DrawRouteModal({ subject = null, onClose, onSave }) {
  // 1) Listele pentru selecția Origine/Destinație
  const [loadingLists, setLoadingLists] = useState(true);
  const [clients, setClients] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [services, setServices] = useState([]);
  const [parkings, setParkings] = useState([]);

  const [originSel, setOriginSel] = useState({ type: '', id: '', label: '', coords: '' });
  const [destSel, setDestSel] = useState({ type: '', id: '', label: '', coords: '' });

  // 2) Puncte de desen (lat, lng)
  const [points, setPoints] = useState([]);
  // 3) Zoom snap toggle (80m ↔ 1km)
  const [tightZoom, setTightZoom] = useState(true); // true => ~80–100m, false => ~1km

  // Preselectare dacă avem subject primit
  useEffect(() => {
    if (subject?.coords) {
      const p = parseCoords(subject.coords);
      if (p) setPoints([p]); // punem ca punct inițial
    }
  }, [subject]);

  // Încarcă listele
  useEffect(() => {
    (async () => {
      setLoadingLists(true);
      const load = async (table) => {
        const { data, error } = await supabase
          .from(table)
          .select('id,nombre,coordenadas')
          .order('nombre',{ ascending:true });
        if (error) throw error;
        return (data || []).map(r => ({
          id: r.id,
          label: r.nombre,
          coords: r.coordenadas || null
        }));
      };
      try {
        const [cl, te, se, pa] = await Promise.all([
          load('gps_clientes'),
          load('gps_terminale'),
          load('gps_servicios'),
          load('gps_parkings'),
        ]);
        setClients(cl); setTerminals(te); setServices(se); setParkings(pa);
      } catch (e) {
        console.error(e);
        alert('Nu s-au putut încărca listele (clientes/terminales/servicios/parkings).');
      } finally {
        setLoadingLists(false);
      }
    })();
  }, []);

  // Actualizează punctele când alegem Origine/Destinație din liste
  useEffect(() => {
    const o = parseCoords(originSel.coords);
    const d = parseCoords(destSel.coords);
    if (o && d) {
      // inițializează cu capete + un punct intermediar drept ghid
      setPoints([o, d]);
    } else if (o && (!d)) {
      setPoints([o]);
    }
  }, [originSel, destSel]);

  const dist = useMemo(() => (points.length >= 2 ? pathDistanceMeters(points) : 0), [points]);

  // Zoom recomandat
  const mapInitial = useMemo(() => {
    const center = points[0] || [45.9432, 24.9668]; // fallback RO
    return { center, zoom: tightZoom ? 17 : 14 }; // ~100m vs ~1km
  }, [points, tightZoom]);

  // Mută un punct existent
  const movePoint = (i, p) => {
    setPoints(prev => {
      const copy = prev.slice();
      copy[i] = p;
      return copy;
    });
  };

  // Șterge ultimul punct
  const removeLast = () => setPoints(prev => prev.slice(0, -1));

  // Resetează path-ul dar păstrează capetele din selecții (dacă există)
  const resetPath = () => {
    const o = parseCoords(originSel.coords);
    const d = parseCoords(destSel.coords);
    if (o && d) setPoints([o, d]);
    else if (o) setPoints([o]);
    else setPoints([]);
  };

  // Salvează
  const handleSave = async () => {
    if (points.length < 2) return alert('Desenează cel puțin două puncte (origine + destinație).');

    const payload = {
      geojson: toFeatureCollectionLineString(points),
      points: points.map(([lat, lon]) => ({ lat, lon })),
      distance_m: dist,
      meta: {
        origin: originSel,
        destination: destSel,
        source: 'dibujar',
      },
    };

    // trimite înapoi spre caller
    await Promise.resolve(onSave?.(payload));
  };

  // UI pentru listele Origine/Destinație
  const SelectList = ({ label, value, setValue }) => {
    return (
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ color: '#fff', fontSize: 12, opacity: .8 }}>{label}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8 }}>
          <select
            value={value.type}
            onChange={e => setValue(v => ({ ...v, type: e.target.value, id: '', label: '', coords: '' }))}
            style={{ padding: 8, borderRadius: 8 }}
          >
            <option value="">— tip —</option>
            <option value="clientes">Cliente</option>
            <option value="terminale">Terminal</option>
            <option value="servicios">Servicio</option>
            <option value="parkings">Parking</option>
          </select>

          <select
            value={value.id}
            onChange={e => {
              const id = e.target.value;
              let list = [];
              if (value.type === 'clientes') list = clients;
              if (value.type === 'terminale') list = terminals;
              if (value.type === 'servicios') list = services;
              if (value.type === 'parkings') list = parkings;
              const item = list.find(x => String(x.id) === String(id));
              setValue({
                type: value.type,
                id,
                label: item?.label || '',
                coords: item?.coords || '',
              });
            }}
            disabled={!value.type}
            style={{ padding: 8, borderRadius: 8 }}
          >
            <option value="">— alege —</option>
            {(value.type === 'clientes' ? clients :
              value.type === 'terminale' ? terminals :
              value.type === 'servicios' ? services :
              value.type === 'parkings' ? parkings : []
            ).map(it => (
              <option key={it.id} value={it.id}>{it.label}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: '#0b1628',
        display: 'grid', gridTemplateRows: 'auto 1fr',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,.08)',
          background: 'linear-gradient(180deg, rgba(5,12,25,.85), rgba(5,12,25,.65))',
          backdropFilter: 'blur(8px)',
          position: 'sticky', top: 0, zIndex: 2,
        }}
      >
        <div style={{ ...chip, fontWeight: 700, letterSpacing: .3 }}>Dibujar rută</div>

        {/* Origine / Destinație */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <SelectList label="Origine" value={originSel} setValue={setOriginSel} />
          <span style={{ color: '#fff', opacity: .6, fontSize: 12 }}>→</span>
          <SelectList label="Destinație" value={destSel} setValue={setDestSel} />
        </div>

        <div style={{ flex: 1 }} />

        {/* Info distanță */}
        <div style={chip}>Distanță: {dist ? `${(dist/1000).toFixed(2)} km` : '—'}</div>

        {/* Toggle zoom 80m ↔ 1km */}
        <button
          style={headerBtn}
          onClick={() => setTightZoom(v => !v)}
          title="Comută zoom 80m ↔ 1km"
        >
          {tightZoom ? '≈80 m' : '≈1 km'}
        </button>

        {/* Reset / Undo */}
        <button style={headerBtn} onClick={removeLast} title="Șterge ultimul punct">Undo</button>
        <button style={headerBtn} onClick={resetPath} title="Resetează traseul">Reset</button>

        {/* Salvare / Închidere */}
        <button
          style={{ ...headerBtn, background: '#1f6feb' }}
          onClick={handleSave}
          title="Salvează ruta desenată"
        >
          Salvează
        </button>
        <button style={headerBtn} onClick={onClose} title="Închide">Închide ✕</button>
      </div>

      {/* HARTA */}
      <div style={{ position: 'relative' }}>
        <MapContainer
          center={mapInitial.center}
          zoom={mapInitial.zoom}
          style={{ height: 'calc(100vh - 64px)', width: '100vw' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          {/* Layer pt click + fit bounds */}
          <PolyEditLayer points={points} setPoints={setPoints} />

          {/* Markere: primul = origine (albastru), ultimul = destinație (roșu),
              intermediare = albastre deschise */}
          {points.map((p, i) => (
            <DraggableMarker
              key={i}
              idx={i}
              pos={p}
              onMove={movePoint}
              color={i === 0 ? ORIGIN_COLOR : (i === points.length - 1 ? DEST_COLOR : '#00BCD4')}
            />
          ))}

          {/* Linia traseului */}
          {points.length >= 2 && (
            <Polyline positions={points} pathOptions={{ color: PATH_COLOR, weight: 6, opacity: 0.9 }} />
          )}
        </MapContainer>

        {/* Hint click */}
        {points.length === 0 && (
          <div
            style={{
              position: 'absolute', left: 12, bottom: 12, padding: '8px 12px',
              background: 'rgba(0,0,0,.6)', color: '#fff', borderRadius: 8, fontSize: 13
            }}
          >
            Click pe hartă pentru a adăuga puncte (trage markerele pentru ajustare).
          </div>
        )}
      </div>
    </div>
  );
}