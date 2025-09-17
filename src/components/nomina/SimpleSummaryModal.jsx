// src/components/nomina/SimpleSummaryModal.jsx
import React from 'react';
import styles from './SummaryModal.module.css'; // Vom folosi un CSS nou

export default function SimpleSummaryModal({ data, onClose }) {
  if (!data) return null;
  const kmDiff = (Number(data.km_final) || 0) - (Number(data.km_iniciar) || 0);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.summarySheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h1>PARTE DIARIO</h1>
        </div>
        <div className={styles.metaInfo}>
          <div><span>CHOFER:</span> {data.chofer}</div>
          <div><span>FECHA:</span> {`${data.day} ${data.monthName} ${data.year}`}</div>
        </div>

        <div className={styles.itinerary}>
          <div className={styles.itineraryHeader}>
            ITINERARIO
          </div>
          <div className={styles.itineraryBody}>
            {(data.curse && data.curse.length > 0) ? (
              data.curse.map((cursa, index) => (
                <div key={index} className={styles.itineraryRow}>
                  <span>{cursa.start || 'N/A'}</span>
                  <span>→</span>
                  <span>{cursa.end || 'N/A'}</span>
                </div>
              ))
            ) : (
              <div className={styles.itineraryRow}><span>Fără curse înregistrate</span></div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerBlock}>
            <span>KM. SALIDA</span>
            <p>{data.km_iniciar || 0}</p>
          </div>
          <div className={styles.footerBlock}>
            <span>KM. LLEGADA</span>
            <p>{data.km_final || 0}</p>
          </div>
          <div className={styles.footerBlock}>
            <span>KM TOTAL</span>
            <p>{kmDiff > 0 ? kmDiff : 0}</p>
          </div>
          <div className={styles.footerBlock}>
            <span>DIETAS</span>
            <p>{[data.desayuno && 'D', data.cena && 'C', data.procena && 'P'].filter(Boolean).join(' / ') || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
