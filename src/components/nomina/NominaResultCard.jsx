// src/components/nomina/NominaResultCard.jsx
import React from 'react';
import styles from './Nominas.module.css';

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export default function NominaResultCard({ result }) {
  if (!result || (typeof result !== 'object')) {
    return (
      <div className={`${styles.card} ${styles.resultCard}`}>
        <h3>Eroare la calcul</h3>
        <p>A apărut o eroare la afișarea detaliilor. Verifică datele introduse.</p>
      </div>
    );
  }

  // Normalizează formele posibile ale rezultatului
  const total =
    (typeof result.totalBruto === 'number' ? result.totalBruto : null) ??
    (typeof result.total === 'number' ? result.total : null);

  const details =
    (result.detalii_calcul && typeof result.detalii_calcul === 'object' ? result.detalii_calcul : null) ??
    (result.breakdown && typeof result.breakdown === 'object' ? result.breakdown : null) ??
    {};

  // KPIs opționale
  const kpis = [
    { label: 'Zile lucrate', value: result.workedDays },
    { label: 'KM', value: result.km },
    { label: 'Containere', value: result.contenedores },
    { label: 'Mic dejun', value: result.desayunos },
    { label: 'Cină', value: result.cenas },
    { label: 'Procină', value: result.procenas },
  ].filter(k => typeof k.value === 'number');

  return (
    <div className={`${styles.card} ${styles.resultCard}`}>
      <div className={styles.resultHeader}>
        <h3 className={styles.resultTitle}>Resultado del Cálculo</h3>
        <span className={styles.resultBadge}>Resumen</span>
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