// src/components/nomina/NominaResultCard.jsx
import React from 'react';
import styles from './Nominas.module.css';

export default function NominaResultCard({ result }) {
  // Verificare de siguranță: dacă 'result' sau 'detalii_calcul' nu există, nu afișa nimic.
  if (!result || !result.detalii_calcul) {
    return (
      <div className={`${styles.card} ${styles.resultCard}`}>
        <h3>Eroare la calcul</h3>
        <p>A apărut o eroare la afișarea detaliilor. Vă rugăm să verificați datele introduse.</p>
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${styles.resultCard}`}>
      <h3>Resultado del Cálculo</h3>
      <p className={styles.totalBruto}>{result.totalBruto} €</p>
      
      {/* Afișăm detaliile doar dacă 'detalii_calcul' este un obiect valid */}
      <ul className={styles.resultDetails}>
        {Object.entries(result.detalii_calcul).map(([key, value]) => (
          <li key={key}>
            <span>{key}</span>
            <span>{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}