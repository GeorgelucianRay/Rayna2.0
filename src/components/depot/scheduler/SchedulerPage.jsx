// src/components/Depot/scheduler/SchedulerPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../AuthContext';
import { supabase } from '../../../supabaseClient';
import { useScheduler } from "../hooks/useScheduler";

import styles from './SchedulerPage.module.css';

import SchedulerToolbar from './SchedulerToolbar';
import SchedulerList from './SchedulerList';
import SchedulerDetailModal from './SchedulerDetailModal';
import SchedulerCalendar from './SchedulerCalendar';

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
    // dacă hook-ul tău are un refetch, îl poți apela după inserții:
    // refetch,
  } = useScheduler();

  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState(null); // 'en_deposito' | 'programado' | 'pendiente'
  const calRef = useRef(null);

  // mecanicii nu văd "Todos"
  useEffect(() => {
    if (role === 'mecanic' && tab === 'todos') setTab('programado');
  }, [role, tab, setTab]);

  const handleProgramarClick = () => {
    if (window.innerWidth <= 980 && calRef.current) {
      calRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const onSelect = (row) => {
    // Determină modul după sursă/stare
    if (row?.source === 'programados') {
      if (row?.estado === 'pendiente') setMode('pendiente');
      else setMode('programado');
    } else {
      setMode('en_deposito');
    }
    setSelected(row);
  };

  // ➜ Programar un contenedor care e "en depósito" (creează în contenedores_programados)
  const onProgramarDesdeDeposito = async (row, payload) => {
    // payload conține: empresa_descarga, fecha, hora, posicion, matricula_camion (opțional)
    try {
      const insert = {
        matricula_contenedor: (row?.matricula_contenedor || '').toUpperCase(),
        naviera: row?.naviera || null,
        tipo: row?.tipo || null,
        posicion: payload.posicion || null,
        empresa_descarga: payload.empresa_descarga || null,
        fecha: payload.fecha || null,
        hora: payload.hora || null,
        matricula_camion: payload.matricula_camion || null,
        estado: 'programado',
      };
      const { error } = await supabase.from('contenedores_programados').insert([insert]);
      if (error) throw error;
      // poți comuta pe tab-ul “programado” ca să vezi imediat:
      setTab('programado');
      setSelected(null);
      setMode(null);
      // refetch?.();
      alert('Programación guardada con éxito.');
    } catch (e) {
      console.error(e);
      alert(`Error al programar el contenedor:\n${e.message || e}`);
    }
  };

  // ➜ Actualizar un programado (completare din “pendiente” sau editare ușoară)
  const onActualizarProgramado = async (row, payload) => {
    try {
      await actualizarProgramado(row, payload);
      setSelected(null);
      setMode(null);
      // refetch?.();
      alert('Actualización guardada.');
    } catch (e) {
      console.error(e);
      alert(`Error al actualizar:\n${e.message || e}`);
    }
  };

  // ➜ Editar solo la posición (atașăm pentru modul programado)
  const onEditarPosicion = async (row, posicion) => {
    try {
      await editarPosicion(row, posicion);
      setSelected(null);
      setMode(null);
      // refetch?.();
      alert('Posición actualizada.');
    } catch (e) {
      console.error(e);
      alert(`Error al actualizar la posición:\n${e.message || e}`);
    }
  };

  // ➜ Hecho (muta în contenedores_salidos)
  const onHecho = async (row) => {
    try {
      await marcarHecho(row);
      setSelected(null);
      setMode(null);
      // refetch?.();
      alert('Salida registrada (Hecho).');
    } catch (e) {
      console.error(e);
      alert(`Error al marcar como hecho:\n${e.message || e}`);
    }
  };

  // ➜ Eliminar (doar programados)
  const onEliminar = async (row) => {
    try {
      await eliminarProgramado(row);
      setSelected(null);
      setMode(null);
      // refetch?.();
      alert('Programación eliminada.');
    } catch (e) {
      console.error(e);
      alert(`Error al eliminar:\n${e.message || e}`);
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
          <SchedulerList
            items={filtered}
            tab={tab}
            loading={loading}
            role={role}
            onSelect={onSelect}
          />

          <div ref={calRef}>
            <SchedulerCalendar date={date} setDate={setDate} />
          </div>
        </div>

        <SchedulerDetailModal
          open={!!selected}
          row={selected}
          mode={mode}
          role={role}
          onClose={() => { setSelected(null); setMode(null); }}
          onProgramarDesdeDeposito={onProgramarDesdeDeposito}
          onActualizarProgramado={onActualizarProgramado}
          onEditarPosicion={onEditarPosicion}
          onHecho={onHecho}
          onEliminar={onEliminar}
        />
      </div>
    </div>
  );
}