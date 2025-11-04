import React from 'react';
import styles from './SchedulerToolbar.module.css';

export default function SchedulerToolbar({
  // props cu valori implicite – NU folosim "props" direct
  tabs = ['programado', 'pendiente', 'completado'],
  tab, setTab,
  query, setQuery,
  date, setDate,
  onCalendarClick,
  onExportExcel,
  onProgramarClick,
  canProgramar = false,
}) {
  // Folosim direct "tabs" din destructurare
  const TABS = tabs;

  const handleMonthChange = (e) => {
    const [y, m] = e.target.value.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return;
    setDate?.(new Date(y, m - 1, 1));
  };

  return (
    <div className={styles.toolbar}>
      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.active : ''}`}
            onClick={() => setTab?.(t)}
            type="button"
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Filtre (search + luna + Calendario) */}
      <div className={styles.filters}>
        <input
          className={styles.search}
          placeholder="Buscar por matrícula, empresa…"
          value={query || ''}
          onChange={(e) => setQuery?.(e.target.value)}
          inputMode="search"
        />
        <input
          className={styles.date}
          type="month"
          value={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`}
          onChange={handleMonthChange}
          aria-label="Mes"
        />
        <button
          className={styles.ghost}
          onClick={onCalendarClick}
          type="button"
        >
          Calendario
        </button>
      </div>

      {/* Acțiuni (Excel + Programar) */}
      <div className={styles.actions}>
        <button className={styles.ghost} onClick={onExportExcel} type="button">
          Excel
        </button>
        {canProgramar && (
          <button
            className={styles.primary}
            onClick={onProgramarClick}
            type="button"
          >
            Programar
          </button>
        )}
      </div>
    </div>
  );
}