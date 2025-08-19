import React from 'react';
import MiniCalendar from '../ui/MiniCalendar'; // Asigură-te că și calea asta e corectă

// --- AICI ESTE MODIFICAREA ---
import styles from './NominaWidget.module.css';
// -----------------------------

const monthLabelES = (d) =>
  d
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    .replace(/^\p{L}/u, (c) => c.toUpperCase());

export default function NominaWidget({ summary, marks, date, onNavigate }) {
  return (
    <section className={`${styles.card} ${styles.widget}`}>
      <div className={styles.widgetHeader}>
        <div className={styles.cardTitle}>Nómina</div>
        <span className={styles.badge}>Beta</span>
      </div>

      <div className={styles.widgetBody}>
        <div className={styles.widgetCol}>
          <div className={styles.statLine}>
            <strong>Desayunos:</strong> {summary.desayunos}
            <strong className={styles.dotSep}>Cenas:</strong> {summary.cenas}
            <strong className={styles.dotSep}>Procenas:</strong> {summary.procenas}
          </div>
          <div className={styles.statLine2}>
            Este mes: <b>{summary.km}</b> km • <b>{summary.conts}</b> contenedores •{' '}
            <b>{summary.dias}</b> días trabajados
          </div>
          <button className={styles.cta} onClick={onNavigate}>
            Abrir calculadora
          </button>
        </div>

        <div className={styles.widgetColMiniCal}>
          <div className={styles.miniCalTitle}>{monthLabelES(date)}</div>
          <MiniCalendar date={date} marks={marks} />
        </div>
      </div>
    </section>
  );
}
