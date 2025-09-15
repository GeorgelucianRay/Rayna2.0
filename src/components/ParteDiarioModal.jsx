// src/components/nomina/ParteDiarioModal.jsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import styles from './Nominas.module.css';
import SearchableInput from './SearchableInput'; // Importăm noua componentă

// --- Icoane ---
const CloseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg> );
const GpsFixedIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /></svg> );
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg> );

function haversineDistance(coords1, coords2) {
    function toRad(x) { return x * Math.PI / 180; }
    const R = 6371; const dLat = toRad(coords2.lat - coords1.lat);
    const dLon = toRad(coords2.lon - coords1.lon);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(coords1.lat)) * Math.cos(toRad(coords2.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// O componentă nouă pentru fereastra de selecție
const GpsSelectionModal = ({ locations, onSelect, onClose, isLoading }) => (
  <div className={styles.modalOverlay} onClick={onClose}>
    <div className={styles.modal} style={{maxWidth: '400px'}} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <h3 className={styles.modalTitle}>Selectează o locație</h3>
        <button className={styles.closeIcon} onClick={onClose}><CloseIcon /></button>
      </div>
      <div className={styles.gpsResultsList}>
        {isLoading && <p>Căutare locații apropiate...</p>}
        {!isLoading && locations.length === 0 && <p>Nu s-au găsit locații înregistrate pe o rază de 200m.</p>}
        {locations.map((loc, index) => (
          <div key={index} className={styles.gpsResultItem} onClick={() => onSelect(loc.name)}>
            <strong>{loc.name}</strong>
            <span>~ {Math.round(loc.distance * 1000)} metri</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);


export default function ParteDiarioModal({ isOpen, onClose, data, onDataChange, onToggleChange, onCurseChange, day, monthName, year }) {
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [gpsResults, setGpsResults] = useState([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [activeGpsSearch, setActiveGpsSearch] = useState(null); // { index, field }

  if (!isOpen) return null;

  const onNum = (e) => onDataChange(e.target.name, e.target.value === '' ? '' : Number(e.target.value));

  const kmIniciar = data?.km_iniciar ?? '';
  const kmFinal = data?.km_final ?? '';
  const kmShow = (Number(kmFinal || 0) - Number(kmIniciar || 0)) > 0 ? (Number(kmFinal || 0) - Number(kmIniciar || 0)) : 0;

  const handleCursaChange = (index, field, value) => {
    const newCurse = [...(data.curse || [])];
    newCurse[index] = { ...newCurse[index], [field]: value };
    onCurseChange(newCurse);
  };
  const addCursa = () => onCurseChange([...(data.curse || []), { start: '', end: '', km: '' }]);
  const removeCursa = (index) => onCurseChange((data.curse || []).filter((_, i) => i !== index));

  const openGpsSelection = (index, field) => {
    setActiveGpsSearch({ index, field });
    setIsGpsModalOpen(true);
    setGpsLoading(true);

    if (!navigator.geolocation) {
      alert('Geolocalizarea nu este suportată.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const tableNames = ['gps_clientes', 'gps_parkings', 'gps_servicios', 'gps_terminale'];
        const promises = tableNames.map(table => supabase.from(table).select('nombre, coordenadas'));
        const results = await Promise.all(promises);
        
        let allLocations = [];
        results.forEach(res => { if (res.data) allLocations = allLocations.concat(res.data); });
        
        const nearbyLocations = allLocations
          .map(loc => {
            if (!loc.coordenadas) return null;
            const [lat, lon] = loc.coordenadas.slice(1, -1).split(',').map(s => parseFloat(s.trim()));
            if (isNaN(lat) || isNaN(lon)) return null;
            const distance = haversineDistance({ lat: latitude, lon: longitude }, { lat, lon });
            return { name: loc.nombre, distance };
          })
          .filter(loc => loc && loc.distance <= 0.2); // Raza de 200m

        nearbyLocations.sort((a, b) => a.distance - b.distance);
        setGpsResults(nearbyLocations);
      } catch (error) {
        alert('A apărut o eroare la căutarea locațiilor.');
      } finally {
        setGpsLoading(false);
      }
    }, (error) => {
      alert(`Eroare GPS: ${error.message}`);
      setGpsLoading(false);
    });
  };

  const handleGpsLocationSelect = (name) => {
    if (activeGpsSearch) {
      const { index, field } = activeGpsSearch;
      handleCursaChange(index, field, name);
    }
    setIsGpsModalOpen(false);
    setGpsResults([]);
    setActiveGpsSearch(null);
  };

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Parte Diario — {day} {monthName} {year}</h3>
            <button className={styles.closeIcon} onClick={onClose}><CloseIcon /></button>
          </div>
          <div className={styles.modalBody}>
            {/* Secțiunile existente */}
            <div className={styles.parteDiarioSection}><h4>Dietas</h4><div className={styles.checkboxGroupModal}><label><input type="checkbox" checked={!!data?.desayuno} onChange={() => onToggleChange('desayuno')} /> Desayuno</label><label><input type="checkbox" checked={!!data?.cena} onChange={() => onToggleChange('cena')} /> Cena</label><label><input type="checkbox" checked={!!data?.procena} onChange={() => onToggleChange('procena')} /> Procena</label></div></div>
            <div className={styles.parteDiarioSection}><h4>Kilómetros</h4><div className={styles.inputGrid}><div className={styles.inputGroup}><label>KM Iniciar</label><input type="number" name="km_iniciar" value={kmIniciar} onChange={onNum}/></div><div className={styles.inputGroup}><label>KM Final</label><input type="number" name="km_final" value={kmFinal} onChange={onNum}/></div></div><p className={styles.kmPreview}>Kilómetros del día: <b>{kmShow}</b></p></div>
            
            <div className={styles.parteDiarioSection}>
              <h4>Carreras del día (Jornal)</h4>
              <div className={styles.curseList}>
                {(data.curse || []).map((cursa, index) => (
                  <div key={index} className={styles.cursaItem}>
                    <div className={styles.cursaInputs}>
                      <div className={styles.inputGroup}><label>Salida</label><div className={styles.inputWithButton}><SearchableInput value={cursa.start || ''} onChange={(val) => handleCursaChange(index, 'start', val)} onLocationSelect={(name) => handleCursaChange(index, 'start', name)} placeholder="Ej: Parking" /><button onClick={() => openGpsSelection(index, 'start')}><GpsFixedIcon /></button></div></div>
                      <div className={styles.inputGroup}><label>Llegada</label><div className={styles.inputWithButton}><SearchableInput value={cursa.end || ''} onChange={(val) => handleCursaChange(index, 'end', val)} onLocationSelect={(name) => handleCursaChange(index, 'end', name)} placeholder="Ej: TCB" /><button onClick={() => openGpsSelection(index, 'end')}><GpsFixedIcon /></button></div></div>
                      <div className={`${styles.inputGroup} ${styles.kmField}`}><label>KM</label><input type="number" value={cursa.km || ''} onChange={(e) => handleCursaChange(index, 'km', e.target.value)} placeholder="Ref." /></div>
                    </div>
                    <button className={styles.removeCursaButton} onClick={() => removeCursa(index)}><TrashIcon /></button>
                  </div>
                ))}
              </div>
              <button className={styles.addCursaButton} onClick={addCursa}>+ Añadir Carrera</button>
            </div>
            
            <div className={styles.parteDiarioSection}><h4>Actividades especiales</h4><div className={styles.inputGrid}><div className={styles.inputGroup}><label>Contenedores barridos</label><input type="number" name="contenedores" value={data?.contenedores ?? ''} onChange={onNum}/></div><div className={styles.inputGroup}><label>Suma festivo/plus (€)</label><input type="number" name="suma_festivo" value={data?.suma_festivo ?? ''} onChange={onNum}/></div></div></div>
          </div>
          <div className={styles.modalFooter}><button className={styles.actionMini} type="button" onClick={onClose}>Cerrar</button></div>
        </div>
      </div>
      
      {isGpsModalOpen && <GpsSelectionModal locations={gpsResults} onSelect={handleGpsLocationSelect} onClose={() => setIsGpsModalOpen(false)} isLoading={gpsLoading} />}
    </>
  );
}
