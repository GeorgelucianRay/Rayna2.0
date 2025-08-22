import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useScheduler } from '../hooks/useScheduler';

// doar CSS-ul acestei pagini
import styles from './SchedulerPage.module.css';

// componentele își importă CSS-urile proprii
import SchedulerToolbar from '../components/scheduler/SchedulerToolbar.jsx';
import SchedulerList from '../components/scheduler/SchedulerList.jsx';
import SchedulerDetailModal from '../components/scheduler/SchedulerDetailModal.jsx';
import SchedulerCalendar from '../components/scheduler/SchedulerCalendar.jsx';

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
  const calRef = useRef(null);

  // mecanicii nu văd "Todos"
  useEffect(() => {
    if (role === 'mecanic' && tab === 'todos') setTab('programado');
  }, [role, tab, setTab]);

  const handleProgramarClick = () => {
    // pe mobil: scroll la calendar (care e sub listă)
    if (window.innerWidth <= 980 && calRef.current) {
      calRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={styles.schedulerRoot}>
      <div className={styles.pageWrap}>
        <div className={styles.bg} />
        <div className={styles.vignette} />

        <div className={styles.topBar}>
          <Link to="/depot" className={styles.backBtn}>Depot</Link>
          <h1 className={styles.title}>Programar Contenedor</h1>
          {(role === 'dispecer' || role === 'admin') && (
            <button className={styles.newBtn} onClick={handleProgramarClick}>
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
          {/* stânga: LISTA */}
          <SchedulerList
            items={filtered}
            tab={tab}
            loading={loading}
            role={role}
            onHecho={async (row) => { await marcarHecho(row); }}
            onSelect={setSelected}
          />

          {/* dreapta (sau jos pe mobil): CALENDAR */}
          <div ref={calRef}>
            <SchedulerCalendar date={date} setDate={setDate} />
          </div>
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