// RouteWizard.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { fetchTruckRouteORS } from './utils/routeService';
import { saveRouteToDb } from './utils/dbRoutes';
import reverseRouteGeoJSON from './utils/reverseRouteGeoJSON';
import styles from './GpsPro.module.css';

// meniul de tab-uri conține și varianta „current” pentru poziția curentă
const TABS = ['current','clientes','parkings','servicios','terminale'];

// listează elementele în funcție de tab (la 'current' se folosește navigator.geolocation)
function List({ table, term, onPick }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    async function run() {
      if (table === 'current') {
        // obține poziția GPS
        navigator.geolocation.getCurrentPosition((pos) => {
          const { latitude, longitude } = pos.coords;
          setItems([{
            id: 'current',
            nombre: 'Poziţie curentă',
            coordenadas: `${latitude},${longitude}`,
            detalles: 'GPS'
          }]);
        });
        return;
      }
      // încarcă din supabase
      const { data, error } = await supabase
        .from(`gps_${table}`)
        .select('id,nombre,coordenadas,detalles')
        .ilike('nombre', term ? `%${term}%` : '%')
        .order('nombre', { ascending: true })
        .limit(300);
      setItems(error ? [] : (data || []));
    }
    run();
  }, [table, term]);

  return (
    <ul className={styles.destList}>
      {items.map(it => (
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

// componenta RouteWizard
export default function RouteWizard({ onClose }) {
  const [step, setStep] = useState(1); // 1=origine, 2=destinaţie
  const [tab, setTab] = useState('clientes');
  const [term, setTerm] = useState('');
  const [origin, setOrigin] = useState(null);
  const [dest, setDest] = useState(null);

  const onDone = useCallback(async (origin, destination) => {
    try {
      const apiKey = import.meta.env.VITE_ORS_KEY;
      if (!apiKey) {
        alert('Setează cheia VITE_ORS_KEY în variabilele de mediu.');
        return;
      }

      // cere ruta camion de la ORS (OpenRouteService)
      const { geojson, distance_m, duration_s } = await fetchTruckRouteORS({
        origin,
        destination,
        apiKey
      });

      const now = new Date().toLocaleString();
      const baseName = `${origin.label} → ${destination.label}`;
      const nameAB = `Ruta ${baseName} · ${now}`;

      // poţi salva întotdeauna id-ul selecţiei ca client_id; dacă e terminal/parcare/serviciu, îl poţi pune şi în origin_terminal_id
      const clientId = origin.id ?? null;

      await saveRouteToDb({
        client_id: clientId,
        origin_terminal_id: null,
        name: nameAB,
        mode: 'service',
        provider: 'ors',
        geojson,
        points: null,
        distance_m,
        duration_s,
        round_trip: false,
        sampling: { mode: 'api', threshold_m: null },
        meta: { origin, destination, direction: 'A→B' },
        created_by: null
      });

      // opţional, salvezi şi ruta inversă
      const nameBA = `Ruta ${destination.label} → ${origin.label} · ${now}`;
      const geojsonBA = reverseRouteGeoJSON(geojson);

      await saveRouteToDb({
        client_id: clientId,
        origin_terminal_id: null,
        name: nameBA,
        mode: 'service',
        provider: 'ors',
        geojson: geojsonBA,
        points: null,
        distance_m,
        duration_s,
        round_trip: false,
        sampling: { mode: 'api', threshold_m: null },
        meta: { origin: destination, destination: origin, direction: 'B→A' },
        created_by: null
      });

      // închide după salvare
      onClose();
    } catch (e) {
      console.error(e);
      alert(`Eroare rută (API): ${e.message || e}`);
    }
  }, [onClose]);

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{step === 1 ? 'Alege origine' : 'Alege destinaţie'}</h3>
          <button className={styles.iconBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          {/* Tabs */}
          <div className={styles.destTabs}>
            {TABS.map(t => (
              <button
                key={t}
                className={`${styles.navBtn} ${tab === t ? styles.navBtnActive : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'current' ? 'Poziţie curentă' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {/* Căutare + listă */}
          <div className={styles.search} style={{ marginTop: 8 }}>
            <input placeholder="Caută după nume…" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <List table={tab} term={term} onPick={(val) => {
            if (step === 1) {
              setOrigin(val);
            } else {
              setDest(val);
            }
          }} />
        </div>
        <div className={styles.modalFooter} style={{ justifyContent: 'space-between' }}>
          <div style={{ color: 'var(--muted)' }}>
            {origin ? <>Origine: <strong style={{ color: 'var(--text)' }}>{origin.label}</strong></> : '—'}
            {dest && <> · Dest: <strong style={{ color: 'var(--text)' }}>{dest.label}</strong></>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {step === 2 && <button className={styles.btn} onClick={() => setStep(1)}>Înapoi</button>}
            {step === 1 && (
              <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={!origin} onClick={() => setStep(2)}>
                Înainte →
              </button>
            )}
            {step === 2 && (
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={!origin || !dest}
                onClick={() => onDone(origin, dest)}
              >
                Cere ruta
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}