// src/components/nomina/NominaResultCard.jsx
import React from 'react';
import styles from './Nominas.module.css';

export default function NominaResultCard({ result }) {
  return (
    <div className={`${styles.card} ${styles.resultCard}`}>
      <h3>Resultado del Cálculo</h3>
      <p className={styles.totalBruto}>{result.totalBruto} €</p>
      <ul className={styles.resultDetails}>
        {Object.entries(result.detalii_calcul).map(([k,v]) => (
          <li key={k}><span>{k}</span><span>{v}</span></li>
        ))}
      </ul>
    </div>
  );
}
