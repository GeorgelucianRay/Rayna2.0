// src/components/scheduler/SchedulerList.jsx
import React from 'react';
import styles from './SchedulerStandalone.module.css';
import { supabase } from '../../supabaseClient'; // Calea corectă

function SchedulerItem({ row, role, onHecho }) {
  // Logica de afișare pentru un singur item
  return (
    <li key={(row.source==='programados'? row.programado_id : row.id) || row.matricula_contenedor} className={styles.item}>
      <div>
        <div className={styles.itemTop}>
          <span className={styles.dot} />
          <span className={styles.cid}>{row.matricula_contenedor}</span>
          {row.source === 'programados' ? (
            (row.estado === 'pendiente')
              ? <span className={`${styles.badge} ${styles.badgeWarn}`}>Pendiente</span>
              : <span className={`${styles.badge} ${styles.badgeInfo}`}>Programado</span>
          ) : (
            <span className={`${styles.badge} ${styles.badgeWarn}`}>En depósito</span>
          )}
        </div>
        <div className={styles.meta}>
            <span className={styles.cliente}>{row.empresa_descarga || row.naviera || '—'}</span>
            {row.fecha && <span className={styles.fecha}>{row.fecha}</span>}
            {row.hora && <span className={styles.time}>{row.hora}</span>}
        </div>
      </div>
      <div className={styles.actions}>
        {(role === 'mecanic' || role === 'dispecer' || role === 'admin') &&
          row.source === 'programados' && (row.estado || 'programado') !== 'pendiente' && (
          <button className={styles.actionOk} onClick={() => onHecho(row)}>Hecho</button>
        )}
      </div>
    </li>
  );
}

function CompletedItem({ row }) {
    // Logica de afișare pentru un item completat
    return (
        <li key={row.id} className={styles.item}>
            {/* JSX pentru item-ul completat */}
        </li>
    );
}

export default function SchedulerList({ items, tab, loading, role, onHecho }) {
  if (loading) return <p style={{opacity:.85}}>Cargando…</p>;
  if (items.length === 0) return <p>Nu există date.</p>;

  return (
    <div className={styles.card}>
      <ul className={styles.list}>
        {tab === 'completado' 
          ? items.map(row => <CompletedItem key={row.id} row={row} />)
          : items.map(row => <SchedulerItem key={row.id} row={row} role={role} onHecho={onHecho} />)
        }
      </ul>
    </div>
  );
}
