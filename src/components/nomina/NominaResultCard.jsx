// src/components/nomina/NominaResultCard.jsx
import React from 'react';
import styles from './Nominas.module.css';
import jsPDF from 'jspdf';

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export default function NominaResultCard({ result }) {
  if (!result || typeof result !== 'object') {
    return (
      <div className={`${styles.card} ${styles.resultCard}`}>
        <h3>Error en el cálculo</h3>
        <p>Ha ocurrido un error al mostrar los detalles. Verifica los datos introducidos.</p>
      </div>
    );
  }

  // Normalización de resultados
  const total =
    (typeof result.totalBruto === 'number' ? result.totalBruto : null) ??
    (typeof result.total === 'number' ? result.total : null);

  const details =
    (result.detalii_calcul && typeof result.detalii_calcul === 'object' ? result.detalii_calcul : null) ??
    (result.breakdown && typeof result.breakdown === 'object' ? result.breakdown : null) ??
    {};

  // KPIs opcionales
  const kpis = [
    { label: 'Días trabajados', value: result.workedDays },
    { label: 'KM', value: result.km },
    { label: 'Contenedores', value: result.contenedores },
    { label: 'Desayunos', value: result.desayunos },
    { label: 'Cenas', value: result.cenas },
    { label: 'Pro-cenas', value: result.procenas },
  ].filter(k => typeof k.value === 'number');

  // Generar PDF
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Nómina - Resultado del Cálculo', 20, 20);

    doc.setFontSize(12);
    doc.text(`Total bruto: ${total != null ? eur.format(total) : '—'}`, 20, 35);

    let y = 50;
    if (kpis.length > 0) {
      doc.text('Indicadores clave:', 20, y);
      y += 8;
      kpis.forEach(k => {
        doc.text(`${k.label}: ${k.value}`, 25, y);
        y += 8;
      });
    }

    if (Object.keys(details).length > 0) {
      y += 5;
      doc.text('Detalles del cálculo:', 20, y);
      y += 8;
      Object.entries(details).forEach(([key, value]) => {
        doc.text(`${key}: ${typeof value === 'number' ? eur.format(value) : String(value)}`, 25, y);
        y += 8;
      });
    }

    doc.save('nomina.pdf');
  };

  return (
    <div className={`${styles.card} ${styles.resultCard}`}>
      <div className={styles.resultHeader}>
        <h3 className={styles.resultTitle}>Resultado del cálculo</h3>
        <button className={styles.pdfButton} onClick={handleGeneratePDF}>
  📄 Generar PDF
</button>
      </div>

      <p className={styles.totalBig}>
        {total != null ? eur.format(total) : '—'}
      </p>

      {kpis.length > 0 && (
        <div className={styles.kpiGrid}>
          {kpis.map((k) => (
            <div key={k.label} className={styles.kpiCard}>
              <span className={styles.kpiLabel}>{k.label}</span>
              <span className={styles.kpiValue}>{k.value}</span>
            </div>
          ))}
        </div>
      )}

      <ul className={styles.resultDetailsPretty}>
        {Object.entries(details).map(([key, value]) => (
          <li key={key} className={styles.resultRow}>
            <span>{key}</span>
            <span className={styles.amount}>
              {typeof value === 'number' ? eur.format(value) : String(value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}