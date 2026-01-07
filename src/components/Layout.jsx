import React, { useEffect, useState } from 'react';
import styles from './Layout.module.css';
import Navbar from './Navbar';
import UpdatePrompt from './UpdatePrompt';
import { useLocation } from 'react-router-dom';

const backgroundMap = {
  '/sofer-homepage':  styles.homepageSoferBackground,
  '/dispecer-homepage': styles.homepageSoferBackground,
  '/camion':          styles.camionBackground,
  '/remorca':         styles.remorcaBackground,
  '/taller':          styles.tallerBackground,
  '/choferes-finder': styles.choferesBackground,
  '/choferes':        styles.choferesBackground,
  '/mi-perfil':       styles.miPerfilBackground,
  '/depot':           styles.depotBackground,
  '/gps':             styles.gpsBackground,
  '/reparatii':       styles.reparatiiBackground,
  '/calculadora-nomina': styles.calculadoraBackground,
  '/vacaciones':      styles.miPerfilBackground,
  '/vacaciones-admin':styles.miPerfilBackground,
  '/chofer':          styles.miPerfilBackground,
  '/programacion':    styles.depotBackground,
};

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
  // Închide meniul la orice schimbare de rută (ex: logout -> /login)
  setOpen(false);
}, [pathname]);

  const matchingPath = Object.keys(backgroundMap)
    .sort((a,b) => b.length - a.length)
    .find(k => pathname.startsWith(k));
  const bgClass = matchingPath ? backgroundMap[matchingPath] : null;

  const wrapperCls = [
    styles.layoutWrapper,
    bgClass ? styles.hasBackground : '',
    open ? styles.menuOpen : '',       // 🔑 asta activează .menuOpen .navMenu din CSS-ul vechi
  ].join(' ');

  return (
    <div className={wrapperCls}>
      {bgClass && (
        <div className={styles.backgroundContainer}>
          <div className={`${styles.backgroundImage} ${bgClass}`} />
          <div className={styles.backgroundOverlay} />
        </div>
      )}

      {/* Navbar primește controlul, dar clasa rămâne pe wrapper */}
      <Navbar open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} />

      <div className={styles.pageContentWrapper}>
        <main className={styles.mainContent}>{children}</main>
      </div>

      <UpdatePrompt />
    </div>
  );
}