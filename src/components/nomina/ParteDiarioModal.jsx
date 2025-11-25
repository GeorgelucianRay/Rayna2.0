// src/components/nomina/ParteDiarioModal.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import styles from './Nominas.module.css';
import SearchableInput from './SearchableInput';

// --- Iconos ---
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
);
const GpsFixedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
);

// Distancia haversine (km)
function haversineDistance(a, b) {
  const toRad = (x) => x * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s = Math.sin;
  const term = s(dLat/2)**2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(term), Math.sqrt(1 - term));
  return R * c;
}

// Modal selección GPS
const GpsSelectionModal = ({ locations, onSelect, onClose, isLoading }) => (
  <div className={styles.modalOverlay} onClick={onClose}>
    <div className={styles.modal} style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <h3 className={styles.modalTitle}>Selecciona una ubicación</h3>
        <button className={styles.closeIcon} onClick={onClose}><CloseIcon /></button>
      </div>
      <div className={styles.gpsResultsList}>
        {isLoading && <p>Buscando ubicaciones cercanas…</p>}
        {!isLoading && locations.length === 0 && (
          <p>No se han encontrado ubicaciones registradas en un radio de 1&nbsp;km.</p>
        )}
        {locations.map((loc, index) => (
          <div key={index} className={styles.gpsResultItem} onClick={() => onSelect(loc.name)}>
            <strong>{loc.name}</strong>
            <span>~ {Math.round(loc.distance * 1000)}&nbsp;m</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default function ParteDiarioModal({
  isOpen, onClose, data, onDataChange, onToggleChange, onCurseChange,
  day, monthName, year
}) {
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [gpsResults, setGpsResults] = useState([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [activeGpsSearch, setActiveGpsSearch] = useState(null); // { index, field }
  const [coordsIndex, setCoordsIndex] = useState({}); // { nombre: {lat, lon} }

  // Cargar coordenadas (una vez por apertura)
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const tables = ['gps_clientes', 'gps_parkings', 'gps_servicios', 'gps_terminale'];
        const res = await Promise.all(tables.map(t => supabase.from(t).select('nombre, coordenadas')));
        const idx = {};
        res.forEach(({ data }) => (data || []).forEach(row => {
          if (!row?.coordenadas || !row?.nombre) return;
          const [lat, lon] = row.coordenadas.slice(1, -1).split(',').map(s => parseFloat(s.trim()));
          if (!isNaN(lat) && !isNaN(lon)) idx[row.nombre] = { lat, lon };
        }));
        setCoordsIndex(idx);
      } catch (e) { console.error(e); }
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  const onNum = (e) => onDataChange(e.target.name, e.target.value === '' ? '' : Number(e.target.value));

  const kmIniciar = data?.km_iniciar ?? '';
  const kmFinal = data?.km_final ?? '';
  const kmShow = (Number(kmFinal || 0) - Number(kmIniciar || 0)) > 0
    ? (Number(kmFinal || 0) - Number(kmIniciar || 0))
    : 0;

  // Cálculo KM automático por nombre
  const autoKmFor = (startName, endName) => {
    const a = coordsIndex[startName];
    const b = coordsIndex[endName];
    if (!a || !b) return null;
    return Math.round(haversineDistance(a, b) * 10) / 10; // 1 decimal
  };

  const handleCursaChange = (index, field, value) => {
    const newCurse = [...(data.curse || [])];
    const prev = newCurse[index] || { start: '', end: '' };
    const updated = { ...prev, [field]: value };
    const km_auto = autoKmFor(updated.start, updated.end);
    if (km_auto != null) updated.km_auto = km_auto;
    newCurse[index] = updated;
    onCurseChange(newCurse);
  };

  const addCursa = () => onCurseChange([...(data.curse || []), { start: '', end: '' }]);
  const removeCursa = (index) => onCurseChange((data.curse || []).filter((_, i) => i !== index));

  const openGpsSelection = (index, field) => {
    setActiveGpsSearch({ index, field });
    setIsGpsModalOpen(true);
    setGpsLoading(true);

    if (!navigator.geolocation) {
      alert('La geolocalización no está soportada por este navegador.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const { latitude, longitude } = coords;
      try {
        const tables = ['gps_clientes', 'gps_parkings', 'gps_servicios', 'gps_terminale'];
        const res = await Promise.all(tables.map(t => supabase.from(t).select('nombre, coordenadas')));
        let all = [];
        res.forEach(r => { if (r.data) all = all.concat(r.data); });

        const near = all
          .map(loc => {
            if (!loc.coordenadas) return null;
            const [lat, lon] = loc.coordenadas.slice(1, -1).split(',').map(s => parseFloat(s.trim()));
            if (isNaN(lat) || isNaN(lon)) return null;
            const distance = haversineDistance({ lat: latitude, lon: longitude }, { lat, lon });
            return { name: loc.nombre, distance };
          })
          .filter(v => v && v.distance <= 1.0) // 1 km
          .sort((a, b) => a.distance - b.distance);

        setGpsResults(near);
      } catch (e) {
        console.error(e);
        alert('Se produjo un error al buscar ubicaciones.');
      } finally {
        setGpsLoading(false);
      }
    }, (err) => {
      alert(`Error de GPS: ${err.message}`);
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
            <h3 className={styles.modalTitle}>Parte diario — {day} {monthName} {year}</h3>
            <button className={styles.closeIcon} onClick={onClose}><CloseIcon /></button>
          </div>

          <div className={styles.modalBody}>
            {/* Camión (matrícula pe zi) */}
            <div className={styles.parteDiarioSection}>
              <h4>Camión</h4>
              <div className={styles.inputGroup}>
                <label>Matrícula vehículo</label>
                <input
                  type="text"
                  name="camion_matricula"
                  value={data?.camion_matricula ?? ''}
                  onChange={(e) => onDataChange('camion_matricula', e.target.value)}
                  placeholder="Ej.: 1234-KLM"
                />
              </div>
            </div>

            {/* Dietas */}
            <div className={styles.parteDiarioSection}>
              <h4>Dietas</h4>
              <div className={styles.checkboxGroupModal}>
                <label><input type="checkbox" checked={!!data?.desayuno} onChange={() => onToggleChange('desayuno')} /> Desayuno</label>
                <label><input type="checkbox" checked={!!data?.cena} onChange={() => onToggleChange('cena')} /> Cena</label>
                <label><input type="checkbox" checked={!!data?.procena} onChange={() => onToggleChange('procena')} /> Pro-cena</label>
              </div>
            </div>

            {/* Kilómetros diarios del vehículo */}
            <div className={styles.parteDiarioSection}>
              <h4>Kilómetros</h4>
              <div className={styles.inputGrid}>
                <div className={styles.inputGroup}>
                  <label>KM inicio</label>
                  <input type="number" name="km_iniciar" value={kmIniciar} onChange={onNum}/>
                </div>
                <div className={styles.inputGroup}>
                  <label>KM fin</label>
                  <input type="number" name="km_final" value={kmFinal} onChange={onNum}/>
                </div>
              </div>
              <p className={styles.kmPreview}>Kilómetros del día: <b>{kmShow}</b></p>
            </div>

            {/* Carreras — APILADAS */}
            <div className={styles.parteDiarioSection}>
              <h4>Carreras del día (jornal)</h4>
              <div className={styles.curseList}>
                {(data.curse || []).map((cursa, index) => {
                  const kmAuto = autoKmFor(cursa.start, cursa.end);
                  return (
                    <div key={index} className={styles.cursaItem}>
                      <div className={styles.cursaInputs}>
                        <div className={styles.inputGroup}>
                          <label>Salida</label>
                          <div className={styles.inputWithButton}>
                            <SearchableInput
                              value={cursa.start || ''}
                              onChange={(val) => handleCursaChange(index, 'start', val)}
                              onLocationSelect={(name) => handleCursaChange(index, 'start', name)}
                              placeholder="Ej.: Parking"
                              closeOnSelect
                            />
                            <button onClick={() => openGpsSelection(index, 'start')}><GpsFixedIcon /></button>
                          </div>
                        </div>

                        <div className={styles.inputGroup}>
                          <label>Llegada</label>
                          <div className={styles.inputWithButton}>
                            <SearchableInput
                              value={cursa.end || ''}
                              onChange={(val) => handleCursaChange(index, 'end', val)}
                              onLocationSelect={(name) => handleCursaChange(index, 'end', name)}
                              placeholder="Ej.: TCB"
                              closeOnSelect
                            />
                            <button onClick={() => openGpsSelection(index, 'end')}><GpsFixedIcon /></button>
                          </div>
                        </div>

                        <div className={styles.inputGroup}>
                          <label>KM aprox.</label>
                          <input disabled value={kmAuto != null ? kmAuto : '—'} />
                        </div>
                      </div>

                      <button
                        className={styles.removeCursaButton}
                        onClick={() => removeCursa(index)}
                        title="Eliminar carrera"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button className={styles.addCursaButton} onClick={addCursa}>+ Añadir carrera</button>
            </div>

            {/* Actividades especiales */}
            <div className={styles.parteDiarioSection}>
              <h4>Actividades especiales</h4>
              <div className={styles.inputGrid}>
                <div className={styles.inputGroup}>
                  <label>Contenedores barridos</label>
                  <input type="number" name="contenedores" value={data?.contenedores ?? ''} onChange={onNum}/>
                </div>
                <div className={styles.inputGroup}>
                  <label>Plus festivo (€)</label>
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

      {isGpsModalOpen && (
        <GpsSelectionModal
          locations={gpsResults}
          onSelect={handleGpsLocationSelect}
          onClose={() => setIsGpsModalOpen(false)}
          isLoading={gpsLoading}
        />
      )}
    </>
  );
}