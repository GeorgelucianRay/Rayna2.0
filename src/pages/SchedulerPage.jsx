// src/pages/SchedulerPage.jsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useScheduler } from '../hooks/useScheduler';
import styles from './SchedulerPage.module.css';

import SchedulerToolbar from '../components/scheduler/SchedulerToolbar.jsx';
import SchedulerList from '../components/scheduler/SchedulerList.jsx';
import SchedulerDetailModal from '../components/scheduler/SchedulerDetailModal.jsx';

export default function SchedulerPage() {
  const navigate = useNavigate();
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
  } = useScheduler();

  const [selected, setSelected] = useState(null);

  // Tabs permise per rol
  const allowedTabs = useMemo(() => {
    if (role === 'mecanic') return ['programado', 'completado'];
    return ['todos', 'programado', 'pendiente', 'completado'];
  }, [role]);

  // Dacă tab curent nu e permis, mutăm la primul permis
  React.useEffect(() => {
    if (!allowedTabs.includes(tab)) setTab(allowedTabs[0]);
  }, [allowedTabs, tab, setTab]);

  return (
    <div className={styles.schedulerRoot}>
      <div className={styles.pageWrap}>
        <div className={styles.bg} />
        <div className={styles.vignette} />

        {/* TopBar simplu */}
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => navigate('/depot')}>Depot</button>
          <h1 className={styles.title}>Programar Contenedor</h1>
          {(role === 'dispecer' || role === 'admin') && (
            <button className={styles.newBtn} onClick={() => alert('TODO: Programar (formular)')}>Programar</button>
          )}
        </div>

        <SchedulerToolbar
          tab={tab} setTab={setTab}
          query={query} setQuery={setQuery}
          date={date} setDate={setDate}
          allowedTabs={allowedTabs}
        />

        <div className={styles.grid}>
          <SchedulerList
            items={filtered}
            tab={tab}
            loading={loading}
            role={role}
            onSelect={setSelected}     // ← click pe item deschide popup
          />
        </div>

        <SchedulerDetailModal
          open={!!selected}
          row={selected}
          role={role}
          onClose={() => setSelected(null)}
          onEliminar={async (row) => {
            await eliminarProgramado(row);
            setSelected(null);
          }}
          onHecho={async (row) => {
            await marcarHecho(row);
            setSelected(null);
          }}
          onEditar={async (row, nuevaPos) => {
            await editarPosicion(row, nuevaPos);
            setSelected(null);
          }}
        />
      </div>
    </div>
  );
}