// src/components/GpsPro/RouteWizard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import styles from './GpsPro.module.css';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';

// mic util pt parsare coordonate "lat, lng"
function parseCoords(str) {
  if (!str) return null;
  const p = String(str).split(',').map(s=>parseFloat(s.trim()));
  if (p.length<2 || isNaN(p[0]) || isNaN(p[1])) return null;
  return { lat: p[0], lng: p[1] };
}
function fmt(lat,lng){ return `${lat.toFixed(6)}, ${lng.toFixed(6)}`; }
function haversineMeters(a,b) {
  const R=6371000; const toRad=x=>x*Math.PI/180;
  const dLat=toRad(b.lat-a.lat); const dLng=toRad(b.lng-a.lng);
  const sa=Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(sa));
}

export default function RouteWizard({ onClose, onOpenMap }) {
  const { profile } = useAuth();
  const canEdit = profile?.role === 'dispecer';

  // taburi: de unde alegi listele
  const [tabOrigin, setTabOrigin] = useState('clientes');
  const [tabDest, setTabDest]     = useState('parkings');

  const [dataOrigin, setDataOrigin] = useState([]);
  const [dataDest, setDataDest]     = useState([]);

  const [origin, setOrigin] = useState(null); // {type,id,label,coords}
  const [dest, setDest]     = useState(null); // {type,id,label,coords}

  const [loading, setLoading] = useState(true);
  const [loadingDest, setLoadingDest] = useState(true);
  const [busy, setBusy] = useState(false);

  const tableByType = (t) => ({
    clientes:  'gps_clientes',
    parkings:  'gps_parkings',
    servicios: 'gps_servicios',
    terminale: 'gps_terminale',
  }[t]);

  // încarcă listele
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from(tableByType(tabOrigin))
        .select('id,nombre,coordenadas,direccion')
        .order('created_at', { ascending: false })
        .limit(200);
      setDataOrigin(error ? [] : (data||[]));
      setLoading(false);
    };
    load();
  }, [tabOrigin]);

  useEffect(() => {
    const load = async () => {
      setLoadingDest(true);
      const { data, error } = await supabase
        .from(tableByType(tabDest))
        .select('id,nombre,coordenadas,direccion')
        .order('created_at', { ascending: false })
        .limit(200);
      setDataDest(error ? [] : (data||[]));
      setLoadingDest(false);
    };
    load();
  }, [tabDest]);

  // GPS ca origine (opțional)
  const useMyGPSAsOrigin = async () => {
    try {
      setBusy(true);
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 8000, maximumAge: 30000
        });
      });
      const o = {
        type: 'gps',
        id: null,
        label: 'Mi posición (GPS)',
        coords: fmt(pos.coords.latitude, pos.coords.longitude),
      };
      setOrigin(o);
    } catch(e) {
      alert('No se pudo obtener tu ubicación GPS.');
    } finally {
      setBusy(false);
    }
  };

  // marchează o parcare "AICI" (din GPS)
  const markParkingHere = async () => {
    try {
      setBusy(true);
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000, maximumAge: 30000
        });
      });
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };

      // caută parcare existentă la < 60m
      const { data: parks, error } = await supabase
        .from('gps_parkings')
        .select('id,nombre,coordenadas')
        .limit(300);
      const found = (parks||[]).find(p => {
        const c = parseCoords(p.coordenadas);
        return c && haversineMeters(c, here) < 60;
      });

      if (found) {
        alert(`Reutilizo: ${found.nombre}`);
        // setează ca DESTINAȚIE intermediară, dacă vrei
        setDest({ type:'parkings', id:found.id, label:found.nombre, coords: found.coordenadas });
      } else {
        // creează una nouă
        const nombre = `Parking ${new Date().toLocaleString()}`;
        const payload = {
          nombre,
          direccion: null,
          link_maps: null,
          detalles: 'Marcat din traseu',
          coordenadas: fmt(here.lat, here.lng),
          link_foto: null,
        };
        const { data: inserted, error: errIns } = await supabase
          .from('gps_parkings').insert([payload]).select().single();
        if (errIns) throw errIns;
        alert('Parcare creată ✅');
        setDest({ type:'parkings', id:inserted.id, label:nombre, coords: payload.coordenadas });
      }
    } catch(e) {
      alert('Nu am reușit să marchez parcarea. Activează GPS-ul.');
    } finally {
      setBusy(false);
    }
  };

  const canOpen = !!origin && !!dest;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>🧭 Planificador de ruta</h3>
          <button className={styles.iconBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {/* ORIGEN */}
          <div style={{marginBottom:12}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
              <div className={styles.destTabs}>
                {['clientes','parkings','servicios','terminale'].map(t => (
                  <button
                    key={t}
                    className={`${styles.btn} ${tabOrigin===t?styles.btnPrimary:''}`}
                    onClick={()=> setTabOrigin(t)}
                  >
                    {t[0].toUpperCase()+t.slice(1)}
                  </button>
                ))}
              </div>
              <button className={styles.btn} onClick={useMyGPSAsOrigin} disabled={busy}>Usar mi GPS</button>
            </div>

            <ul className={styles.destList}>
              {loading ? (
                <li style={{color:'var(--muted)', padding:'8px'}}>Cargando…</li>
              ) : (
                dataOrigin.map(it => (
                  <li key={it.id} style={{marginTop:8}}>
                    <button
                      className={styles.destItem}
                      onClick={() => setOrigin({
                        type: tabOrigin,
                        id: it.id,
                        label: it.nombre,
                        coords: it.coordenadas
                      })}
                    >
                      <div className={styles.destTitle}>{it.nombre}</div>
                      <div className={styles.destSub}>{it.direccion || it.coordenadas || '—'}</div>
                      {origin?.id===it.id && origin?.type===tabOrigin && (
                        <div className={styles.destSub}>✓ Seleccionado</div>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <hr style={{border:'none', borderTop:'1px solid var(--border)', margin:'12px 0'}} />

          {/* DESTINO */}
          <div>
            <div className={styles.destTabs} style={{justifyContent:'space-between', alignItems:'center'}}>
              <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                {['clientes','parkings','servicios','terminale'].map(t => (
                  <button
                    key={t}
                    className={`${styles.btn} ${tabDest===t?styles.btnPrimary:''}`}
                    onClick={()=> setTabDest(t)}
                  >
                    {t[0].toUpperCase()+t.slice(1)}
                  </button>
                ))}
              </div>
              <button className={styles.btn} onClick={markParkingHere} disabled={busy}>
                + Marcar parking AQUI
              </button>
            </div>

            <ul className={styles.destList}>
              {loadingDest ? (
                <li style={{color:'var(--muted)', padding:'8px'}}>Cargando…</li>
              ) : (
                dataDest.map(it => (
                  <li key={it.id} style={{marginTop:8}}>
                    <button
                      className={styles.destItem}
                      onClick={() => setDest({
                        type: tabDest,
                        id: it.id,
                        label: it.nombre,
                        coords: it.coordenadas
                      })}
                    >
                      <div className={styles.destTitle}>{it.nombre}</div>
                      <div className={styles.destSub}>{it.direccion || it.coordenadas || '—'}</div>
                      {dest?.id===it.id && dest?.type===tabDest && (
                        <div className={styles.destSub}>✓ Seleccionado</div>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className={styles.modalFooter} style={{justifyContent:'space-between'}}>
          <div className={styles.kpis}>
            <span className={styles.kpi}><strong>Origen:</strong> {origin?.label || '—'}</span>
            <span className={styles.kpi}><strong>Destino:</strong> {dest?.label || '—'}</span>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button className={styles.btn} onClick={onClose}>Cancelar</button>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => onOpenMap(
                { ...origin, _subject: origin },
                { ...dest }
              )}
              disabled={!canOpen}
            >
              Deschide harta →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}