// src/components/scheduler/SchedulerToolbar.jsx
import React from 'react';
import styles from './SchedulerStandalone.module.css';

export default function SchedulerToolbar({ tab, setTab, query, setQuery, date, setDate, allowedTabs }) {
  const labels = { todos: 'Todos', programado: 'Programado', pendiente: 'Pendiente', completado: 'Completado' };
  const tabs = allowedTabs ?? ['todos','programado','pendiente','completado'];

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
      </div>
    </div>
  );
}