// src/components/Layout.jsx
import React from 'react';
import styles from './Layout.module.css';
import Navbar from './Navbar';
import UpdatePrompt from './UpdatePrompt';

const backgroundMap = {
  '/sofer-homepage': 'homepageSoferBackground',
  '/dispecer-homepage': 'homepageSoferBackground',
  '/camion': 'camionBackground',
  '/remorca': 'remorcaBackground',
  '/taller': 'tallerBackground',
  '/choferes-finder': 'choferesBackground',
  '/choferes': 'choferesBackground',
  '/mi-perfil': 'miPerfilBackground',
  '/depot': 'depotBackground',
  '/gps': 'gpsBackground',
  '/reparatii': 'reparatiiBackground',
  '/calculadora-nomina': 'calculadoraBackground',
  '/vacaciones': 'miPerfilBackground',
  '/vacaciones-admin': 'miPerfilBackground',
  '/chofer': 'miPerfilBackground',
  '/programacion': 'depotBackground',
};

import { useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const { pathname } = useLocation();
  const match = Object.keys(backgroundMap).sort((a,b)=>b.length-a.length).find(p => pathname.startsWith(p));
  const bgClass = match ? styles[backgroundMap[match]] : null;

  return (
    <div className={`${styles.layoutWrapper} ${bgClass ? styles.hasBackground : ''}`}>
      {bgClass && (
        <div className={styles.backgroundContainer}>
          <div className={`${styles.backgroundImage} ${bgClass}`} />
          <div className={styles.backgroundOverlay} />
        </div>
      )}

      {/* Navbar separat */}
      <Navbar />

      {/* Conținutul paginii */}
      <div className={styles.pageContentWrapper}>
        <main className={styles.mainContent}>{children}</main>
      </div>

      <UpdatePrompt />
    </div>
  );
};

export default Layout;