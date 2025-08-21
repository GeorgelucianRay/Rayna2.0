import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useScheduler } from '../hooks/useScheduler';
import styles from './SchedulerPage.module.css';
import page from './SchedulerPage.module.css';
import styles from '../components/scheduler/SchedulerStandalone.module.css';

import SchedulerToolbar from '../components/scheduler/SchedulerToolbar.jsx';
import SchedulerList from '../components/scheduler/SchedulerList.jsx';
import SchedulerDetailModal from '../components/scheduler/SchedulerDetailModal.jsx';

export default function SchedulerPage() {
  const { profile } = useAuth();
  const role = (profile?.role ?? '').toString().trim().toLowerCase();

  const {
    tab, setTab,
    query, setQuery,
    date, setDate,
    filtered, loading,
    eliminarProgramado,
    marcarHecho,
    editarPosicion,
    actualizarProgramado,
  } = useScheduler();

  const [selected, setSelected] = useState(null);

  // (opțional) dacă vrei să limitezi taburile pentru mecanic
  useEffect(() => {
    if (role === 'mecanic' && tab === 'todos') setTab('programado');
  }, [role, tab, setTab]);

  return (
    <div className={styles.pageWrap}>
      <div className={styles.bg} />
      <div className={styles.vignette} />

      <div className={styles.topBar}>
        {/* Link sigur către Depot */}
        <Link to="/depot" className={styles.backBtn}>Depot</Link>
        <h1 className={styles.title}>Programar Contenedor</h1>
        {(role === 'dispecer' || role === 'admin') && (
          <button className={styles.newBtn} onClick={() => alert('Calendar vine în pasul următor 🙂')}>Programar</button>
        )}
      </div>

      <SchedulerToolbar
        tab={tab} setTab={setTab}
        query={query} setQuery={setQuery}
        date={date} setDate={setDate}
      />

      <div className={styles.grid}>
        <SchedulerList
          items={filtered}
          tab={tab}
          loading={loading}
          role={role}
          onSelect={setSelected}
        />
      </div>

      <SchedulerDetailModal
        open={!!selected}
        row={selected}
        role={role}
        onClose={() => setSelected(null)}
        onEliminar={async (row) => { await eliminarProgramado(row); setSelected(null); }}
        onHecho={async (row) => { await marcarHecho(row); setSelected(null); }}
        onEditar={async (row, payload) => { await actualizarProgramado(row, payload); setSelected(null); }}
        onEditarPosicion={async (row, pos) => { await editarPosicion(row, pos); setSelected(null); }}
      />
    </div>
  );
}