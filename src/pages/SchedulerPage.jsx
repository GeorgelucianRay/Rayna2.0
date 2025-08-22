import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useScheduler } from '../hooks/useScheduler';

// ✅ un singur CSS module, cel al paginii
import styles from './SchedulerPage.module.css';

// Componente (își importă singure CSS-ul lor)
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

  // mecanicii nu văd "Todos"
  useEffect(() => {
    if (role === 'mecanic' && tab === 'todos') setTab('programado');
  }, [role, tab, setTab]);

  return (
    <div className={styles.schedulerRoot}>
      <div className={styles.pageWrap}>
        <div className={styles.bg} />
        <div className={styles.vignette} />

        <div className={styles.topBar}>
          <Link to="/depot" className={styles.backBtn}>Depot</Link>
          <h1 className={styles.title}>Programar Contenedor</h1>
          {(role === 'dispecer' || role === 'admin') && (
            <button
              className={styles.newBtn}
              onClick={() => alert('Calendar vine în pasul următor 🙂')}
            >
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
            onHecho={async (row) => { await marcarHecho(row); }}
            onSelect={setSelected} // dacă lista îl folosește, se va deschide modalul
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
    </div>
  );
}