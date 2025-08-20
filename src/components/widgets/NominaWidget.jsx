import React from 'react';
import MiniCalendar from '../ui/MiniCalendar';
import styles from './NominaWidget.module.css';

// Funcție ajutătoare pentru a formata data în spaniolă (ex: "August 2025")
const monthLabelES = (d) =>
  d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\p{L}/u, (c) => c.toUpperCase());

export default function NominaWidget({ summary, marks, date, onNavigate }) {
  return (
    // Se aplică clasele pentru card și widget
    <section className={`${styles.card} ${styles.widget}`}>
      <div className={styles.widgetHeader}>
        <div className={styles.cardTitle}>Nómina</div>
        <span className={styles.badge}>Beta</span>
      </div>
      <div className={styles.widgetBody}>
        {/* Coloana principală cu datele dinamice */}
        <div className={styles.widgetCol}>
          <div className={styles.statLine}>
            <strong>Desayunos:</strong> {summary.desayunos}
          </div>
          <div className={styles.statLine2}>
            Este mes: <b>{summary.km}</b> km • <b>{summary.conts}</b> contenedores • <b>{summary.dias}</b> días
          </div>
          <button className={styles.cta} onClick={onNavigate}>
            Abrir calculadora
          </button>
        </div>
        {/* Coloana secundară cu mini-calendarul */}
        <div className={styles.widgetColMiniCal}>
          <div className={styles.miniCalTitle}>{monthLabelES(date)}</div>
          <MiniCalendar date={date} marks={marks} />
        </div>
      </div>
    </section>
  );
}
