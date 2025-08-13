import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import styles from './SchedulerPage.module.css'; // Creează un fișier CSS separat

function SchedulerPage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className={styles.schedulerContainer}>
        <div className={styles.messageBox}>
          <h1>Estamos trabajando en ello...</h1>
          <p>El programa de contenedores estará disponible pronto.</p>
          <button className={styles.backButton} onClick={() => navigate('/depot')}>
            Volver a Depot
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default SchedulerPage;
