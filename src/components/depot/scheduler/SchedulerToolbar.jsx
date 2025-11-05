import React from 'react';
import styles from './SchedulerToolbar.module.css';

export default function SchedulerToolbar({
  tabs,
  tab, setTab,
  query, setQuery,
  date, setDate,
  onExportExcel,
  onProgramarClick,
  canProgramar,
}) {
  const monthLabel = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className={styles.toolbar}>
      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Search + Month */}
      <div className={styles.filters}>
        <input
          className={styles.search}
          placeholder="Buscar por matrícula, empresa…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          inputMode="search"
        />
        <button
          type="button"
          className={styles.month}
          onClick={() => setDate(new Date())}
          title="Saltar a este mes"
        >
          {monthLabel}
        </button>
      </div>

      {/* Acciones */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.excelBtn}
          onClick={onExportExcel}
          aria-label="Exportar a Excel"
        >
          <img className={styles.excelImg} src="/excel_circle_green.png" alt="" />
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