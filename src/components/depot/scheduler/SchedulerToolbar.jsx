import React from 'react';
import styles from './SchedulerToolbar.module.css';

export default function SchedulerToolbar({
  tabs = ['programado','pendiente','completado'],
  tab, setTab,
  query, setQuery,
  date, setDate,
  onCalendarClick,
  onExportExcel,
  onProgramarClick,
  canProgramar = false,
}) {
  return (
    <div className={styles.toolbar}>
      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map(t => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.active : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Search + Date */}
      <div className={styles.filters}>
        <input
          className={styles.search}
          placeholder="Buscar por matrícula, empresa…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <input
          className={styles.date}
          type="month"
          value={`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
          onChange={(e) => {
            const [y, m] = e.target.value.split('-').map(Number);
            setDate(new Date(y, m - 1, 1));
          }}
          aria-label="Mes"
        />
        <button className={styles.ghost} onClick={onCalendarClick}>Calendario</button>
      </div>

      {/* Actions (Excel + Programar) */}
      <div className={styles.actions}>
        <button className={styles.ghost} onClick={onExportExcel}>Excel</button>
        {canProgramar && (
          <button className={styles.primary} onClick={onProgramarClick}>
            Programar
          </button>
        )}
      </div>
    </div>
  );
}