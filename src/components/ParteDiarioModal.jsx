// src/components/ParteDiarioModal.jsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import styles from './Nominas.module.css';

// --- Iconițe (neschimbate) ---
const GpsFixedIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /></svg> );
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg> );

// Funcția haversineDistance (neschimbată)
function haversineDistance(coords1, coords2) {
    // ... codul rămâne identic ...
}

export default function ParteDiarioModal({ isOpen, onClose, data, onDataChange, onToggleChange, onCurseChange, day, monthName, year }) {
  const [isLocating, setIsLocating] = useState(null);

  if (!isOpen) return null;

  // ... funcțiile handleCursaChange, addCursa, removeCursa, handleFindLocationByCoords rămân identice ...

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Parte Diario: {day} {monthName} {year}</h3>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.checkboxGroup}>
            <label><input type="checkbox" checked={data.desayuno || false} onChange={() => onToggleChange('desayuno')} /> Desayuno</label>
            <label><input type="checkbox" checked={data.cena || false} onChange={() => onToggleChange('cena')} /> Cena</label>
            <label><input type="checkbox" checked={data.procena || false} onChange={() => onToggleChange('procena')} /> Procena</label>
          </div>
          
          {/* REINTRODUS: Câmpurile pentru kilometri și celelalte date */}
          <div className={styles.parteInputGrid}>
            <div className={styles.parteInput}>
              <label>KM Iniciar</label>
              <input type="number" value={data.km_iniciar || ''} onChange={(e) => onDataChange('km_iniciar', e.target.value)} placeholder="0" />
            </div>
            <div className={styles.parteInput}>
              <label>KM Final</label>
              <input type="number" value={data.km_final || ''} onChange={(e) => onDataChange('km_final', e.target.value)} placeholder="0" />
            </div>
            <div className={styles.parteInput}>
              <label>Contenedores</label>
              <input type="number" value={data.contenedores || ''} onChange={(e) => onDataChange('contenedores', e.target.value)} placeholder="0" />
            </div>
            <div className={styles.parteInput}>
              <label>Suma Festivo/Plus (€)</label>
              <input type="number" value={data.suma_festivo || ''} onChange={(e) => onDataChange('suma_festivo', e.target.value)} placeholder="0.00" />
            </div>
          </div>
          
          <hr className={styles.divider} />

          <h4>Carreras del día (informativo)</h4>
          <div className={styles.curseList}>
            {(data.curse || []).map((cursa, index) => (
              <div key={index} className={styles.cursaItem}>
                <div className={styles.cursaInputs}>
                  <div className={styles.cursaField}>
                    <label>Salida</label>
                    <div className={styles.inputWithButton}>
                      <input type="text" value={cursa.start || ''} onChange={(e) => handleCursaChange(index, 'start', e.target.value)} placeholder="Ej: Parking" />
                      <button onClick={() => handleFindLocationByCoords(index, 'start')} disabled={isLocating}>
                         {isLocating?.index === index && isLocating?.field === 'start' ? '...' : <GpsFixedIcon />}
                      </button>
                    </div>
                  </div>
                  <div className={styles.cursaField}>
                    <label>Llegada</label>
                    <div className={styles.inputWithButton}>
                      <input type="text" value={cursa.end || ''} onChange={(e) => handleCursaChange(index, 'end', e.target.value)} placeholder="Ej: TCB" />
                      <button onClick={() => handleFindLocationByCoords(index, 'end')} disabled={isLocating}>
                        {isLocating?.index === index && isLocating?.field === 'end' ? '...' : <GpsFixedIcon />}
                      </button>
                    </div>
                  </div>
                   <div className={`${styles.cursaField} ${styles.kmField}`}>
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
      </div>
    </div>
  );
}
