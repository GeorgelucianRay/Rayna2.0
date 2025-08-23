// src/widgets/VacacionesWidget.jsx
import React from 'react';
import Donut from '../ui/Donut';
import styles from './VacacionesWidget.module.css';

export default function VacacionesWidget({ info, onNavigate, loading }) {
  return (
    <section className={`${styles.card} ${styles.widget}`}>
      <div className={styles.widgetHeader}>
        <div className={styles.cardTitle}>Vacaciones</div>
      </div>

      <div className={styles.widgetBody}>
        <div className={styles.widgetColMini}>
          {loading ? (
            <div className={styles.skeletonCircle} />
          ) : (
            <Donut total={info.total} usadas={info.usadas} pendientes={info.pendientes} />
          )}
        </div>

        <div className={styles.widgetCol}>
          {loading ? (
            <div className={styles.skeletonLine} />
          ) : (
            <>
              <p className={styles.vacHint}>
                Disponibles: <b>{info.disponibles}</b> • Usadas: <b>{info.usadas}</b> • Pendientes: <b>{info.pendientes}</b>
              </p>
              <button className={styles.cta} onClick={onNavigate}>
                Abrir vacaciones
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
