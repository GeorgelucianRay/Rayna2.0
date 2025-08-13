import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import styles from './MapPage.module.css'; // Creează un fișier CSS separat

function MapPage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className={styles.mapContainer}>
        <div className={styles.messageBox}>
          <h1>Estamos trabajando en ello...</h1>
          <p>La vista de mapa estará disponible pronto.</p>
          <button className={styles.backButton} onClick={() => navigate('/depot')}>
            Volver a Depot
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default MapPage;
