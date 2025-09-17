// src/components/nomina/SimpleSummaryModal.jsx
import React from 'react';
import jsPDF from 'jspdf';
import { useAuth } from '../../AuthContext';
import styles from './SummaryModal.module.css';

export default function SimpleSummaryModal({ data, onClose }) {
  const { profile } = useAuth();
  if (!data) return null;

  const kmDiff =
    (Number(data.km_final) || 0) - (Number(data.km_iniciar) || 0);

  // 🔹 Generare PDF ticket
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('PARTE DIARIO', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Chofer: ${profile?.nombre_completo || '-'}`, 20, 40);
    doc.text(`Camión: ${profile?.camioane?.matricula || '-'}`, 20, 48);
    doc.text(`Fecha: ${data.day} ${data.monthName} ${data.year}`, 20, 56);

    let y = 70;
    doc.setFontSize(14);
    doc.text('Itinerario', 105, y, { align: 'center' });
    y += 10;

    if (data.curse && data.curse.length > 0) {
      data.curse.forEach((cursa, idx) => {
        doc.text(
          `${cursa.start || 'N/A'}  →  ${cursa.end || 'N/A'}`,
          105,
          y,
          { align: 'center' }
        );
        y += 8;
      });
    } else {
      doc.text('Fără curse înregistrate', 105, y, { align: 'center' });
      y += 8;
    }

    y += 12;
    doc.setFontSize(12);
    doc.text(`KM salida: ${data.km_iniciar || 0}`, 20, y);
    doc.text(`KM llegada: ${data.km_final || 0}`, 80, y);
    doc.text(`KM total: ${kmDiff > 0 ? kmDiff : 0}`, 150, y);

    doc.save(`parte_diario_${data.day}_${data.monthName}.pdf`);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.summarySheet}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h1>PARTE DIARIO</h1>
          <button className={styles.closeBtn} onClick={onClose}>
            ✖
          </button>
        </div>

        <div className={styles.metaInfo}>
          <div><span>CHOFER:</span> {profile?.nombre_completo || '—'}</div>
          <div><span>CAMIÓN:</span> {profile?.camioane?.matricula || '—'}</div>
          <div><span>FECHA:</span> {`${data.day} ${data.monthName} ${data.year}`}</div>
        </div>

        <div className={styles.itinerary}>
          <div className={styles.itineraryHeader}>ITINERARIO</div>
          <div className={styles.itineraryBody}>
            {data.curse?.length > 0 ? (
              data.curse.map((cursa, i) => (
                <div key={i} className={styles.itineraryRow}>
                  <span>{cursa.start || 'N/A'}</span>
                  <span>→</span>
                  <span>{cursa.end || 'N/A'}</span>
                </div>
              ))
            ) : (
              <div className={styles.itineraryRow}>
                <span>Fără curse înregistrate</span>
              </div>
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
        </div>

        <div className={styles.actions}>
          <button className={styles.pdfButton} onClick={generatePDF}>
            📄 Generar PDF
          </button>
        </div>
      </div>
    </div>
  );
}