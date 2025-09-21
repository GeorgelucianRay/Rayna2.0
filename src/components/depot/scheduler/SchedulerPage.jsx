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
import ProgramarPickerModal from './ProgramarPickerModal';
import ProgramarFormModal from './ProgramarFormModal';

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
    // opțional: poți expune un refetch() din useScheduler ca să reîncarci după salvare
  } = useScheduler();

  const [selected, setSelected] = useState(null);

  // modale programare (2 pași)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedContainer, setPickedContainer] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const calRef = useRef(null);

  useEffect(() => {
    if (role === 'mecanic' && tab === 'todos') setTab('programado');
  }, [role, tab, setTab]);

  const openProgramarFlow = () => {
    setPickedContainer(null);
    setFormOpen(false);
    setPickerOpen(true);
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
            <button className={styles.newBtn} onClick={openProgramarFlow}>
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

        {/* PAS 1: alege contenedor */}
        <ProgramarPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPick={(it) => {
            setPickedContainer(it);
            setFormOpen(true);       // deschide formularul peste
          }}
        />

        {/* PAS 2: formular (peste) */}
        <ProgramarFormModal
          open={formOpen}
          contenedor={pickedContainer}
          onClose={() => {
            setFormOpen(false);
            // dacă închizi formularul, poți lăsa picker-ul deschis ca să alegi altul
            // sau îl închidem și pe el:
            // setPickerOpen(false);
          }}
          onSaved={() => {
            // după guardado, mergem pe “Programado”
            setTab('programado');
            setFormOpen(false);
            setPickerOpen(false);
            // dacă ai un refetch() în useScheduler, apelează-l aici
          }}
        />
      </div>
    </div>
  );
}