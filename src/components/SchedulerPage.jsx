import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext'; // ai deja acest context
import styles from './SchedulerStandalone.module.css'; // CSS-ul tău actual

// Iconițe mici inline (evităm dependențe externe)
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

export default function SchedulerPage() {
  const navigate = useNavigate();
  const { role } = useAuth();            // 'dispecer' | 'mecanic' | ...
  const [tab, setTab] = useState('todos'); // 'todos' | 'programado' | 'pendiente' | 'completado'
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(() => new Date()); // pentru „Completado”
  const [items, setItems] = useState([]);             // listă combinată
  const [loading, setLoading] = useState(true);

  // modal „Nuevo” (nu schimb logica ta existentă aici)
  const [isOpenNuevo, setIsOpenNuevo] = useState(false);

  // ====== FETCH ======
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);

      try {
        // 1) Programados
        const { data: prog, error: e1 } = await supabase
          .from('contenedores_programados')
          .select('*')
          .order('created_at', { ascending: false });

        if (e1) throw e1;

        const mappedProg = (prog || []).map(r => ({
          ...r,
          programado_id: r.id,
          source: 'programados',         // <- important
        }));

        // 2) En depósito (contenedores) — vor apărea cu badge „No programado”
        const { data: depo, error: e2 } = await supabase
          .from('contenedores')
          .select('*')
          .order('created_at', { ascending: false });

        if (e2) throw e2;

        const mappedDepot = (depo || []).map(r => ({
          ...r,
          programado_id: null,
          source: 'contenedores',
        }));

        // 3) combinat (doar pentru tab-urile care NU sunt „completado”)
        if (!cancelled) {
          setItems([...mappedProg, ...mappedDepot]);
        }
      } catch (err) {
        console.error('Carga fallida:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (tab !== 'completado') load();
    return () => { cancelled = true; };
  }, [tab]);

  // Completado: listăm din „contenedores_salidos” în funcție de ziua selectată
  const [doneItems, setDoneItems] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const loadDone = async () => {
      if (tab !== 'completado') return;
      setLoading(true);
      try {
        const start = new Date(date);
        start.setHours(0,0,0,0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        const { data, error } = await supabase
          .from('contenedores_salidos')
          .select('*')
          .gte('fecha_salida', start.toISOString())
          .lt('fecha_salida', end.toISOString())
          .order('fecha_salida', { ascending: false });

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

  // ====== FILTER SEARCH ======
  const filtered = useMemo(() => {
    if (tab === 'completado') return doneItems;

    let list = items;
    if (tab === 'programado') list = list.filter(x => x.source === 'programados');
    if (tab === 'pendiente')  list = list.filter(x =>
      x.source === 'programados' &&
      (x.estado === 'pendiente' || x.status === 'pendiente' || x.etapa === 'pendiente')
    );

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(x =>
        (x.matricula_contenedor || '').toLowerCase().includes(q) ||
        (x.naviera || '').toLowerCase().includes(q) ||
        (x.empresa_descarga || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [tab, items, doneItems, query]);

  // ====== HECHO (RPC universal) ======
  const handleHecho = async (row) => {
    // Mecánico și dispecer au voie. Alt rol: nu.
    if (role !== 'mecanic' && role !== 'dispecer') {
      alert('No autorizado.');
      return;
    }
    const payload = {
      p_matricula: row.matricula_contenedor,
      p_programado_id: row.programado_id || null,
      p_matricula_camion: row.matricula_camion || null,
    };

    const { data, error } = await supabase.rpc('finalizar_contenedor', payload);
    if (error || !data?.ok) {
      console.error(error || data);
      alert(data?.error || 'No se pudo completar la salida.');
      return;
    }

    // scoatem din listă locală
    if (tab === 'completado') {
      // dacă ești pe completado, refetch
      setDoneItems(prev => prev.filter(x => x.matricula_contenedor !== row.matricula_contenedor));
    } else {
      setItems(prev => prev.filter(x => x.matricula_contenedor !== row.matricula_contenedor));
    }
  };

  // ====== UI ======

  // titlul lunii în spaniolă pentru calendar
  const monthTitle = useMemo(() => {
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  }, [date]);

  // grid simplu de calendar (doar pentru alegerea zilei la „Completado”)
  const renderCalendar = () => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const first = new Date(y, m, 1);
    const startDay = (first.getDay() + 6) % 7; // L=0 .. D=6
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push({ blank: true, key: `b-${i}` });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, key: `d-${d}` });

    return (
      <div className={`${styles.card} ${styles.sideCard}`}>
        <div className={styles.sideHeader}><h3>{monthTitle}</h3></div>
        <div className={styles.week}>
          <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span>
        </div>
        <div className={styles.calendar}>
          {cells.map((c) => c.blank ? (
            <div key={c.key} className={styles.placeholderDay} />
          ) : (
            <button
              key={c.key}
              className={[
                styles.day,
                c.day === date.getDate() ? styles.dayActive : ''
              ].join(' ')}
              onClick={() => setDate(new Date(y, m, c.day))}
            >
              {c.day}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.bg} />
      <div className={styles.vignette} />

      {/* top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/depot')}>
          <BackIcon /> Depot
        </button>
        <h1 className={styles.title}>Programar Contenedor</h1>
        {role === 'dispecer' ? (
          <button className={styles.newBtn} onClick={() => setIsOpenNuevo(true)}>Nuevo</button>
        ) : <span style={{ width: 96 }} /> }
      </div>

      {/* toolbar */}
      <div className={`${styles.card} ${styles.toolbar}`}>
        <div className={styles.chips}>
          {['todos','programado','pendiente','completado'].map(k => (
            <button
              key={k}
              className={`${styles.chip} ${tab === k ? styles.chipActive : ''}`}
              onClick={() => setTab(k)}
            >
              {k === 'todos' && 'Todos'}
              {k === 'programado' && 'Programado'}
              {k === 'pendiente' && 'Pendiente'}
              {k === 'completado' && 'Completado'}
            </button>
          ))}
        </div>

        <div className={styles.inputs}>
          <div className={styles.search}>
            <span className={styles.searchIcon}><SearchIcon/></span>
            <input
              placeholder="Buscar…"
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
            />
          </div>
          {tab === 'completado' && (
            <input
              className={styles.date}
              type="date"
              value={new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString().slice(0,10)}
              onChange={(e)=> setDate(new Date(e.target.value))}
            />
          )}
        </div>
      </div>

      {/* listă + calendar */}
      <div className={styles.grid}>
        <div className={styles.card}>
          {loading ? (
            <p style={{opacity:.85}}>Cargando…</p>
          ) : (tab === 'completado' ? (
            <ul className={styles.list}>
              {filtered.length === 0 && <p>No hay contenedores completados.</p>}
              {filtered.map(row => (
                <li key={row.id || `${row.matricula_contenedor}-${row.fecha_salida}`} className={styles.item}>
                  <div>
                    <div className={styles.itemTop}>
                      <span className={styles.dot} />
                      <span className={styles.cid}>{row.matricula_contenedor}</span>
                      <span className={`${styles.badge} ${styles.badgeInfo}`}>Completado</span>
                    </div>
                    <div className={styles.meta}>
                      <span className={styles.cliente}>{row.cliente_descarga || row.naviera || '—'}</span>
                      {row.fecha_salida && <span className={styles.fecha}>
                        {new Date(row.fecha_salida).toLocaleString('es-ES')}
                      </span>}
                      {row.matricula_camion && <span className={styles.plate}>{row.matricula_camion}</span>}
                    </div>
                  </div>
                  {/* Completado: fără acțiuni */}
                </li>
              ))}
            </ul>
          ) : (
            <ul className={styles.list}>
              {filtered.length === 0 && <p>No hay contenedores programados.</p>}
              {filtered.map(row => (
                <li key={(row.source==='programados'? row.programado_id : row.id) || row.matricula_contenedor} className={styles.item}>
                  <div>
                    <div className={styles.itemTop}>
                      <span className={styles.dot} />
                      <span className={styles.cid}>{row.matricula_contenedor}</span>
                      {row.source === 'programados'
                        ? <span className={`${styles.badge} ${styles.badgeInfo}`}>Programado</span>
                        : <span className={`${styles.badge} ${styles.badgeWarn}`}>No programado</span>
                      }
                    </div>
                    <div className={styles.meta}>
                      <span className={styles.cliente}>{row.empresa_descarga || row.naviera || '—'}</span>
                      {row.fecha && <span className={styles.fecha}>{row.fecha}</span>}
                      {row.hora && <span className={styles.time}>{row.hora}</span>}
                      {row.matricula_camion && <span className={styles.plate}>{row.matricula_camion}</span>}
                      {/* detalii utile */}
                      {row.tipo && <span>• {row.tipo}</span>}
                      {row.posicion && <span>• {row.posicion}</span>}
                    </div>
                  </div>

                  <div className={styles.actions}>
                    {role === 'dispecer' && row.source === 'programados' && (
                      <>
                        <button className={styles.actionMini} onClick={()=>alert('Editar próximamente')}>
                          Editar
                        </button>
                        <button className={styles.actionGhost} onClick={()=>alert('Cancelar próximamente')}>
                          Cancelar
                        </button>
                      </>
                    )}
                    {(role === 'mecanic' || role === 'dispecer') && (
                      <button className={styles.actionOk} onClick={()=>handleHecho(row)}>
                        Hecho
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ))}
        </div>

        {/* calendar lateral (util la Completado; pe mobil coboară jos) */}
        {renderCalendar()}
      </div>

      {/* MODAL „Nuevo” — placeholder, păstrez controlul doar vizual ca să nu stric logica ta existentă */}
      {isOpenNuevo && (
        <div className={styles.modalOverlay} onClick={()=>setIsOpenNuevo(false)}>
          <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Nuevo — Programar contenedor</h3>
              <button className={styles.closeIcon} onClick={()=>setIsOpenNuevo(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p>Formularul tău rămâne neschimbat aici (selectezi din „contenedores” și salvezi în „contenedores_programados”).</p>
              <p>Important: când salvezi, **șterge din contenedores** ca să respecți noua logică.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}