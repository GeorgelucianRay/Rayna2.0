// src/components/depot/hooks/useScheduler.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

/* ===== Helpers date-only (fără surprize de fus orar) ===== */
const pad = (n) => String(n).padStart(2, '0');

// normalizează orice intră (Date sau 'YYYY-MM-DD') la cheie locală 'YYYY-MM-DD'
const toYMDLocal = (d) => {
  if (!d) return null;
  if (typeof d === 'string') {
    // Presupunem că Postgres DATE vine ca 'YYYY-MM-DD' => îl lăsăm așa
    return d;
  }
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${y}-${m}-${day}`;
};

// construiește interval ISO corect pentru o zi locală (pt. query pe timestamp)
const isoRangeForLocalDay = (d) => {
  const startLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  const toIso = (x) => new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString();
  return { startISO: toIso(startLocal), endISO: toIso(endLocal) };
};

export function useScheduler() {
  const [tab, setTab] = useState('todos');     // 'todos' | 'programado' | 'pendiente' | 'completado'
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(() => new Date()); // ziua selectată în calendar

  const [items, setItems] = useState([]);      // programados + contenedores
  const [doneItems, setDoneItems] = useState([]); // completados (salidos)
  const [loading, setLoading] = useState(true);

  /* ===== Încărcare programados + contenedores (nu pentru 'completado') ===== */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (tab === 'completado') return;
      setLoading(true);
      try {
        const { data: prog, error: e1 } = await supabase
          .from('contenedores_programados')
          .select('*');
        if (e1) throw e1;

        const { data: depo, error: e2 } = await supabase
          .from('contenedores')
          .select('*');
        if (e2) throw e2;

        if (!cancelled) {
          const mappedProg = (prog || []).map(r => ({
            ...r,
            programado_id: r.id,
            source: 'programados',
            _ymd: toYMDLocal(r.fecha || null), // normalizat pt. filtrele pe zi
          }));
          const mappedDepot = (depo || []).map(r => ({
            ...r,
            programado_id: null,
            source: 'contenedores',
          }));
          setItems([...mappedProg, ...mappedDepot]);
        }
      } catch (err) {
        console.error('Carga fallida:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [tab]);

  /* ===== Încărcare completados (salidos) PENTRU ziua selectată ===== */
  useEffect(() => {
    let cancelled = false;
    const loadDone = async () => {
      if (tab !== 'completado') return;
      setLoading(true);
      try {
        const { startISO, endISO } = isoRangeForLocalDay(date);
        const { data, error } = await supabase
          .from('contenedores_salidos')
          .select('*')
          .gte('fecha_salida', startISO)
          .lt('fecha_salida', endISO);
        if (error) throw error;
        if (!cancelled) setDoneItems(data || []);
      } catch (err) {
        console.error('Carga completados fallida:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadDone();
    return () => { cancelled = true; };
  }, [tab, date]);

  /* ===== Marcaje pentru calendar: câte programări are fiecare zi ===== */
  const eventsByDay = useMemo(() => {
    const map = {};
    (items || []).forEach(r => {
      if (r.source !== 'programados') return;
      const key = r._ymd || toYMDLocal(r.fecha || null);
      if (!key) return;
      if (!map[key]) map[key] = { total: 0, programado: 0, pendiente: 0 };
      map[key].total += 1;
      if ((r.estado || 'programado') === 'pendiente') map[key].pendiente += 1;
      else map[key].programado += 1;
    });
    return map;
  }, [items]);

  /* ===== Filtrare listă pentru UI ===== */
  const filtered = useMemo(() => {
    if (tab === 'completado') return doneItems;

    let list = items;

    if (tab === 'programado') {
      list = list.filter(x => x.source === 'programados' && (x.estado || 'programado') !== 'pendiente');
      // filtrare pe zi selectată
      const key = toYMDLocal(date);
      list = list.filter(x => (x._ymd || toYMDLocal(x.fecha || null)) === key);
    }

    if (tab === 'pendiente') {
      list = list.filter(x => x.source === 'programados' && x.estado === 'pendiente');
      const key = toYMDLocal(date);
      list = list.filter(x => (x._ymd || toYMDLocal(x.fecha || null)) === key);
    }

    // 'todos' — fără filtrare la zi, rămâne mix programados + en depósito

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(x =>
        `${x.matricula_contenedor ?? ''} ${x.naviera ?? ''} ${x.empresa_descarga ?? ''}`
          .toLowerCase()
          .includes(q)
      );
    }
    return list;
  }, [tab, items, doneItems, query, date]);

  /* ===== ACȚIUNI ===== */

  // A) Eliminar (din programados -> revine în contenedores)
  const eliminarProgramado = useCallback(async (row) => {
    if (row?.source !== 'programados') return;

    setItems(prev => prev.filter(x => x.programado_id !== row.programado_id)); // optimist

    try {
      const { error: delErr } = await supabase
        .from('contenedores_programados')
        .delete()
        .eq('id', row.programado_id);
      if (delErr) throw delErr;

      const insertObj = {
        matricula_contenedor: row.matricula_contenedor,
        empresa_descarga: row.empresa_descarga ?? null,
        naviera: row.naviera ?? null,
        posicion: row.posicion ?? null
      };
      const { error: insErr } = await supabase.from('contenedores').insert(insertObj);
      if (insErr) throw insErr;
    } catch (err) {
      console.error('Eliminar fallida:', err);
      setItems(prev => [...prev, { ...row }]); // rollback
      alert('No se pudo eliminar.');
    }
  }, []);

  // B) Hecho (programado -> salidos) – RPC
  const marcarHecho = useCallback(async (row) => {
    if (row?.source !== 'programados' || (row.estado || 'programado') === 'pendiente') return;

    setItems(prev => prev.filter(x => x.programado_id !== row.programado_id)); // optimist
    try {
      const { data, error } = await supabase.rpc('finalizar_contenedor', {
        p_matricula: row.matricula_contenedor,
        p_programado_id: row.programado_id || row.id,
        p_matricula_camion: row.matricula_camion || null,
      });
      if (error || !data?.ok) throw new Error(data?.error || 'RPC finalizar_contenedor falló');
    } catch (err) {
      console.error('Hecho fallida:', err);
      setItems(prev => [...prev, { ...row }]); // rollback
      alert('No se pudo marcar como Hecho.');
    }
  }, []);

  // C) Editar doar poziția (Programado)
  const editarPosicion = useCallback(async (row, nuevaPosicion) => {
    if (row?.source !== 'programados') return;
    setItems(prev => prev.map(x =>
      x.programado_id === row.programado_id ? { ...x, posicion: nuevaPosicion } : x
    ));
    try {
      const { error } = await supabase
        .from('contenedores_programados')
        .update({ posicion: nuevaPosicion })
        .eq('id', row.programado_id);
      if (error) throw error;
    } catch (err) {
      console.error('Editar posición fallida:', err);
      alert('No se pudo editar la posición.');
    }
  }, []);

  // D) Editar COMPLET (Pendiente)
  const actualizarProgramado = useCallback(async (row, payload) => {
    if (row?.source !== 'programados') return;
    setItems(prev => prev.map(x =>
      x.programado_id === row.programado_id ? { ...x, ...payload, _ymd: toYMDLocal(payload.fecha ?? x.fecha) } : x
    ));
    try {
      const { error } = await supabase
        .from('contenedores_programados')
        .update(payload)
        .eq('id', row.programado_id);
      if (error) throw error;
    } catch (err) {
      console.error('Actualizar programado fallida:', err);
      alert('No se pudo guardar.');
    }
  }, []);

  return {
    // state UI
    tab, setTab,
    query, setQuery,
    date, setDate,

    // listări + marcaje
    filtered,
    eventsByDay,
    loading,

    // acțiuni
    eliminarProgramado,
    marcarHecho,
    editarPosicion,
    actualizarProgramado,
  };
}