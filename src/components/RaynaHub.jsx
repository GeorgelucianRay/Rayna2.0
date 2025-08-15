import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import styles from './Chatbot.module.css';

// Icon X minimal
const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function RaynaHub() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const getHomeRoute = () => {
    const role = profile?.role;
    if (role === 'dispecer') return '/dispecer-homepage';
    if (role === 'sofer') return '/sofer-homepage';
    if (role === 'mecanic') return '/taller';       // fallback sens pentru mecanic
    return '/login';                                // fallback generic
  };

  const goHome = () => navigate(getHomeRoute(), { replace: true });

  return (
    <div className={styles.wrap}>
      <header className={styles.topbar}>
        <button className={styles.closeBtn} onClick={goHome} aria-label="Cerrar">
          <CloseIcon />
        </button>
      </header>

      <section className={styles.hero}>
        <div className={styles.logoCircle}>
          <img
            src="/A8CB7FEF-A63A-444E-8B70-B03426F25960.png"
            alt="Rayna Hub"
          />
        </div>
        <h1 className={styles.title}>Rayna Hub</h1>
        <p className={styles.subtitle}>
          Centro rápido con accesos y widgets (en construcción).
        </p>
      </section>

      <section className={styles.widgets}>
        {/* Slot-uri pentru viitoare widgeturi – demo placeholders */}
        <div className={styles.widgetCard}>
          <h3>Accesos rápidos</h3>
          <ul className={styles.quickList}>
            <li><button onClick={() => navigate('/gps')}>GPS</button></li>
            <li><button onClick={() => navigate('/taller')}>Taller</button></li>
            <li><button onClick={() => navigate('/choferes-finder')}>Choferes</button></li>
            <li><button onClick={() => navigate('/calculadora-nomina')}>Nómina</button></li>
          </ul>
        </div>

        <div className={styles.widgetCard}>
          <h3>Notas</h3>
          <p className={styles.muted}>Pronto podrás fijar notas rápidas aquí.</p>
        </div>

        <div className={styles.widgetCard}>
          <h3>Recordatorios</h3>
          <p className={styles.muted}>Próximamente: alertas y tareas.</p>
        </div>
      </section>
    </div>
  );
}