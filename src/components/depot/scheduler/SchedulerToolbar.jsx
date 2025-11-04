import React from 'react';
import styles from './SchedulerStandalone.module.css';

export default function SchedulerToolbar({
  tab, setTab,
  query, setQuery,
  date, setDate,
  allowedTabs,
  canProgramar,
  onProgramarClick,
  onExportExcel,
}) {
  const labels = { todos: 'Todos', programado: 'Programado', pendiente: 'Pendiente', completado: 'Completado' };
  const TABS = props.tabs || ['programado','pendiente','completado'];

  return (
    <div className={`${styles.card} ${styles.toolbar}`}>
      <div className={styles.chips}>
        {tabs.map(k => (
          <button
            key={k}
            className={`${styles.chip} ${tab === k ? styles.chipActive : ''}`}
            onClick={() => setTab(k)}
          >
            {labels[k]}
          </button>
        ))}
      </div>

      <div className={styles.inputs}>
        <div className={styles.search}>
          <input placeholder="Buscar…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {tab === 'completado' && (
          <input
            className={styles.date}
            type="date"
            value={new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString().slice(0,10)}
            onChange={(e) => setDate(new Date(e.target.value))}
          />
        )}

        {/* Botón Excel */}
        <button
          type="button"
          onClick={onExportExcel}
          className={styles.iconBtn}
          title="Exportar a Excel"
          aria-label="Exportar a Excel"
          style={{ padding: 0, width: 40, height: 40, borderRadius: '50%' }}
        >
          <img
            src="/excel_circle_green.png"
            alt="Excel"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </button>

        {/* Botón Programar (solo dispecer/admin, y no en 'completado') */}
        {canProgramar && tab !== 'completado' && (
          <button className={styles.actionMini} onClick={onProgramarClick}>
            Programar
          </button>
        )}
      </div>
    </div>
  );
}