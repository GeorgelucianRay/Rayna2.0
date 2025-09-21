// src/components/depot/scheduler/SchedulerPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../AuthContext';
import { useScheduler } from '../hooks/useScheduler';

import styles from './SchedulerPage.module.css';

import SchedulerToolbar from './SchedulerToolbar';
import SchedulerList from './SchedulerList';
import SchedulerDetailModal from './SchedulerDetailModal';
import SchedulerCalendar from './SchedulerCalendar';
import ProgramarModal from './ProgramarModal';

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
  const [programarOpen, setProgramarOpen] = useState(false);
  const calRef = useRef(null);

  // Los mecánicos no ven "Todos"
  useEffect(() => {
    if (role === 'mecanic' && tab === 'todos') setTab('programado');
  }, [role, tab, setTab]);

  const handleProgramarClick = () => {
    // Abrimos el modal de programación
    setProgramarOpen(true);
    // Si quieres además hacer scroll al calendario en móvil, descomenta lo de abajo:
    // if (window.innerWidth <= 980 && calRef.current) {
    //   calRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // }
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
          {/* Lista (izquierda) */}
          <SchedulerList
            items={filtered}
            tab={tab}
            loading={loading}
            role={role}
            onSelect={setSelected}
          />

          {/* Calendario (derecha o abajo en móvil) */}
          <div ref={calRef}>
            <SchedulerCalendar date={date} setDate={setDate} />
          </div>
        </div>

        {/* Modal de detalle/edición */}
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

        {/* Modal para crear una programación desde "En Depósito" */}
        <ProgramarModal
          open={programarOpen}
          onClose={() => setProgramarOpen(false)}
          onDone={() => {
            // tras guardar, mostramos la pestaña “Programado”
            setTab('programado');
            setProgramarOpen(false);
          }}
        />
      </div>
    </div>
  );
}