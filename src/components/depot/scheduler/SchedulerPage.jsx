// src/components/Depot/scheduler/SchedulerPage.jsx
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
import { useScheduler } from '../hooks/useScheduler';

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

  // Modal: Programar desde En Depósito
  const [programarOpen, setProgramarOpen] = useState(false);

  // ── Calendar integration ─────────────────────────────────────────────────────
  // mark days with programados in current month: { 'YYYY-MM-DD': count }
  const [markers, setMarkers] = useState({});
  // single-day filter for Programado/Pendiente/Todos (string 'YYYY-MM-DD' or null)
  const [dayFilter, setDayFilter] = useState(null);
  // multi-select zile pentru Completado (set de 'YYYY-MM-DD')
  const [selectedDates, setSelectedDates] = useState(new Set());

  // dacă rolul e mecanic, ascunde "Todos"
  useEffect(() => {
    if (role === 'mecanic' && tab === 'todos') setTab('programado');
  }, [role, tab, setTab]);

  const handleProgramarClick = () => {
    setProgramarOpen(true);
    if (window.innerWidth <= 980 && calRef.current) {
      calRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Fetch programări pentru luna curentă (pt. markere)
  useEffect(() => {
    const loadMonth = async () => {
      const y = date.getFullYear();
      const m = date.getMonth();
      const start = new Date(y, m, 1).toISOString().slice(0, 10);
      const end   = new Date(y, m + 1, 0).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('contenedores_programados')
        .select('fecha')
        .gte('fecha', start)
        .lte('fecha', end);

      if (error) {
        console.error('Error loading month markers:', error);
        setMarkers({});
        return;
      }
      const map = {};
      (data || []).forEach(r => {
        const k = r.fecha; // 'YYYY-MM-DD'
        if (!k) return;
        map[k] = (map[k] || 0) + 1;
      });
      setMarkers(map);
    };
    loadMonth();
  }, [date]);

  // Când schimbi tabul, curăț filtrele specifice
  useEffect(() => {
    if (tab === 'completado') {
      setDayFilter(null); // folosește multi-select în completado
    } else {
      setSelectedDates(new Set());
    }
  }, [tab]);

  // Lista vizibilă după filtrele de calendar
  const visibleItems = useMemo(() => {
    let list = filtered || [];
    if (tab === 'completado') {
      if (selectedDates.size > 0) {
        list = list.filter(r => {
          const d = r.fecha_salida ? new Date(r.fecha_salida).toISOString().slice(0,10) : '';
          return selectedDates.has(d);
        });
      }
      return list;
    }
    // programado / pendiente / todos → filtru single-day (dacă există)
    if (dayFilter) {
      list = list.filter(r => (r.fecha || '').slice(0,10) === dayFilter);
    }
    return list;
  }, [filtered, tab, dayFilter, selectedDates]);

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
      estado: payload.estado || 'programado',
    };
    const { error } = await supabase.from('contenedores_programados').insert([insert]);
    if (error) {
      console.error(error);
      alert(`Error al programar:\n${error.message || error}`);
      return;
    }
    alert('¡Programación guardada!');
    // reîmprospătează markerele zilei respective
    if (insert.fecha) {
      setMarkers(prev => ({ ...prev, [insert.fecha]: (prev[insert.fecha] || 0) + 1 }));
    }
  };

  // Export Excel — exact lista vizibilă după filtre
  const exportarExcelTab = () => {
    const items = visibleItems || [];
    const hoja = items.map((r) => {
      if (tab === 'completado') {
        return {
          'Matrícula Contenedor': (r.matricula_contenedor || '').toUpperCase(),
          'Cliente/Empresa': r.empresa_descarga || '',
          'Fecha de Salida': r.fecha_salida ? new Date(r.fecha_salida).toLocaleString() : '',
          'Posición': r.posicion || '',
          'Naviera': r.naviera || '',
          'Tipo': r.tipo || '',
          'Matrícula Camión': r.matricula_camion || '',
          'Detalles': r.detalles || '',
        };
      }
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
      : 'programacion_todos.xlsx';

    XLSX.writeFile(wb, filename);
  };

  return (
    <div className={styles.schedulerRoot}>
      <div className={styles.pageWrap}>
        <div className={styles.bg} />
        <div className={styles.vignette} />

        <div className={styles.topBar}>
          <Link to="/depot" className={styles.backBtn}>Depósito</Link>
          <h1 className={styles.title}>Programar Contenedor</h1>
          {(role === 'dispecer' || role === 'admin') && (
            <button className={styles.newBtn} onClick={handleProgramarClick}>
              Programar
            </button>
          )}
        </div>

        <SchedulerToolbar
          tab={tab} setTab={(t)=>{ setTab(t); setDayFilter(null); setSelectedDates(new Set()); }}
          query={query} setQuery={setQuery}
          date={date} setDate={setDate}
          canProgramar={role === 'dispecer' || role === 'admin'}
          onProgramarClick={handleProgramarClick}
          onExportExcel={exportarExcelTab}
        />

        <div className={styles.grid}>
          <SchedulerList
            items={visibleItems}
            tab={tab}
            loading={loading}
            role={role}
            onSelect={setSelected}
          />

          <div ref={calRef}>
            <SchedulerCalendar
              date={date}
              setDate={setDate}
              mode={tab}                    // 'todos' | 'programado' | 'pendiente' | 'completado'
              markers={markers}             // { 'YYYY-MM-DD': count }
              selectedDates={selectedDates} // set pentru completado
              onSelectDay={(dayStr) => {    // single-day (non-completado)
                setDayFilter(dayStr);
                if (tab !== 'programado' && tab !== 'pendiente' && tab !== 'todos') {
                  setTab('programado');
                }
              }}
              onToggleDate={(dayStr) => {   // multi-select pentru completado
                setSelectedDates(prev => {
                  const next = new Set(prev);
                  if (next.has(dayStr)) next.delete(dayStr);
                  else next.add(dayStr);
                  return next;
                });
              }}
            />
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