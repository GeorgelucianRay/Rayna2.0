// src/hooks/useScheduler.js
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useScheduler() {
  const [tab, setTab] = useState('todos');
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [items, setItems] = useState([]);
  const [doneItems, setDoneItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Încarcă itemele programate și din depozit
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (tab === 'completado') return;
      setLoading(true);
      try {
        const { data: prog } = await supabase.from('contenedores_programados').select('*');
        const { data: depo } = await supabase.from('contenedores').select('*');
        
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

  // Încarcă itemele completate
  useEffect(() => {
    let cancelled = false;
    const loadDone = async () => {
      if (tab !== 'completado') return;
      setLoading(true);
      try {
        const start = new Date(date); start.setHours(0,0,0,0);
        const end = new Date(start); end.setDate(end.getDate() + 1);

        const { data } = await supabase
          .from('contenedores_salidos')
          .select('*')
          .gte('fecha_salida', start.toISOString())
          .lt('fecha_salida', end.toISOString());
          
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

  // Filtrarea listelor
  const filtered = useMemo(() => {
    if (tab === 'completado') return doneItems;
    let list = items;
    if (tab === 'programado') list = list.filter(x => x.source === 'programados' && (x.estado || 'programado') !== 'pendiente');
    if (tab === 'pendiente')  list = list.filter(x => x.source === 'programados' && x.estado === 'pendiente');
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(x =>
        `${x.matricula_contenedor} ${x.naviera} ${x.empresa_descarga}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tab, items, doneItems, query]);
  
  // Funcția de reîncărcare, utilă după o salvare
  const refreshData = useCallback(() => {
     // Forțăm un re-fetch prin schimbarea tab-ului și revenire
     const currentTab = tab;
     setTab(''); // O valoare invalidă pentru a declanșa re-fetch
     setTimeout(() => setTab(currentTab), 0);
  }, [tab]);

  return { 
    tab, setTab, 
    query, setQuery, 
    date, setDate,
    items, setItems, // setItems va fi util pentru ProgramarModal
    filtered, 
    loading,
    refreshData 
  };
}
