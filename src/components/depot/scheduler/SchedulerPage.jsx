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
// ⛔ Eliminat: ProgramarDesdeDepositoModal (nu mai deschidem modale de “programar”)
import { useScheduler } from '../hooks/useScheduler';

const TABS = ['programado', 'pendiente', 'completado']; // fără "todos"

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

  // ── Calendar markers (rămânem cu evidențierea zilelor, dar fără a filtra lista) ──
  const [markers, setMarkers] = useState({});

  // dacă rolul e mecanic și cumva ajunge pe “todos”, trecem pe “programado”
  useEffect(() => {
    if (role === 'mecanic' && tab === 'todos') setTab('programado');
  }, [role, tab, setTab]);

  // Butonul “Calendario” doar face scroll la calendar
  const handleCalendarClick = () => {
    if (calRef.current) {
      calRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Markere pentru luna curentă (fără a filtra lista)
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

  // 🔥 LISTA VIZIBILĂ = TOT din `filtered` (fără filtre de calendar)
  const visibleItems = useMemo(() => filtered || [], [filtered]);

  // Export Excel — exact lista vizibilă (toate)
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
      : 'programacion.xlsx';

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

          {/* 🔁 “Programar” -> “Calendario” */}
          <button className={styles.newBtn} onClick={handleCalendarClick}>
            Calendario
          </button>
        </div>

        <SchedulerToolbar
          tab={tab}
          setTab={(t)=>{ setTab(t); }}
          tabs={TABS}                // 🔹 (vezi nota de mai jos)
          query={query}
          setQuery={setQuery}
          date={date}
          setDate={setDate}
          onCalendarClick={handleCalendarClick}  // 🔹 (vezi nota)
          onExportExcel={exportarExcelTab}
          // ⛔ Eliminat: canProgramar / onProgramarClick
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
              mode={tab}         // 'programado' | 'pendiente' | 'completado'
              markers={markers}  // { 'YYYY-MM-DD': count }
              // ⛔ Eliminat filtrele de zi / multiselect — calendarul este pur vizual
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
      </div>
    </div>
  );
}