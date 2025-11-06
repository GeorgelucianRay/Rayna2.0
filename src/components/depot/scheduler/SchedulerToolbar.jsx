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
  // 👇 nou: controlăm calendarul din Toolbar
  showCalendar,
  onToggleCalendar,
}) {
  const monthLabel = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className={styles.toolbar}>
      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map(t => (
          <button
            key={t}
            type="button"
            className={`${styles.tab} ${tab === t ? styles.active : ''}`}
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

      {/* Actions: Calendar (imagine rotundă) + Excel + Programar (imagine dreptunghi) */}
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.iconBtn} ${showCalendar ? styles.iconBtnActive : ''}`}
          onClick={onToggleCalendar}
          aria-label="Abrir calendario"
          aria-pressed={showCalendar ? 'true' : 'false'}
          title={showCalendar ? 'Ocultar calendario' : 'Abrir calendario'}
        >
          <img className={styles.iconImg} src="/Calendar.JPG" alt="Calendario" />
        </button>

        <button
          type="button"
          className={styles.iconBtn}
          onClick={onExportExcel}
          aria-label="Exportar a Excel"
          title="Exportar a Excel"
        >
          <img className={styles.iconImg} src="/excel_circle_green.png" alt="Excel" />
        </button>

        {canProgramar && (
          <button
            type="button"
            className={styles.programarBtn}
            onClick={onProgramarClick}
            title="Programar"
          >
            <img className={styles.programarImg} src="/Programar.JPG" alt="Programar" />
          </button>
        )}
      </div>
    </div>
  );
}