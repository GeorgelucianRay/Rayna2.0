// src/components/GpsPro/GpsProPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import styles from './GpsPro.module.css';
import ErrorBoundary from '../common/ErrorBoundary';

import ListView from './views/ListView';

export default function GpsProPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState('clientes');
  const navigate = useNavigate();

  if (profile?.role !== 'admin') {
    return (
      <div className={styles.frame}>
        <div className={styles.guard}>
          <h2>Acceso restringido</h2>
          <p>Esta sección es solo para <strong>admin</strong>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.frame}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div className={styles.brand}>
            <div className={styles.logoGlow}/>
            <span>GPS<span className={styles.brandAccent}>Pro</span></span>
          </div>
          <button
            className={styles.closeBackBtn}
            onClick={() => navigate('/dispecer-homepage')}
            aria-label="Salir de GPS Pro"
            title="Salir de GPS Pro"
          >
            ✕
          </button>
        </div>

        <nav className={styles.navUnderBrand}>
          <button className={`${styles.navBtn} ${tab==='clientes'?styles.navBtnActive:''}`} onClick={()=> setTab('clientes')}>Clientes</button>
          <button className={`${styles.navBtn} ${tab==='parkings'?styles.navBtnActive:''}`} onClick={()=> setTab('parkings')}>Parkings</button>
          <button className={`${styles.navBtn} ${tab==='servicios'?styles.navBtnActive:''}`} onClick={()=> setTab('servicios')}>Servicios</button>
          <button className={`${styles.navBtn} ${tab==='terminale'?styles.navBtnActive:''}`} onClick={()=> setTab('terminale')}>Terminales</button>
        </nav>
      </header>

      <main className={styles.main}>
        <ErrorBoundary>
          {tab==='clientes'   && <ListView tableName="gps_clientes"  title="Cliente" />}
          {tab==='parkings'   && <ListView tableName="gps_parkings"  title="Parking" />}
          {tab==='servicios'  && <ListView tableName="gps_servicios" title="Servicio" />}
          {tab==='terminale'  && <ListView tableName="gps_terminale" title="Terminal" />}
        </ErrorBoundary>
      </main>
    </div>
  );
}