import React from 'react';
import styles from './Layout.module.css';
import Navbar from './Navbar';
import UpdatePrompt from './UpdatePrompt';
import { useLocation } from 'react-router-dom';

/* map de background – neschimbat; îl poți muta în config dacă vrei */
const backgroundMap = (stylesArg) => ({
  '/sofer-homepage': stylesArg.homepageSoferBackground,
  '/dispecer-homepage': stylesArg.homepageSoferBackground,
  '/camion': stylesArg.camionBackground,
  '/remorca': stylesArg.remorcaBackground,
  '/taller': stylesArg.tallerBackground,
  '/choferes-finder': stylesArg.choferesBackground,
  '/choferes': stylesArg.choferesBackground,
  '/mi-perfil': stylesArg.miPerfilBackground,
  '/depot': stylesArg.depotBackground,
  '/gps': stylesArg.gpsBackground,
  '/reparatii': stylesArg.reparatiiBackground,
  '/calculadora-nomina': stylesArg.calculadoraBackground,
  '/vacaciones': stylesArg.miPerfilBackground,
  '/vacaciones-admin': stylesArg.miPerfilBackground,
  '/chofer': stylesArg.miPerfilBackground,
  '/programacion': stylesArg.depotBackground,
});

export default function Layout({ children }) {
  const { pathname } = useLocation();

  const map = backgroundMap(styles);
  const bgKey = Object.keys(map).sort((a,b)=>b.length-a.length).find(k => pathname.startsWith(k));
  const bgClass = bgKey ? map[bgKey] : null;

  const wrapperClass = [
    styles.layoutWrapper,
    bgClass ? styles.hasBackground : '',
  ].join(' ');

  return (
    <div className={wrapperClass}>
      {bgClass && (
        <div className={styles.backgroundContainer}>
          <div className={`${styles.backgroundImage} ${bgClass}`} />
          <div className={styles.backgroundOverlay} />
        </div>
      )}

      {/* navbar separat */}
      <Navbar />

      {/* conținutul paginii */}
      <div className={styles.pageContentWrapper}>
        <main className={styles.mainContent}>{children}</main>
      </div>

      <UpdatePrompt />
    </div>
  );
}