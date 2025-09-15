// src/components/nomina/ParteDiarioModal.jsx
import React, { useState } from 'react';
// LINIA CORECTĂ ✅
import { supabase } from '../supabaseClient';

import styles from './Nominas.module.css';

// --- Icoane ---
const CloseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg> );
const GpsFixedIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /></svg> );
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg> );

// Funcție pentru calculul distanței (formula Haversine)
function haversineDistance(coords1, coords2) {
  function toRad(x) { return x * Math.PI / 180; }
  const R = 6371; // Raza Pământului în km
  const dLat = toRad(coords2.lat - coords1.lat);
  const dLon = toRad(coords2.lon - coords1.lon);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(coords1.lat)) * Math.cos(toRad(coords2.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distanța în km
}

export default function ParteDiarioModal({
  isOpen, onClose, data, onDataChange, onToggleChange, onCurseChange, day, monthName, year
}) {
  const [isLocating, setIsLocating] = useState(null); // Stochează { index, field } pentru butonul activ

  if (!isOpen) return null;

  const onNum = (e) => {
    const { name, value } = e.target;
    onDataChange(name, value === '' ? '' : Number(value));
  };

  const kmIniciar = data?.km_iniciar ?? '';
  const kmFinal = data?.km_final ?? '';
  const kmDiff = (Number(kmFinal || 0) - Number(kmIniciar || 0));
  const kmShow = kmDiff > 0 ? kmDiff : 0;

  // --- Funcții pentru gestionarea curselor ---
  const handleCursaChange = (index, field, value) => {
    const newCurse = [...(data.curse || [])];
    newCurse[index] = { ...newCurse[index], [field]: value };
    onCurseChange(newCurse);
  };

  const addCursa = () => {
    const newCurse = [...(data.curse || []), { start: '', end: '', km: '' }];
    onCurseChange(newCurse);
  };

  const removeCursa = (index) => {
    const newCurse = (data.curse || []).filter((_, i) => i !== index);
    onCurseChange(newCurse);
  };

  // --- Logica pentru găsirea locației prin GPS ---
  const handleFindLocationByCoords = async (index, field) => {
    setIsLocating({ index, field });

    if (!navigator.geolocation) {
      alert('Geolocalizarea nu este suportată de acest browser.');
      setIsLocating(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const currentLocation = { lat: latitude, lon: longitude };

      try {
        const tableNames = ['gps_clientes', 'gps_parkings', 'gps_servicios', 'gps_terminale'];
        const promises = tableNames.map(table => supabase.from(table).select('nombre, coordenadas'));
        const results = await Promise.all(promises);

        let allLocations = [];
        results.forEach(res => { if (res.data) allLocations = allLocations.concat(res.data); });

        const nearbyLocations = allLocations
          .map(loc => {
            if (!loc.coordenadas) return null;
            const [lat, lon] = loc.coordenadas.split(',').map(s => parseFloat(s.trim()));
            if (isNaN(lat) || isNaN(lon)) return null;

            const distance = haversineDistance(currentLocation, { lat, lon });
            return { name: loc.nombre, distance };
          })
          .filter(loc => loc && loc.distance <= 0.2); // Raza de 200 de metri

        if (nearbyLocations.length > 0) {
          nearbyLocations.sort((a, b) => a.distance - b.distance);
          const closestLocation = nearbyLocations[0];
          handleCursaChange(index, field, closestLocation.name);
        } else {
          alert('Nu s-a găsit nicio locație înregistrată în apropiere (rază 200m).');
        }

      } catch (error) {
        console.error('Error fetching locations:', error);
        alert('A apărut o eroare la căutarea locațiilor.');
      } finally {
        setIsLocating(null);
      }
    }, (error) => {
      alert(`Eroare la obținerea locației GPS: ${error.message}`);
      setIsLocating(null);
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Parte Diario — {day} {monthName} {year}</h3>
          <button className={styles.closeIcon} onClick={onClose}><CloseIcon /></button>
        </div>

        <div className={styles.modalBody}>
          {/* SECȚIUNEA 1: DIETAS (Neschimbată) */}
          <div className={styles.parteDiarioSection}>
            <h4>Dietas</h4>
            <div className={styles.checkboxGroupModal}>
              <label><input type="checkbox" checked={!!data?.desayuno} onChange={() => onToggleChange('desayuno')} /> Desayuno</label>
              <label><input type="checkbox" checked={!!data?.cena} onChange={() => onToggleChange('cena')} /> Cena</label>
              <label><input type="checkbox" checked={!!data?.procena} onChange={() => onToggleChange('procena')} /> Procena</label>
            </div>
          </div>

          {/* SECȚIUNEA 2: KILÓMETROS (Neschimbată) */}
          <div className={styles.parteDiarioSection}>
            <h4>Kilómetros</h4>
            <div className={styles.inputGrid}>
              <div className={styles.inputGroup}>
                <label>KM Iniciar</label>
                <input type="number" name="km_iniciar" value={kmIniciar} onChange={onNum}/>
              </div>
              <div className={styles.inputGroup}>
                <label>KM Final</label>
                <input type="number" name="km_final" value={kmFinal} onChange={onNum}/>
              </div>
            </div>
            <p className={styles.kmPreview}>Kilómetros del día: <b>{kmShow}</b></p>
          </div>
          
          {/* SECȚIUNEA 3: CURSE (NOUĂ) */}
          <div className={styles.parteDiarioSection}>
            <h4>Carreras del día (Jornal)</h4>
            <div className={styles.curseList}>
              {(data.curse || []).map((cursa, index) => (
                <div key={index} className={styles.cursaItem}>
                  <div className={styles.cursaInputs}>
                    <div className={styles.inputGroup}>
                      <label>Salida</label>
                      <div className={styles.inputWithButton}>
                        <input type="text" value={cursa.start || ''} onChange={(e) => handleCursaChange(index, 'start', e.target.value)} placeholder="Ej: Parking" />
                        <button onClick={() => handleFindLocationByCoords(index, 'start')} disabled={isLocating}>
                          {isLocating?.index === index && isLocating?.field === 'start' ? '...' : <GpsFixedIcon />}
                        </button>
                      </div>
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Llegada</label>
                      <div className={styles.inputWithButton}>
                        <input type="text" value={cursa.end || ''} onChange={(e) => handleCursaChange(index, 'end', e.target.value)} placeholder="Ej: TCB" />
                        <button onClick={() => handleFindLocationByCoords(index, 'end')} disabled={isLocating}>
                          {isLocating?.index === index && isLocating?.field === 'end' ? '...' : <GpsFixedIcon />}
                        </button>
                      </div>
                    </div>
                    <div className={`${styles.inputGroup} ${styles.kmField}`}>
                      <label>KM</label>
                      <input type="number" value={cursa.km || ''} onChange={(e) => handleCursaChange(index, 'km', e.target.value)} placeholder="Ref." />
                    </div>
                  </div>
                  <button className={styles.removeCursaButton} onClick={() => removeCursa(index)}><TrashIcon /></button>
                </div>
              ))}
            </div>
            <button className={styles.addCursaButton} onClick={addCursa}>+ Añadir Carrera</button>
          </div>

          {/* SECȚIUNEA 4: ACTIVITĂȚI SPECIALE (Neschimbată) */}
          <div className={styles.parteDiarioSection}>
            <h4>Actividades especiales</h4>
            <div className={styles.inputGrid}>
              <div className={styles.inputGroup}>
                <label>Contenedores barridos</label>
                <input type="number" name="contenedores" value={data?.contenedores ?? ''} onChange={onNum}/>
              </div>
              <div className={styles.inputGroup}>
                <label>Suma festivo/plus (€)</label>
                <input type="number" name="suma_festivo" value={data?.suma_festivo ?? ''} onChange={onNum}/>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.actionMini} type="button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
