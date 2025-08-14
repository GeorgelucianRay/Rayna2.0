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

  // roluri din context
  const { role: ctxRole, profile } = useAuth() || {};
  const role = String((profile?.role || ctxRole || '')).toLowerCase();
  const isManager = role === 'dispecer' || role === 'admin';
  const canHecho = isManager || role === 'mecanic';

  // stare UI
  const [tab, setTab] = useState('todos'); // todos | programado | pendiente | completado
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(() => new Date());

  // liste
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);        // programados + contenedores (cu kind)
  const [doneList, setDoneList] = useState([]);// contenedores_salidos (pe zi)

  // ====== FETCH (programados + contenedores) ======
  useEffect(() => {
    let dead = false;
    const load = async () => {
      if (tab === 'completado') return;
      setLoading(true);
      try {
        const [{ data: prog, error: e1 }, { data: depo, error: e2 }] = await Promise.all([
          supabase.from('contenedores_programados').select('*').order('created_at', { ascending: false }),
          supabase.from('contenedores').select('*').order('created_at', { ascending: false })
        ]);
        if (e1) throw e1;
        if (e2) throw e2;

        const mapped = [
          ...(prog || []).map(r => ({ ...r, programado_id: r.id, kind: 'programado' })),
          ...(depo || []).map(r => ({ ...r, programado_id: null, kind: 'depot' })),
        ];
        if (!dead) setList(mapped);
      } catch (err) {
        console.error('Error loading lists:', err);
      } finally {
        if (!dead) setLoading(false);
      }
    };
    load();
    return () => { dead = true; };
  }, [tab]);

  // ====== FETCH (completado pe zi) ======
  useEffect(() => {
    let dead = false;
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
        if (!dead) setDoneList(data || []);
      } catch (err) {
        console.error('Error loading completed:', err);
      } finally {
        if (!dead) setLoading(false);
      }
    };
    loadDone();
    return () => { dead = true; };
  }, [tab, date]);

  // ====== FILTRARE LISTE ======
  const filtered = useMemo(() => {
    if (tab === 'completado') return doneList;
    let data = list;
    if (tab === 'programado') data = data.filter(r => r.kind === 'programado');
    if (tab === 'pendiente')  data = data.filter(r =>
      r.kind === 'programado' &&
      (r.estado === 'pendiente' || r.status === 'pendiente' || r.etapa === 'pendiente')
    );
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      data = data.filter(r =>
        (r.matricula_contenedor || '').toLowerCase().includes(q) ||
        (r.naviera || '').toLowerCase().includes(q) ||
        (r.empresa_descarga || '').toLowerCase().includes(q)
      );
    }
    return data;
  }, [tab, list, doneList, query]);

  // ====== HECHO – NUMAI pentru programado ======
  const handleHecho = async (row) => {
    if (!canHecho) return;
    if (row.kind !== 'programado') {
      alert('„Hecho” este disponibil doar pentru contenedores programados.');
      return;
    }
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
    // scoatem din listă elementul finalizat
    setList(prev => prev.filter(x => x.matricula_contenedor !== row.matricula_contenedor));
  };

  // ====== MODAL PROGRAMAR ======
  const [openProg, setOpenProg] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);        // sugestii din contenedores
  const [selected, setSelected] = useState(null);    // container ales (obligatoriu)
  const [empresaDesc, setEmpresaDesc] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [matCamion, setMatCamion] = useState('');

  const resetProgramar = () => {
    setSearch('');
    setOptions([]);
    setSelected(null);
    setEmpresaDesc('');
    setFecha('');
    setHora('');
    setMatCamion('');
  };

  // căutare live în „contenedores” (min 2 caractere, max 10 rezultate)
  useEffect(() => {
    let dead = false;
    const run = async () => {
      const s = search.trim().toUpperCase();
      if (s.length < 2) { if (!dead) setOptions([]); return; }
      const { data, error } = await supabase
        .from('contenedores')
        .select('id, matricula_contenedor, naviera, tipo, posicion, estado, created_at')
        .ilike('matricula_contenedor', `%${s}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!dead) {
        if (error) { console.error(error); setOptions([]); }
        else setOptions(data || []);
      }
    };
    run();
    return () => { dead = true; };
  }, [search]);

  const guardarProgramacion = async (e) => {
    e.preventDefault();
    if (!selected) {
      alert('Selectează un container din listă (depozit).');
      return;
    }
    // 1) insert în programados
    const insertObj = {
      matricula_contenedor: selected.matricula_contenedor,
      empresa_descarga: empresaDesc || null,
      fecha: fecha || null,
      hora: hora || null,
      matricula_camion: matCamion || null,
      naviera: selected.naviera || null,
      tipo: selected.tipo || null,
      posicion: selected.posicion || null,
      estado: selected.estado || null,
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
    const { error: delErr } = await supabase.from('contenedores').delete().eq('id', selected.id);
    if (delErr) {
      console.error(delErr);
      alert('Se programó, pero no se pudo quitar de "contenedores".');
    }
    // 3) actualizează lista locală
    setList(prev => ([
      { ...ins, programado_id: ins?.id, kind: 'programado' },
      ...prev.filter(x => x.matricula_contenedor !== selected.matricula_contenedor)
    ]));
    setOpenProg(false);
    resetProgramar();
  };

  // ====== CALENDAR LATERAL ======
  const monthTitle = useMemo(
    () => date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase()),
    [date]
  );
  const renderCalendar = () => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const first = new Date(y, m, 1);
    const startDay = (first.getDay() + 6) % 7; // L=0..D=6
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

      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/depot')}>
          <BackIcon /> Depot
        </button>
        <h1 className={styles.title}>Programar Contenedor</h1>
        {isManager ? (
          <button className={styles.newBtn} onClick={() => setOpenProg(true)}>Programar</button>
        ) : <span style={{ width: 120 }} />}
      </div>

      {/* Toolbar */}
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
              value={new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString().slice(0,10)}
              onChange={(e)=> setDate(new Date(e.target.value))}
            />
          )}
        </div>
      </div>

      {/* Listă + Calendar */}
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
              {filtered.length === 0 && <p>No hay contenedores.</p>}
              {filtered.map(row => (
                <li key={(row.kind==='programado'? row.programado_id : row.id) || row.matricula_contenedor} className={styles.item}>
                  <div>
                    <div className={styles.itemTop}>
                      <span className={styles.dot} />
                      <span className={styles.cid}>{row.matricula_contenedor}</span>
                      {row.kind === 'programado'
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
                    {/* Edit/Cancel doar pentru programado + manager */}
                    {isManager && row.kind === 'programado' && (
                      <>
                        <button className={styles.actionMini} onClick={()=>alert('Editar próximamente')}>Editar</button>
                        <button className={styles.actionGhost} onClick={()=>alert('Cancelar próximamente')}>Cancelar</button>
                      </>
                    )}
                    {/* Hecho doar pentru programado */}
                    {canHecho && row.kind === 'programado' && (
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

      {/* MODAL PROGRAMAR (manager only) */}
      {openProg && isManager && (
        <div className={styles.modalOverlay} onClick={()=>{ setOpenProg(false); resetProgramar(); }}>
          <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Programar contenedor</h3>
              <button className={styles.closeIcon} onClick={()=>{ setOpenProg(false); resetProgramar(); }}>✕</button>
            </div>

            <form className={styles.modalBody} onSubmit={guardarProgramacion}>
              {/* Căutare + rezultate */}
              <div className={styles.inputGroup}>
                <label>Matrícula (selectează din depozit)</label>
                <input
                  type="text"
                  placeholder="Ej: TEST1234567"
                  value={search}
                  onChange={(e)=>{ setSearch(e.target.value.toUpperCase()); setSelected(null); }}
                />
                {options.length > 0 && (
                  <div style={{marginTop:8, border:'1px solid rgba(255,255,255,.15)', borderRadius:10, overflow:'hidden'}}>
                    {options.map(opt => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={()=> setSelected(opt)}
                        style={{
                          width:'100%', textAlign:'left', padding:'10px 12px',
                          background: selected?.id===opt.id ? 'rgba(59,130,246,.25)' : 'rgba(255,255,255,.05)',
                          color:'#fff', border:'none', cursor:'pointer'
                        }}
                      >
                        <strong>{opt.matricula_contenedor}</strong> &nbsp;·&nbsp;
                        <span style={{opacity:.85}}>{opt.naviera || '—'}</span> &nbsp;·&nbsp;
                        <span style={{opacity:.65}}>{opt.tipo || '—'}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selected && (
                  <small style={{display:'block', marginTop:6, opacity:.9}}>
                    Selectat: <strong>{selected.matricula_contenedor}</strong> ({selected.naviera || '—'}, {selected.tipo || '—'})
                  </small>
                )}
              </div>

              <div className={styles.inputGrid}>
                <div className={styles.inputGroup}>
                  <label>Empresa de descarga</label>
                  <input value={empresaDesc} onChange={(e)=>setEmpresaDesc(e.target.value)} placeholder="Empresa X" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Fecha</label>
                  <input type="date" value={fecha} onChange={(e)=>setFecha(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Hora</label>
                  <input type="time" value={hora} onChange={(e)=>setHora(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Matrícula camión</label>
                  <input value={matCamion} onChange={(e)=>setMatCamion(e.target.value.toUpperCase())} placeholder="B-123-ABC" />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.actionGhost} onClick={()=>{ setOpenProg(false); resetProgramar(); }}>
                  Cancelar
                </button>
                <button type="submit" className={styles.actionMini} disabled={!selected}>
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