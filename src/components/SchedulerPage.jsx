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
  const role = String((profile?.role || ctxRole || '')).toLowerCase(); // 'dispecer' | 'admin' | 'mecanic' ...

  const [tab, setTab] = useState('todos'); // 'todos' | 'programado' | 'pendiente' | 'completado'
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [items, setItems] = useState([]);            // mix: programados + depozit
  const [doneItems, setDoneItems] = useState([]);    // salidos pentru zi
  const [loading, setLoading] = useState(true);

  // --- modal Programar ---
  const [isOpenProgramar, setIsOpenProgramar] = useState(false);
  const [depotList, setDepotList] = useState([]);    // doar contenedores pentru selecție
  const [pickQuery, setPickQuery] = useState('');
  const [picked, setPicked] = useState(null);
  const [form, setForm] = useState({
    empresa_descarga: '',
    fecha: new Date().toISOString().slice(0,10),
    hora: '',
    matricula_camion: ''
  });

  // ====== LOAD LISTE ======
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // programados
        const { data: prog, error: e1 } = await supabase
          .from('contenedores_programados')
          .select('*')
          .order('created_at', { ascending: false });
        if (e1) throw e1;
        const mappedProg = (prog || []).map(r => ({ ...r, programado_id: r.id, source: 'programados' }));

        // depozit (contenedores)
        const { data: depo, error: e2 } = await supabase
          .from('contenedores')
          .select('*')
          .order('created_at', { ascending: false });
        if (e2) throw e2;
        const mappedDepot = (depo || []).map(r => ({ ...r, programado_id: null, source: 'contenedores' }));

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

  // completados pe zi
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

  // ====== FILTER ======
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

  // ====== HECHO (numai pentru PROGRAMADOS) ======
  const handleHecho = async (row) => {
    if (!(role === 'mecanic' || role === 'dispecer' || role === 'admin')) return;
    if (row.source !== 'programados') return; // protecție: nu permitem Hecho pe depozit

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

    // Scoatem din UI programatul finalizat
    setItems(prev => prev.filter(x =>
      !(x.source === 'programados' && (x.programado_id === row.programado_id || x.id === row.id))
    ));
  };

  // ====== PROGRAMAR (select din contenedores) ======
  const openProgramar = async () => {
    setPickQuery('');
    setPicked(null);
    setForm({
      empresa_descarga: '',
      fecha: new Date().toISOString().slice(0,10),
      hora: '',
      matricula_camion: ''
    });

    // încarcă DOAR contenedores (depozit)
    const { data, error } = await supabase
      .from('contenedores')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      alert('No se pudieron cargar los contenedores del depósito.');
      return;
    }
    setDepotList(data || []);
    setIsOpenProgramar(true);
  };

  const saveProgramacion = async () => {
    if (!picked) { alert('Selecciona un contenedor por matrícula.'); return; }

    // 1) insert în contenedores_programados
    const toInsert = {
      matricula_contenedor: picked.matricula_contenedor,
      naviera: picked.naviera || null,
      tipo: picked.tipo || null,
      posicion: picked.posicion || null,
      empresa_descarga: form.empresa_descarga || null,
      fecha: form.fecha || null,
      hora: form.hora || null,
      matricula_camion: form.matricula_camion || null,
      estado: 'programado'
    };
    const { data: inserted, error: insErr } = await supabase
      .from('contenedores_programados')
      .insert([toInsert])
      .select()
      .single();

    if (insErr) {
      console.error(insErr);
      alert('No se pudo programar el contenedor.');
      return;
    }

    // 2) șterge din contenedores
    const { error: delErr } = await supabase
      .from('contenedores')
      .delete()
      .eq('id', picked.id);

    if (delErr) {
      console.error(delErr);
      alert('Programado, pero no se pudo eliminar del depósito.');
      // Continuăm totuși, pentru a nu bloca fluxul.
    }

    // 3) actualizează UI: scoate din listă depozit & adaugă la programados
    setItems(prev => ([
      // elimin depozitul respectiv
      ...prev.filter(x => !(x.source === 'contenedores' && x.id === picked.id)),
      // adaug proaspătul programado
      { ...inserted, programado_id: inserted.id, source: 'programados' }
    ]));

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

  // ====== UI ======
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

        {(role === 'dispecer' || role === 'admin') ? (
          <button className={styles.newBtn} onClick={openProgramar}>Programar</button>
        ) : (
          <span style={{ width: 112 }} />
        )}
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
                </li>
              ))}
            </ul>
          ) : (
            <ul className={styles.list}>
              {filtered.length === 0 && <p>No hay contenedores {tab === 'programado' ? 'programados' : 'en depósito'}.</p>}
              {filtered.map(row => (
                <li
                  key={(row.source==='programados'? row.programado_id : row.id) || row.matricula_contenedor}
                  className={styles.item}
                >
                  <div>
                    <div className={styles.itemTop}>
                      <span className={styles.dot} />
                      <span className={styles.cid}>{row.matricula_contenedor}</span>
                      {row.source === 'programados'
                        ? <span className={`${styles.badge} ${styles.badgeInfo}`}>Programado</span>
                        : <span className={`${styles.badge} ${styles.badgeWarn}`}>En depósito</span>
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
                    {/* DOAR pentru programados */}
                    {(role === 'dispecer' || role === 'admin') && row.source === 'programados' && (
                      <>
                        <button className={styles.actionMini} onClick={()=>alert('Editar próximamente')}>
                          Editar
                        </button>
                        <button className={styles.actionGhost} onClick={()=>alert('Cancelar próximamente')}>
                          Cancelar
                        </button>
                      </>
                    )}
                    {(role === 'mecanic' || role === 'dispecer' || role === 'admin') && row.source === 'programados' && (
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

        {renderCalendar()}
      </div>

      {/* MODAL Programar */}
      {isOpenProgramar && (role === 'dispecer' || role === 'admin') && (
        <div className={styles.modalOverlay} onClick={()=>setIsOpenProgramar(false)}>
          <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Programar contenedor</h3>
              <button className={styles.closeIcon} onClick={()=>setIsOpenProgramar(false)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {/* selector din contenedores */}
              <div className={styles.inputGroup}>
                <label>Buscar por matrícula</label>
                <input
                  type="text"
                  placeholder="Ej. MSKU1234567"
                  value={pickQuery}
                  onChange={(e)=>setPickQuery(e.target.value.toUpperCase())}
                />
              </div>

              <div style={{maxHeight: 220, overflowY: 'auto', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: 8}}>
                {depotList
                  .filter(c => (c.matricula_contenedor || '').toUpperCase().includes(pickQuery))
                  .map(c => (
                    <label key={c.id} style={{display:'flex', alignItems:'center', gap:10, padding:'6px 8px', cursor:'pointer'}}>
                      <input
                        type="radio"
                        name="pick"
                        checked={picked?.id === c.id}
                        onChange={()=>setPicked(c)}
                      />
                      <span style={{fontWeight:700}}>{c.matricula_contenedor}</span>
                      <span style={{opacity:.8}}>{c.naviera || '—'} • {c.tipo || '—'} {c.posicion ? `• ${c.posicion}` : ''}</span>
                    </label>
                  ))
                }
                {depotList.length === 0 && <p style={{opacity:.7, margin:8}}>No hay contenedores en depósito.</p>}
              </div>

              {/* detalii programare */}
              <div className={styles.inputGrid} style={{marginTop:12}}>
                <div className={styles.inputGroup}>
                  <label>Empresa de descarga</label>
                  <input value={form.empresa_descarga} onChange={e=>setForm(f=>({...f, empresa_descarga: e.target.value}))} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Fecha</label>
                  <input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f, fecha: e.target.value}))} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Hora</label>
                  <input type="time" value={form.hora} onChange={e=>setForm(f=>({...f, hora: e.target.value}))} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Matrícula camión (opcional)</label>
                  <input value={form.matricula_camion} onChange={e=>setForm(f=>({...f, matricula_camion: e.target.value.toUpperCase()}))} />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.actionGhost} onClick={()=>setIsOpenProgramar(false)}>Cancelar</button>
              <button className={styles.actionMini} onClick={saveProgramacion}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}