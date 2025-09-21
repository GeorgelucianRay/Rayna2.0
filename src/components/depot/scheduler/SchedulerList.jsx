// src/components/Depot/scheduler/SchedulerList.jsx
import React from 'react';
import styles from './SchedulerStandalone.module.css';

function SchedulerItem({ row, onSelect }) {
  const badge = row.source === 'programados'
    ? (row.estado === 'pendiente'
        ? <span className={`${styles.badge} ${styles.badgeWarn}`}>Pendiente</span>
        : <span className={`${styles.badge} ${styles.badgeInfo}`}>Programado</span>)
    : <span className={`${styles.badge} ${styles.badgeWarn}`}>En depósito</span>;

  return (
    <li
      key={(row.source==='programados' ? row.programado_id : row.id) || row.matricula_contenedor}
      className={styles.item}
      onClick={() => onSelect(row)}
      style={{ cursor: 'pointer' }}
      title="Ver detalles"
    >
      <div>
        <div className={styles.itemTop}>
          <span className={styles.dot} />
          <span className={styles.cid}>{row.matricula_contenedor}</span>
          {badge}
        </div>
        <div className={styles.meta}>
          <span className={styles.cliente}>{row.empresa_descarga || row.naviera || '—'}</span>
          {row.fecha && <span className={styles.fecha}>{row.fecha}</span>}
          {row.hora && <span className={styles.time}>{row.hora}</span>}
        </div>
      </div>
    </li>
  );
}

function CompletedItem({ row, onSelect }) {
  return (
    <li key={row.id} className={styles.item} onClick={() => onSelect(row)} style={{ cursor: 'pointer' }}>
      <div className={styles.itemTop}>
        <span className={styles.dot} />
        <span className={styles.cid}>{row.matricula_contenedor || row.cid || row.id}</span>
        <span className={`${styles.badge} ${styles.badgeInfo}`}>Completado</span>
      </div>
      <div className={styles.meta}>
        <span className={styles.cliente}>{row.empresa_descarga || '—'}</span>
        {row.fecha_salida && <span className={styles.fecha}>{new Date(row.fecha_salida).toLocaleString()}</span>}
      </div>
    </li>
  );
}

export default function SchedulerList({ items, tab, loading, role, onSelect }) {
  if (loading) return <div className={styles.card}><p style={{opacity:.85,margin:0}}>Cargando…</p></div>;
  if (!items || items.length === 0) return <div className={styles.card}><p style={{margin:0}}>No hay datos.</p></div>;

  return (
    <div className={styles.card}>
      <ul className={styles.list}>
        {tab === 'completado'
          ? items.map(row => <CompletedItem key={row.id} row={row} onSelect={onSelect} />)
          : items.map(row => <SchedulerItem key={row.programado_id || row.id} row={row} onSelect={onSelect} />)
        }
      </ul>
    </div>
  );
}