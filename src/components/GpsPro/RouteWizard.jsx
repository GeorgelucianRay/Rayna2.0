// src/components/GpsPro/RouteWizard.jsx

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient'; // Asigură-te că calea este corectă
import { fetchTruckRouteORS } from './utils/routeService'; // Asigură-te că calea este corectă
import { saveRouteToDb } from './utils/dbRoutes'; // Asigură-te că calea este corectă
import reverseRouteGeoJSON from './utils/reverseRouteGeoJSON'; // Asigură-te că calea este corectă
import styles from './GpsPro.module.css'; // Asigură-te că calea este corectă

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
        // Obține locația GPS a utilizatorului
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              setItems([
                {
                  id: 'current_location', // Un ID unic pentru a evita conflicte
                  nombre: 'Poziția mea curentă',
                  coordenadas: `${latitude},${longitude}`,
                  detalles: 'Detectată prin GPS',
                },
              ]);
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
      // Încarcă datele din tabela Supabase corespunzătoare
      const { data, error } = await supabase
        .from(`gps_${table}`)
        .select('id, nombre, coordenadas, detalles')
        .ilike('nombre', term ? `%${term}%` : '%')
        .order('nombre', { ascending: true })
        .limit(100); // Limitează numărul de rezultate pentru performanță

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

      // 1. Cere ruta pentru camioane de la OpenRouteService (A -> B)
      const { geojson, distance_m, duration_s } = await fetchTruckRouteORS({
        origin,
        destination,
        apiKey,
      });

      const now = new Date().toLocaleString('ro-RO');
      const baseName = `${origin.label} → ${destination.label}`;
      const nameAB = `Ruta ${baseName} · ${now}`;

      // 2. Salvează ruta A -> B în baza de date folosind NOUA STRUCTURĂ
      await saveRouteToDb({
        name: nameAB,
        origin_type: origin.type,
        origin_id: origin.id,
        destination_type: destination.type,
        destination_id: destination.id,
        mode: 'service',
        provider: 'ors',
        geojson,
        points: null,
        distance_m,
        duration_s,
        round_trip: false,
        sampling: { mode: 'api', threshold_m: null },
        meta: { origin, destination, direction: 'A→B' },
      });

      // 3. (Opțional) Generează și salvează ruta inversă (B -> A)
      const nameBA = `Ruta ${destination.label} → ${origin.label} · ${now}`;
      const geojsonBA = reverseRouteGeoJSON(geojson);

      await saveRouteToDb({
        name: nameBA,
        origin_type: destination.type, // Acum originea este vechea destinație
        origin_id: destination.id,
        destination_type: origin.type, // Și destinația este vechea origine
        destination_id: origin.id,
        mode: 'service',
        provider: 'ors',
        geojson: geojsonBA,
        points: null,
        distance_m,
        duration_s,
        round_trip: false,
        sampling: { mode: 'api', threshold_m: null },
        meta: { origin: destination, destination: origin, direction: 'B→A' },
      });

      alert('Rutele (directă și inversă) au fost salvate cu succes!');
      onClose(); // Închide fereastra modală după ce s-a terminat
    } catch (e) {
      console.error(e);
      alert(`A apărut o eroare la generarea rutei (API): ${e.message || e}`);
      setIsSaving(false);
    }
  }, [onClose]);

  const handlePick = (item) => {
    if (step === 1) {
      setOrigin(item);
      setStep(2); // Trece automat la pasul 2 după selectarea originii
      setTab('clientes'); // Resetează tab-ul pentru destinație
      setTerm(''); // Resetează termenul de căutare
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
          {/* Navigare prin Tab-uri */}
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
          {/* Căutare și Listă */}
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
