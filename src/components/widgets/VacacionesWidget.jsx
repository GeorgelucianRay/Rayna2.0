import React from 'react';
import styles from '../MiPerfilPage.module.css'; // Stilurile rămân deocamdată partajate
import Donut from '../ui/Donut'; // Importăm componenta Donut!

// Funcția `useNavigate` va fi pasată ca prop dacă este necesară, sau gestionată de părinte.
// Aici, o vom pasa ca `onNavigate`.
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
