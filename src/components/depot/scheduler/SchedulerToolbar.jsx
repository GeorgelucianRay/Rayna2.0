// src/components/depot/scheduler/SchedulerToolbar.jsx
import React from 'react';
import styles from './SchedulerToolbar.module.css';

export default function SchedulerToolbar({
  tabs = ['programado', 'pendiente', 'completado'],
  tab, setTab,
  query, setQuery,
  date, setDate,
  onExportExcel,
  onProgramarClick,
  canProgramar = false,
}) {
  const handleMonthChange = (e) => {
    const [y, m] = e.target.value.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return;
    setDate?.(new Date(y, m - 1, 1));
  };

  return (
    <div className={styles.toolbar}>
      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.tab} ${tab === t ? styles.active : ''}`}
            onClick={() => setTab?.(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Căutare + luna curentă */}
      <div className={styles.filters}>
        <input
          className={styles.search}
          placeholder="Buscar por matrícula, empresa..."
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
      </div>

      {/* Acțiuni */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={onExportExcel}
          title="Exportar a Excel"
        >
          <img src="/excel_circle_green.png" alt="Excel" className={styles.iconImg} />
        </button>
        {canProgramar && (
          <button type="button" className={styles.primary} onClick={onProgramarClick}>
            Programar
          </button>
        )}
      </div>
    </div>
  );
}