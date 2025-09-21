import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../AuthContext';
import { supabase } from '../../../supabaseClient';

import styles from './SchedulerPage.module.css';

import SchedulerToolbar from './SchedulerToolbar';
import SchedulerList from './SchedulerList';
import SchedulerDetailModal from './SchedulerDetailModal';
import SchedulerCalendar from './SchedulerCalendar';
import ProgramarDesdeDepositoModal from './ProgramarDesdeDepositoModal';

// hook existent din proiectul tău
import { useScheduler } from "../hooks/useScheduler";

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
    // notă: nu depind de el pentru inserții din depozit (facem local mai jos)
  } = useScheduler();

  const [selected, setSelected] = useState(null);
  const calRef = useRef(null);

  // Modal: Programar desde En Depósito
  const [programarOpen, setProgramarOpen] = useState(false);

  useEffect(() => {
    if (role === 'mecanic' && tab === 'todos') setTab('programado');
  }, [role, tab, setTab]);

  const handleProgramarClick = () => {
    setProgramarOpen(true);
    if (window.innerWidth <= 980 && calRef.current) {
      calRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Inserție contenedor programado/pendiente din En Depósito
  const onProgramarDesdeDeposito = async (contenedorRow, payload) => {
    const insert = {
      matricula_contenedor: (contenedorRow.matricula_contenedor || '').toUpperCase(),
      naviera: contenedorRow.naviera || null,
      tipo: contenedorRow.tipo || null,
      posicion: (payload.posicion || contenedorRow.posicion || null),
      empresa_descarga: payload.empresa_descarga || null,
      fecha: payload.fecha || null,
      hora: payload.hora || null,
      matricula_camion: payload.matricula_camion || null,
      estado: payload.estado || 'programado', // 'programado' | 'pendiente'
    };
    const { error } = await supabase.from('contenedores_programados').insert([insert]);
    if (error) {
      console.error(error);
      alert(`Error al programar:\n${error.message || error}`);
      return;
    }
    alert('¡Programación guardada!');
  };

  // Export Excel pentru tab-ul curent
  const exportarExcelTab = () => {
    const items = filtered || [];
    const hoja = items.map((r) => {
      if (tab === 'completado') {
        return {
          'Matrícula Contenedor': (r.matricula_contenedor || '').toUpperCase(),
          'Cliente/Empresa': r.empresa_descarga || '',
          'Fecha Salida': r.fecha_salida ? new Date(r.fecha_salida).toLocaleString() : '',
          'Posición': r.posicion || '',
          'Naviera': r.naviera || '',
          'Tipo': r.tipo || '',
          'Matrícula Camión': r.matricula_camion || '',
          'Detalles': r.detalles || '',
        };
      }
      // programado / pendiente / todos
      return {
        'Matrícula Contenedor': (r.matricula_contenedor || '').toUpperCase(),
        'Estado': r.estado || (r.source === 'contenedores' ? 'en_deposito' : ''),
        'Cliente/Empresa': r.empresa_descarga || r.naviera || '',
        'Fecha': r.fecha || '',
        'Hora': r.hora || '',
        'Posición': r.posicion || '',
        'Naviera': r.naviera || '',
        'Tipo': r.tipo || '',
        'Matrícula Camión': r.matricula_camion || '',
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(hoja);
    XLSX.utils.book_append_sheet(wb, ws, (tab || 'lista').toUpperCase());

    const filename =
      tab === 'programado' ? 'programado.xlsx'
      : tab === 'pendiente' ? 'pendiente.xlsx'
      : tab === 'completado' ? 'completado.xlsx'
      : 'programacion.xlsx';

    XLSX.writeFile(wb, filename);
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
          canProgramar={role === 'dispecer' || role === 'admin'}
          onProgramarClick={handleProgramarClick}
          onExportExcel={exportarExcelTab}
        />

        <div className={styles.grid}>
          <SchedulerList
            items={filtered}
            tab={tab}
            loading={loading}
            role={role}
            onSelect={setSelected}
          />

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
          onHecho={async (row)   => { await marcarHecho(row);       setSelected(null); }}
          onEditar={async (row, payload) => { await actualizarProgramado(row, payload); setSelected(null); }}
          onEditarPosicion={async (row, pos) => { await editarPosicion(row, (pos || '').toUpperCase()); setSelected(null); }}
        />

        <ProgramarDesdeDepositoModal
          open={programarOpen}
          onClose={() => setProgramarOpen(false)}
          onProgramar={async (row, payload) => {
            await onProgramarDesdeDeposito(row, payload);
            setProgramarOpen(false);
          }}
        />
      </div>
    </div>
  );
}