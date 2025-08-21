import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useScheduler() {
  const [tab, setTab] = useState('todos');
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [items, setItems] = useState([]);
  const [doneItems, setDoneItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Programados + Contenedores
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (tab === 'completado') return;
      setLoading(true);
      try {
        const { data: prog, error: e1 } = await supabase.from('contenedores_programados').select('*');
        if (e1) throw e1;
        const { data: depo, error: e2 } = await supabase.from('contenedores').select('*');
        if (e2) throw e2;

        if (!cancelled) {
          const mappedProg = (prog || []).map(r => ({ ...r, programado_id: r.id, source: 'programados' }));
          const mappedDepot = (depo || []).map(r => ({ ...r, programado_id: null, source: 'contenedores' }));
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

  // Completados (după zi)
  useEffect(() => {
    let cancelled = false;
    const loadDone = async () => {
      if (tab !== 'completado') return;
      setLoading(true);
      try {
        const start = new Date(date); start.setHours(0,0,0,0);
        const end = new Date(start); end.setDate(end.getDate() + 1);

        const { data, error } = await supabase
          .from('contenedores_salidos')
          .select('*')
          .gte('fecha_salida', start.toISOString())
          .lt('fecha_salida', end.toISOString());

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

  // Filtru
  const filtered = useMemo(() => {
    if (tab === 'completado') return doneItems;
    let list = items;
    if (tab === 'programado') list = list.filter(x => x.source === 'programados' && (x.estado || 'programado') !== 'pendiente');
    if (tab === 'pendiente')  list = list.filter(x => x.source === 'programados' && x.estado === 'pendiente');
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(x =>
        `${x.matricula_contenedor ?? ''} ${x.naviera ?? ''} ${x.empresa_descarga ?? ''}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tab, items, doneItems, query]);

  /* === ACȚIUNI === */

  // A) Eliminar (din programados -> revine în contenedores)
  const eliminarProgramado = useCallback(async (row) => {
    if (row?.source !== 'programados') return;

    // optimist: scoatem din listă
    setItems(prev => prev.filter(x => x.programado_id !== row.programado_id));

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
      alert('Nu s-a putut elimina.');
    }
  }, []);

  // B) Hecho (programado -> salidos) – RPC-ul tău
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
      alert('Nu s-a putut marca ca Hecho.');
    }
  }, []);

  // C) Editar doar poziția (când e Programado)
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
      alert('Nu s-a putut edita poziția.');
    }
  }, []);

  // D) Editar COMPLET (când e Pendiente)
  const actualizarProgramado = useCallback(async (row, payload) => {
    if (row?.source !== 'programados') return;
    setItems(prev => prev.map(x =>
      x.programado_id === row.programado_id ? { ...x, ...payload } : x
    ));
    try {
      const { error } = await supabase
        .from('contenedores_programados')
        .update(payload)
        .eq('id', row.programado_id);
      if (error) throw error;
    } catch (err) {
      console.error('Actualizar programado fallida:', err);
      alert('Nu s-a putut salva.');
    }
  }, []);

  return {
    tab, setTab,
    query, setQuery,
    date, setDate,
    filtered,
    loading,

    eliminarProgramado,
    marcarHecho,
    editarPosicion,
    actualizarProgramado,
  };
}