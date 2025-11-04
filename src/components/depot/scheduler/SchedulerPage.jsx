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

  // modal: Programar
  const [programarOpen, setProgramarOpen] = useState(false);

  // markere calendar (doar vizual)
  const [markers, setMarkers] = useState({});

  useEffect(() => {
    if (role === 'mecanic' && tab === 'todos') setTab('programado');
  }, [role, tab, setTab]);

  const handleCalendarClick = () => {
    calRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // markere lunare
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

      if (error) { console.error('Month markers:', error); setMarkers({}); return; }
      const map = {};
      (data || []).forEach(r => { if (r.fecha) map[r.fecha] = (map[r.fecha] || 0) + 1; });
      setMarkers(map);
    };
    loadMonth();
  }, [date]);

  // lista = tot din filtered (fără filtre de zi)
  const visibleItems = useMemo(() => filtered || [], [filtered]);

  // export excel
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

  // inserție programare din modal (identic cu varianta ta anterioară)
  const onProgramarDesdeDeposito = async (_row, payload) => {
    const insert = {
      matricula_contenedor: (payload.matricula_contenedor || '').toUpperCase(),
      naviera: payload.naviera || null,
      tipo: payload.tipo || null,
      posicion: payload.posicion || null,
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
    if (insert.fecha) {
      setMarkers(prev => ({ ...prev, [insert.fecha]: (prev[insert.fecha] || 0) + 1 }));
    }
    setProgramarOpen(false);
    alert('¡Programación guardada!');
  };

  return (

        <SchedulerToolbar
          tabs={TABS}
          tab={tab} setTab={setTab}
          query={query} setQuery={setQuery}
          date={date} setDate={setDate}
          onCalendarClick={handleCalendarClick}
          onExportExcel={exportarExcelTab}
          onProgramarClick={() => setProgramarOpen(true)}  // 👈 buton “Programar” lângă Excel
          canProgramar={role === 'admin' || role === 'dispecer'}
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
              markers={markers}
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
          onProgramar={onProgramarDesdeDeposito}
        />
      </div>
    </div>
  );
}