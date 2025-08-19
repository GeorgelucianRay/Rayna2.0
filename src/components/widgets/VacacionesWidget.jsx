import React from 'react';
import Donut from '../ui/Donut';
import styles from './VacacionesWidget.module.css';

export default function VacacionesWidget({ info, onNavigate }) {
  return (
    <section className={`${styles.card} ${styles.widget}`}>
      <div className={styles.widgetHeader}>
        <div className={styles.cardTitle}>Vacaciones</div>
      </div>
      <div className={styles.widgetBody}>
        <div className={styles.widgetColMini}>
          <Donut total={info.total} usadas={info.usadas} pendientes={info.pendientes} />
        </div>
        <div className={styles.widgetCol}>
          <p className={styles.vacHint}>
            Solicita días, ve aprobaciones y pendientes.
          </p>
          <button className={styles.cta} onClick={onNavigate}>
            Abrir vacaciones
          </button>
        </div>
      </div>
    </section>
  );
}
