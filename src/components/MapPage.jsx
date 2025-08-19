import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import styles from './MapPage.module.css';

// O iconiță simplă pentru buton
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export default function MapPage() {
  const navigate = useNavigate();

  // Presupunem că ruta către homepage este '/sofer-homepage' sau '/dispecer-homepage'
  // O vom lăsa generic '/rayna-hub' pentru a funcționa pentru toți
  const handleBackToHomepage = () => {
    navigate('/rayna-hub'); 
  };

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.card}>
          <h1 className={styles.title}>Página en Construcción</h1>
          <p className={styles.text}>
            Estamos trabajando en Map 3D para el Depot.
          </p>
          <p className={styles.subtext}>
            Esta funcionalidad estará disponible pronto.
          </p>
          <button className={styles.backButton} onClick={handleBackToHomepage}>
            <BackIcon />
            <span>Volver al Homepage</span>
          </button>
        </div>
      </div>
    </Layout>
  );
}
