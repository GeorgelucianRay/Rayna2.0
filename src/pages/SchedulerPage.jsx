import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useScheduler } from '../hooks/useScheduler';
import { supabase } from '../supabaseClient';
import styles from './SchedulerPage.module.css';

import SchedulerToolbar from '../components/scheduler/SchedulerToolbar';
import SchedulerList from '../components/scheduler/SchedulerList';

export default function SchedulerPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const role = (profile?.role ?? '').toString().trim().toLowerCase();

  const {
    tab, setTab,
    query, setQuery,
    date, setDate,
    filtered, loading,
    setItems
  } = useScheduler();

  const [isProgramarOpen, setIsProgramarOpen] = useState(false);

  const handleHecho = async (row) => {
    if (!(role === 'mecanic' || role === 'dispecer' || role === 'admin')) return;

    const { data, error } = await supabase.rpc('finalizar_contenedor', {
      p_matricula: row.matricula_contenedor,
      p_programado_id: row.programado_id || row.id,
      p_matricula_camion: row.matricula_camion || null,
    });

    if (error || !data?.ok) {
      alert(data?.error || 'Nu s-a putut finaliza.');
    } else {
      setItems(prev => prev.filter(x => x.programado_id !== row.programado_id));
    }
  };

  return (
    <div className={styles.schedulerRoot}>
      <div className={styles.pageWrap}>
        <div className={styles.bg} />
        <div className={styles.vignette} />

        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => navigate('/depot')}>
            Depot
          </button>
          <h1 className={styles.title}>Programar Contenedor</h1>
          {(role === 'dispecer' || role === 'admin') && (
            <button className={styles.newBtn} onClick={() => setIsProgramarOpen(true)}>
              Programar
            </button>
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
            onHecho={handleHecho}
          />
        </div>
      </div>
    </div>
  );
}