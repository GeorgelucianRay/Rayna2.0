import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import styles from './SchedulerStandalone.module.css';

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

  const { role: ctxRole, profile } = useAuth() || {};
  const role = String((profile?.role || ctxRole || '')).toLowerCase();
  const isManager = role === 'dispecer' || role === 'admin';
  const canHecho = isManager || role === 'mecanic';

  const [tab, setTab] = useState('todos');
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(() => new Date());

  const [items, setItems] = useState([]);
  const [doneItems, setDoneItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Modal Programar ---
  const [isOpenProgramar, setIsOpenProgramar] = useState(false);
  const [progSearch, setProgSearch] = useState('');
  const [match, setMatch] = useState(null);
  const [empresaDesc, setEmpresaDesc] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [matCamion, setMatCamion] = useState('');

  // ====== FETCH LISTE ======
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data: prog, error: e1 } = await supabase
          .from('contenedores_programados')
          .select('*')
          .order('created_at', { ascending: false });
        if (e1) throw e1;
        const mappedProg = (prog || []).map(r => ({ ...r, programado_id: r.id, source: 'programados' }));

        const { data: depo, error: e2 } = await supabase
          .from('contenedores')
          .select('*')
          .order('created_at', { ascending: false });
        if (e2) throw e2;
        const mappedDepot = (depo || []).map(r => ({ ...r, programado_id: null, source: 'contenedores' }));

        if (!cancelled) setItems([...mappedProg, ...mappedDepot]);
      } catch (err) {
        console.error('Carga fallida:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (tab !== 'completado') load();
    return () => { cancelled = true; };
  }, [tab]);

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

  // ====== FILTRARE ======
  const filtered = useMemo(() => {
    if (tab === 'completado') return doneItems;
    let list = items;
    if (tab === 'programado') list = list.filter(x => x.source === 'programados');
    if (tab === 'pendiente')
      list = list.filter(x =>
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

  // ====== HECHO (doar pt programados) ======
  const handleHecho = async (row) => {
    if (!canHecho || row.source !== 'programados') return;
    const payload = {
      p_matricula: row.matricula_contenedor,
      p_programado_id: row.programado_id || row.id || null,
      p_matricula_camion: row.matricula_camion || null,
    };
    const { data, error } = await supabase.rpc('finalizar_contenedor', payload);
    if (error || !data?.ok) {
      console.error(error || data);
      alert(data?.error || 'No se pudo completar la salida.');
      return;
    }
    setItems(prev => prev.filter(x => x.matricula_contenedor !== row.matricula_contenedor));
  };

  // ====== PROGRAMAR – căutare corectă după matrícula ======
  // Caută întâi exact (.eq), dacă nu există, caută parțial (.ilike %...%)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const m = progSearch.trim().toUpperCase();
      if (!m) { setMatch(null); return; }

      // 1) exact
      const exact = await supabase
        .from('contenedores')
        .select('id, matricula_contenedor, naviera, tipo, posicion, created_at, estado')
        .eq('matricula_contenedor', m)
        .maybeSingle();

      if (!cancelled && exact.data) {
        setMatch(exact.data);
        return;
      }
      if (!cancelled && exact.error && exact.error.details?.includes('Results contain 0 rows')) {
        // ignor — trecem la fallback
      }

      // 2) fallback: parțial (top 1)
      const fallback = await supabase
        .from('contenedores')
        .select('id, matricula_contenedor, naviera, tipo, posicion, created_at, estado')
        .ilike('matricula_contenedor', `%${m}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!cancelled) {
        setMatch((fallback.data && fallback.data[0]) || null);
      }
    })();
    return () => { cancelled = true; };
  }, [progSearch]);

  const resetProgramarForm = () => {
    setProgSearch(''); setMatch(null); setEmpresaDesc(''); setFecha(''); setHora(''); setMatCamion('');
  };

  const guardarProgramacion = async (e) => {
    e.preventDefault();
    if (!match?.matricula_contenedor) {
      alert('Selecciona un contenedor existente por matrícula (en depósito).');
      return;
    }
    // 1) insert în programados
    const insertObj = {
      matricula_contenedor: match.matricula_contenedor,
      empresa_descarga: empresaDesc || null,
      fecha: fecha || null,
      hora: hora || null,
      matricula_camion: matCamion || null,
      naviera: match.naviera || null,
      tipo: match.tipo || null,
      posicion: match.posicion || null,
      estado: match.estado || null,
    };
    const { data: ins, error: insErr } = await supabase
      .from('contenedores_programados')
      .insert(insertObj)
      .select()
      .maybeSingle();
    if (insErr) {
      console.error(insErr);
      alert('No se pudo programar el contenedor.');
      return;
    }
    // 2) șterge din contenedores
    const { error: delErr } = await supabase
      .from('contenedores')
      .delete()
      .eq('id', match.id);
    if (delErr) {
      console.error(delErr);
      alert('Se programó, pero no se pudo quitar de "contenedores".');
    }
    // 3) actualizează UI
    setItems(prev => ([
      { ...ins, programado_id: ins?.id, source: 'programados' },
      ...prev.filter(x => x.matricula_contenedor !== match.matricula_contenedor)
    ]));
    resetProgramarForm();
    setIsOpenProgramar(false);
  };

  const monthTitle = useMemo(
    () => date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase()),
    [date]
  );

  const renderCalendar = () => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const first = new Date(y, m, 1);
    const startDay = (first.getDay() + 6) % 7;
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
              className={[styles.day, c.day === date.getDate() ? styles.dayActive : ''].join(' ')}
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

      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/depot')}>
          <BackIcon /> Depot
        </button>
        <h1 className={styles.title}>Programar Contenedor</h1>
        {isManager ? (
          <button className={styles.newBtn} onClick={() => setIsOpenProgramar(true)}>Programar</button>
        ) : <span style={{ width: 110 }} />}
      </div>

      <div className={`${styles.card} ${styles.toolbar}`}>
        <div className={styles.chips}>
          {['todos','programado','pendiente','completado'].map(k => (
            <button
              key={k}
              className={`${styles.chip} ${tab === k ? styles.chipActive : ''}`}
              onClick={() => setTab(k)}
            >
              {k === 'todos' ? 'Todos' : k === 'programado' ? 'Programado' : k === 'pendiente' ? 'Pendiente' : 'Completado'}
            </button>
          ))}
        </div>
        <div className={styles.inputs}>
          <div className={styles.search}>
            <span className={styles.searchIcon}><SearchIcon/></span>
            <input placeholder="Buscar…" value={query} onChange={(e)=>setQuery(e.target.value)} />
          </div>
          {tab === 'completado' && (
            <input
              className={styles.date}
              type="date"
              value={new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,10)}
              onChange={(e)=> setDate(new Date(e.target.value))}
            />
          )}
        </div>
      </div>

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
                      {row.tipo && <span>• {row.tipo}</span>}
                      {row.posicion && <span>• {row.posicion}</span>}
                    </div>
                  </div>

                  <div className={styles.actions}>
                    {isManager && row.source === 'programados' && (
                      <>
                        <button className={styles.actionMini} onClick={()=>alert('Editar próximamente')}>Editar</button>
                        <button className={styles.actionGhost} onClick={()=>alert('Cancelar próximamente')}>Cancelar</button>
                      </>
                    )}
                    {canHecho && row.source === 'programados' && (
                      <button className={styles.actionOk} onClick={()=>handleHecho(row)}>Hecho</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ))}
        </div>

        {renderCalendar()}
      </div>

      {/* MODAL PROGRAMAR */}
      {isOpenProgramar && isManager && (
        <div className={styles.modalOverlay} onClick={()=>setIsOpenProgramar(false)}>
          <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Programar contenedor</h3>
              <button className={styles.closeIcon} onClick={()=>{ setIsOpenProgramar(false); resetProgramarForm(); }}>✕</button>
            </div>

            <form className={styles.modalBody} onSubmit={guardarProgramacion}>
              <div className={styles.inputGroup}>
                <label>Matrícula contenedor (en depósito)</label>
                <input
                  type="text"
                  value={progSearch}
                  onChange={(e)=>setProgSearch(e.target.value.toUpperCase())}
                  placeholder="Ej: TEST1234567"
                  required
                />
                {match ? (
                  <small style={{opacity:.8}}>
                    Encontrado: {match.matricula_contenedor} · {match.naviera || '—'} · {match.tipo || '—'}
                  </small>
                ) : progSearch ? (
                  <small style={{opacity:.8, color:'#fca5a5'}}>No existe en “contenedores”.</small>
                ) : null}
              </div>

              <div className={styles.inputGrid}>
                <div className={styles.inputGroup}>
                  <label>Empresa de descarga</label>
                  <input value={empresaDesc} onChange={e=>setEmpresaDesc(e.target.value)} placeholder="Empresa X" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Fecha</label>
                  <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Hora</label>
                  <input type="time" value={hora} onChange={e=>setHora(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Matrícula camión</label>
                  <input value={matCamion} onChange={e=>setMatCamion(e.target.value.toUpperCase())} placeholder="B-123-ABC" />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.actionGhost} onClick={()=>{ setIsOpenProgramar(false); resetProgramarForm(); }}>
                  Cancelar
                </button>
                <button type="submit" className={styles.actionMini}>
                  Guardar programación
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}