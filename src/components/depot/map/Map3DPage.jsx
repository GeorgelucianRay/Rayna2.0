import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../Layout';
import styles from './Map3DPage.module.css';

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export default function Map3DPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/depot'); // sau '/rayna-hub' dacă așa dorești
  };

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.card}>
          <h1 className={styles.title}>Página en Construcción</h1>
          <p className={styles.text}>Estamos trabajando en Map 3D para el Depot.</p>
          <p className={styles.subtext}>Esta funcionalidad estará disponible pronto.</p>
          <button className={styles.backButton} onClick={handleBack}>
            <BackIcon />
            <span>Volver al Depot</span>
          </button>
        </div>
      </div>
    </Layout>
  );
}