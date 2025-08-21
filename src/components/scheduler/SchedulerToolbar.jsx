// src/components/scheduler/SchedulerToolbar.jsx
import React from 'react';
import styles from './SchedulerStandalone.module.css'; // Refolosim stilurile

// Presupunem că SearchIcon este într-un fișier separat de iconițe
// import { SearchIcon } from '../ui/Icons'; 

export default function SchedulerToolbar({ tab, setTab, query, setQuery, date, setDate }) {
  const tabs = ['todos', 'programado', 'pendiente', 'completado'];
  const tabLabels = { todos: 'Todos', programado: 'Programado', pendiente: 'Pendiente', completado: 'Completado' };

  return (
    <div className={`${styles.card} ${styles.toolbar}`}>
      <div className={styles.chips}>
        {tabs.map(k => (
          <button
            key={k}
            className={`${styles.chip} ${tab === k ? styles.chipActive : ''}`}
            onClick={() => setTab(k)}
          >
            {tabLabels[k]}
          </button>
        ))}
      </div>
      <div className={styles.inputs}>
        <div className={styles.search}>
          {/* <span className={styles.searchIcon}><SearchIcon/></span> */}
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
