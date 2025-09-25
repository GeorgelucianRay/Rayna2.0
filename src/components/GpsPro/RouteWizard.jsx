import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { fetchTruckRouteORS } from './utils/routeService';
import { saveRouteToDb } from './utils/dbRoutes';
import reverseRouteGeoJSON from './utils/reverseRouteGeoJSON';
import styles from './GpsPro.module.css'; // Calea corectată

// Meniul de tab-uri: 'current' este pentru locația GPS curentă
const TABS = ['clientes', 'parkings', 'servicios', 'terminale', 'current'];
const TAB_NAMES = {
  clientes: 'Clienți',
  parkings: 'Parkinguri',
  servicios: 'Servicii',
  terminale: 'Terminale',
  current: 'Poziție Curentă',
};

// Componentă internă pentru a afișa lista de locații dintr-un tab
function List({ table, term, onPick }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function run() {
      setLoading(true);
      if (table === 'current') {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              setItems([{
                id: 'current_location',
                nombre: 'Poziția mea curentă',
                coordenadas: `${latitude},${longitude}`,
                detalles: 'Detectată prin GPS',
              }]);
              setLoading(false);
            },
            (err) => {
              console.error(err);
              alert('Nu am putut obține locația GPS. Vă rugăm activați permisiunile.');
              setItems([]);
              setLoading(false);
            }
          );
        }
        return;
      }
      
      const { data, error } = await supabase
        .from(`gps_${table}`)
        .select('id, nombre, coordenadas, detalles')
        .ilike('nombre', term ? `%${term}%` : '%')
        .order('nombre', { ascending: true })
        .limit(100);

      setItems(error ? [] : data || []);
      setLoading(false);
    }
    run();
  }, [table, term]);

  if (loading) {
    return <div className={styles.loading}>Se încarcă...</div>;
  }

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

// Componenta principală RouteWizard
export default function RouteWizard({ onClose }) {
  const [step, setStep] = useState(1); // 1 = alege origine, 2 = alege destinație
  const [tab, setTab] = useState('clientes');
  const [term, setTerm] = useState('');
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerateAndSaveRoutes = useCallback(async (origin, destination) => {
    if (!origin || !destination) {
      alert('Vă rugăm selectați atât o origine, cât și o destinație.');
      return;
    }
    setIsSaving(true);

    try {
      const apiKey = import.meta.env.VITE_ORS_KEY;
      if (!apiKey) {
        alert('Lipsește cheia VITE_ORS_KEY. Seteaz-o în variabilele de mediu ale proiectului.');
        setIsSaving(false);
        return;
      }

      const { geojson, distance_m, duration_s } = await fetchTruckRouteORS({
        origin,
        destination,
        apiKey,
      });

      const now = new Date().toLocaleString('ro-RO');
      const baseName = `${origin.label} → ${destination.label}`;
      const nameAB = `Ruta ${baseName} · ${now}`;

      await saveRouteToDb({
        name: nameAB,
        origin_type: origin.type,
        origin_id: origin.id,
        destination_type: destination.type,
        destination_id: destination.id,
        mode: 'service',
        provider: 'ors',
        geojson,
        distance_m,
        duration_s,
        meta: { origin, destination, direction: 'A→B' },
      });

      const nameBA = `Ruta ${destination.label} → ${origin.label} · ${now}`;
      const geojsonBA = reverseRouteGeoJSON(geojson);

      await saveRouteToDb({
        name: nameBA,
        origin_type: destination.type,
        origin_id: destination.id,
        destination_type: origin.type,
        destination_id: origin.id,
        mode: 'service',
        provider: 'ors',
        geojson: geojsonBA,
        distance_m,
        duration_s,
        meta: { origin: destination, destination: origin, direction: 'B→A' },
      });

      alert('Rutele (directă și inversă) au fost salvate cu succes!');
      onClose();
    } catch (e) {
      console.error(e);
      alert(`A apărut o eroare la generarea rutei (API): ${e.message || e}`);
      setIsSaving(false);
    }
  }, [onClose]);

  const handlePick = (item) => {
    if (step === 1) {
      setOrigin(item);
      setStep(2);
      setTab('clientes');
      setTerm('');
    } else {
      setDestination(item);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{step === 1 ? 'Pasul 1: Alege Originea' : 'Pasul 2: Alege Destinația'}</h3>
          <button className={styles.iconBtn} onClick={onClose} disabled={isSaving}>
            ✕
          </button>
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
          {tab !== 'current' && (
            <div className={styles.search} style={{ marginTop: 8 }}>
              <input
                placeholder="Caută după nume…"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
          )}
          <List table={tab} term={term} onPick={handlePick} />
        </div>
        <div className={styles.modalFooter} style={{ justifyContent: 'space-between' }}>
          <div style={{ color: 'var(--muted)', maxWidth: '50%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {origin ? <>Origine: <strong style={{ color: 'var(--text)' }}>{origin.label}</strong></> : '...'}
            {destination && <> · Dest.: <strong style={{ color: 'var(--text)' }}>{destination.label}</strong></>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {step === 2 && (
              <button className={styles.btn} onClick={() => { setStep(1); setDestination(null); }} disabled={isSaving}>
                Înapoi
              </button>
            )}
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={!origin || !destination || isSaving}
              onClick={() => handleGenerateAndSaveRoutes(origin, destination)}
            >
              {isSaving ? 'Se salvează...' : 'Generează Ruta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
