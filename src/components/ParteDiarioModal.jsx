// src/components/nomina/ParteDiarioModal.jsx
import React from 'react';
import styles from './Nominas.module.css';

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
);

export default function ParteDiarioModal({
  isOpen, onClose, data, onDataChange, onToggleChange, day, monthName, year
}) {
  if (!isOpen) return null;

  const onNum = (e) => {
    const { name, value } = e.target;
    // permite '' ca să poți șterge 0 fără prefix
    onDataChange(name, value === '' ? '' : Number(value));
  };

  const kmIniciar = data?.km_iniciar ?? '';
  const kmFinal = data?.km_final ?? '';
  const kmDiff = (Number(kmFinal || 0) - Number(kmIniciar || 0));
  const kmShow = kmDiff > 0 ? kmDiff : 0;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Parte Diario — {day} {monthName} {year}</h3>
          <button className={styles.closeIcon} onClick={onClose}><CloseIcon /></button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.parteDiarioSection}>
            <h4>Dietas</h4>
            <div className={styles.checkboxGroupModal}>
              <label><input type="checkbox" checked={!!data?.desayuno} onChange={() => onToggleChange('desayuno')} /> Desayuno</label>
              <label><input type="checkbox" checked={!!data?.cena} onChange={() => onToggleChange('cena')} /> Cena</label>
              <label><input type="checkbox" checked={!!data?.procena} onChange={() => onToggleChange('procena')} /> Procena</label>
            </div>
          </div>

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

          <div className={styles.parteDiarioSection}>
            <h4>Actividades especiales</h4>
            <div className={styles.inputGrid}>
              <div className={styles.inputGroup}>
                <label>Contenedores barridos</label>
                <input
                  type="number"
                  name="contenedores"
                  value={data?.contenedores === '' ? '' : (data?.contenedores ?? 0)}
                  onChange={(e) => onDataChange('contenedores', e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Suma festivo/plus (€)</label>
                <input
                  type="number"
                  name="suma_festivo"
                  value={data?.suma_festivo === '' ? '' : (data?.suma_festivo ?? 0)}
                  onChange={(e) => onDataChange('suma_festivo', e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.actionMini} type="button" onClick={onClose}>Guardar y cerrar</button>
        </div>
      </div>
    </div>
  );
}
