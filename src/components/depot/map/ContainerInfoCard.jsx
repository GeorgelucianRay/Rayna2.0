import React from 'react';
import styles from './ContainerInfoCard.module.css';

export default function ContainerInfoCard({ container, onClose }) {
  // Dacă nu există niciun container selectat, nu afișăm nimic
  if (!container) {
    return null;
  }

  // Extragem informațiile pe care vrem să le afișăm
  const {
    matricula_contenedor,
    naviera,
    tipo,
    posicion,
    __source, // 'enDeposito', 'programados', 'rotos'
  } = container;

  // Alegem o clasă CSS pentru culoare în funcție de sursă
  const statusClass = styles[__source] || styles.enDeposito;

  return (
    <div className={styles.card}>
      <button className={styles.closeButton} onClick={onClose}>✕</button>
      <div className={styles.header}>
        <h3 className={styles.title}>{matricula_contenedor || 'N/A'}</h3>
        <span className={`${styles.status} ${statusClass}`}>{__source}</span>
      </div>
      <div className={styles.details}>
        <p><strong>Naviera:</strong> {naviera || 'N/A'}</p>
        <p><strong>Tip:</strong> {tipo || 'N/A'}</p>
        <p><strong>Poziție:</strong> {posicion || 'N/A'}</p>
      </div>
    </div>
  );
}