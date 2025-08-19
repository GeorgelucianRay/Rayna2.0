import React from 'react';
// import Donut from '../ui/Donut'; // Asigură-te că și calea asta e corectă
import Donut from '../../components/ui/Donut'; // Calea corectă din widgets -> ui

// --- AICI ESTE MODIFICAREA ---
import styles from './VacacionesWidget.module.css';
// -----------------------------

export default function VacacionesWidget({ info, onNavigate }) {
  return (
    <section className={`${styles.card} ${styles.widget}`}>
      <div className={styles.widgetHeader}>
        <div className={styles.cardTitle}>Vacaciones</div>
      </div>

      <div className={styles.widgetBody}>
        <div className={styles.widgetColMini}>
          <Donut
            total={info.total}
            usadas={info.usadas}
            pendientes={info.pendientes}
          />
        </div>
        <div className={styles.widgetCol}>
          <p className={styles.vacHint}>
            Solicita días, ve aprobaciones y pendientes. <br />
            Hoy: {new Date().toLocaleDateString('es-ES')}
          </p>
          <button className={styles.cta} onClick={onNavigate}>
            Abrir vacaciones
          </button>
        </div>
      </div>
    </section>
  );
}
