// src/components/ChoferFinderProfile.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './ChofereFinderProfile.module.css'; // ← păstrat exact cum ai tu

/* Icons mini */
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 3a2.828 2.828 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
  </svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default function ChoferFinderProfile() {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hi, setHi] = useState(-1);
  const [open, setOpen] = useState(false);

  const [driverId, setDriverId] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editable, setEditable] = useState(null);
  const [camioaneOpts, setCamioaneOpts] = useState([]);
  const [remorciOpts, setRemorciOpts] = useState([]);

  // Vacaciones admin state
  const [saldo, setSaldo] = useState(null); // { carry_prev_total, carry_prev_remaining, current_total, current_remaining }
  const [solicitudes, setSolicitudes] = useState([]);

  /* ---------- Search debounce ---------- */
  useEffect(() => {
    let cancel = false;
    const t = setTimeout(async () => {
      const term = q.trim();
      if (!term) {
        setRows([]); setHi(-1); setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nombre_completo, camioane:camion_id(matricula), remorci:remorca_id(matricula)')
          .eq('role', 'sofer')
          .ilike('nombre_completo', `%${term}%`)
          .order('nombre_completo', { ascending: true })
          .limit(10);
        if (error) throw error;
        if (!cancel) {
          setRows(data || []);
          setOpen(true);
          setHi(data && data.length ? 0 : -1);
        }
      } catch (e) {
        if (!cancel) { setRows([]); setOpen(true); setHi(-1); }
        console.warn('Search error:', e.message);
      } finally {
        if (!cancel) setLoading(false);
      }
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [q]);

  const selectDriver = (id) => {
    setDriverId(id);
    setOpen(false);
  };

  /* ---------- Load full profile when driverId changes ---------- */
  useEffect(() => {
    if (!driverId) { setPerfil(null); setSaldo(null); setSolicitudes([]); return; }

    (async () => {
      // full profile (with vehicle joins)
      const { data: p } = await supabase
        .from('profiles')
        .select('*, camioane:camion_id(*), remorci:remorca_id(*)')
        .eq('id', driverId)
        .maybeSingle();
      setPerfil(p || null);

      // options for edit selects
      const [{ data: camOpt }, { data: remOpt }] = await Promise.all([
        supabase.from('camioane').select('id, matricula').order('matricula'),
        supabase.from('remorci').select('id, matricula').order('matricula')
      ]);
      setCamioaneOpts(camOpt || []);
      setRemorciOpts(remOpt || []);

      // vacaciones: saldo + solicitudes
      const { data: s } = await supabase
        .from('vacaciones_saldos')
        .select('*')
        .eq('user_id', driverId)
        .maybeSingle();
      setSaldo(s || { carry_prev_total:0, carry_prev_remaining:0, current_total:23, current_remaining:23 });

      const { data: sols } = await supabase
        .from('vacaciones_solicitudes')
        .select('*')
        .eq('user_id', driverId)
        .order('created_at', { ascending: false });
      setSolicitudes(sols || []);
    })();
  }, [driverId]);

  /* ---------- Keyboard on dropdown ---------- */
  const onKeyDown = (e) => {
    if (!open || !rows.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((p) => Math.min(p + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((p) => Math.max(p - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (hi >= 0) selectDriver(rows[hi].id); }
    else if (e.key === 'Escape') { setOpen(false); }
  };
  const blurTimer = useRef(null);
  const handleBlur = () => { blurTimer.current = setTimeout(() => setOpen(false), 120); };
  const handleFocus = () => { if (blurTimer.current) clearTimeout(blurTimer.current); if (rows.length) setOpen(true); };

  /* ---------- Edit profile ---------- */
  const openEdit = () => {
    if (!perfil) return;
    setEditable({
      ...perfil,
      camion_id: perfil.camion_id || '',
      remorca_id: perfil.remorca_id || ''
    });
    setEditOpen(true);
  };
  const saveProfile = async (e) => {
    e.preventDefault();
    const { id, camioane, remorci, role, ...payload } = editable;
    const { error } = await supabase
      .from('profiles')
      .update({
        ...payload,
        camion_id: payload.camion_id === '' ? null : payload.camion_id,
        remorca_id: payload.remorca_id === '' ? null : payload.remorca_id,
      })
      .eq('id', id);
    if (!error) {
      setEditOpen(false);
      // refresh
      selectDriver(id);
      alert('Perfil actualizado.');
    } else {
      alert(error.message);
    }
  };

  /* ---------- Vacaciones Admin actions ---------- */
  const saveSaldo = async () => {
    if (!driverId || !saldo) return;
    const row = { user_id: driverId, ...saldo };
    const { error } = await supabase
      .from('vacaciones_saldos')
      .upsert(row, { onConflict: 'user_id' });
    if (!error) alert('Saldo guardado.');
  };

  const setSolicitudStatus = async (solId, status, dias) => {
    const { error } = await supabase
      .from('vacaciones_solicitudes')
      .update({ estado: status })
      .eq('id', solId);
    if (error) { alert(error.message); return; }

    // If approved -> decrement remaining (prioritize carryover)
    if (status === 'aprobada') {
      setSaldo(s => {
        if (!s) return s;
        let { carry_prev_remaining, current_remaining } = s;
        let rest = dias || 0;
        const usePrev = Math.min(carry_prev_remaining || 0, rest);
        carry_prev_remaining = (carry_prev_remaining || 0) - usePrev;
        rest -= usePrev;
        if (rest > 0) current_remaining = (current_remaining || 0) - rest;
        return { ...s, carry_prev_remaining, current_remaining };
      });
    }
    // refresh list
    const { data: sols } = await supabase
      .from('vacaciones_solicitudes')
      .select('*')
      .eq('user_id', driverId)
      .order('created_at', { ascending: false });
    setSolicitudes(sols || []);
  };

  const monthLabel = (iso) => new Date(iso).toLocaleDateString('es-ES',{day:'2-digit', month:'short', year:'numeric'});

  /* ---------- UI ---------- */
  return (
    <Layout>
      <div className={styles.page}>
        {/* Header + action */}
        <header className={styles.header}>
          <h1><UsersIcon /> Buscar chófer</h1>
        </header>

        {/* Search */}
        <div className={styles.searchWrap}>
          <div className={styles.searchBox}>
            <span className={styles.icon}><SearchIcon/></span>
            <input
              ref={inputRef}
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={handleBlur}
              onFocus={handleFocus}
              placeholder="Escribe el nombre del chófer…"
              autoFocus
            />
            {loading && <span className={styles.spinner}/>}
          </div>

          {open && (
            <div className={styles.dropdown} onMouseDown={(e)=>e.preventDefault()}>
              {rows.length === 0 ? (
                <div className={styles.empty}>No hay resultados</div>
              ) : rows.map((r, idx) => (
                <button
                  key={r.id}
                  className={`${styles.item} ${idx===hi ? styles.active : ''}`}
                  onClick={() => selectDriver(r.id)}
                  onMouseEnter={() => setHi(idx)}
                >
                  <div className={styles.itemTitle}>{r.nombre_completo}</div>
                  <div className={styles.meta}>
                    <span>Camión: <b>{r.camioane?.matricula || '—'}</b></span>
                    <span>Remolque: <b>{r.remorci?.matricula || '—'}</b></span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* === PROFILE PANE (appears below) === */}
        {perfil && (
          <div className={styles.detailGrid}>
            {/* Conductor */}
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <h3>Conductor</h3>
                <button className={styles.btnGhost} onClick={openEdit}><EditIcon/> Editar</button>
              </div>
              <div className={styles.rows2}>
                <div><span className={styles.k}>Nombre completo</span><span className={styles.v}>{perfil.nombre_completo || '—'}</span></div>
                <div><span className={styles.k}>CAP</span><span className={styles.v}>{perfil.cap_expirare || '—'}</span></div>
                <div><span className={styles.k}>Carnet conducir</span><span className={styles.v}>{perfil.carnet_caducidad || '—'}</span></div>
                <div><span className={styles.k}>ADR</span><span className={styles.v}>{perfil.tiene_adr ? (perfil.adr_caducidad || 'Sí') : 'No'}</span></div>
              </div>
              <div className={styles.rowBtns}>
                <button className={styles.btnPrimary} onClick={()=>navigate('/calculadora-nomina')}>Abrir calculadora nómina</button>
              </div>
            </section>

            {/* Camión */}
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <h3>Camión</h3>
                {perfil.camion_id && <button className={styles.btnGhost} onClick={()=>navigate(`/camion/${perfil.camion_id}`)}>Ver ficha</button>}
              </div>
              <div className={styles.rows2}>
                <div><span className={styles.k}>Matrícula</span><span className={styles.v}>{perfil.camioane?.matricula || 'No asignado'}</span></div>
                <div><span className={styles.k}>ITV</span><span className={styles.v}>{perfil.camioane?.fecha_itv || '—'}</span></div>
              </div>
            </section>

            {/* Remolque */}
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <h3>Remolque</h3>
                {perfil.remorca_id && <button className={styles.btnGhost} onClick={()=>navigate(`/remorca/${perfil.remorca_id}`)}>Ver ficha</button>}
              </div>
              <div className={styles.rows2}>
                <div><span className={styles.k}>Matrícula</span><span className={styles.v}>{perfil.remorci?.matricula || 'No asignado'}</span></div>
                <div><span className={styles.k}>ITV</span><span className={styles.v}>{perfil.remorci?.fecha_itv || '—'}</span></div>
              </div>
            </section>

            {/* Vacaciones (admin) */}
            <section className={styles.cardWide}>
              <div className={styles.cardHead}>
                <h3>Vacaciones — Admin</h3>
                <button className={styles.btnGhost} onClick={()=>navigate(`/vacaciones-admin/${perfil.id}`)}>Abrir página completa</button>
              </div>

              {/* Saldos */}
              <div className={styles.saldoGrid}>
                <div className={styles.saldoBox}>
                  <div className={styles.saldoTitle}>Año anterior</div>
                  <label>Total</label>
                  <input type="number" value={saldo?.carry_prev_total ?? 0}
                         onChange={(e)=>setSaldo(s=>({...(s||{}), carry_prev_total:Number(e.target.value||0)}))}/>
                  <label>Restantes</label>
                  <input type="number" value={saldo?.carry_prev_remaining ?? 0}
                         onChange={(e)=>setSaldo(s=>({...(s||{}), carry_prev_remaining:Number(e.target.value||0)}))}/>
                </div>
                <div className={styles.saldoBox}>
                  <div className={styles.saldoTitle}>Año actual</div>
                  <label>Total</label>
                  <input type="number" value={saldo?.current_total ?? 23}
                         onChange={(e)=>setSaldo(s=>({...(s||{}), current_total:Number(e.target.value||0)}))}/>
                  <label>Restantes</label>
                  <input type="number" value={saldo?.current_remaining ?? 23}
                         onChange={(e)=>setSaldo(s=>({...(s||{}), current_remaining:Number(e.target.value||0)}))}/>
                </div>
              </div>
              <div className={styles.rowBtns}>
                <button className={styles.btnPrimary} onClick={saveSaldo}>Guardar saldo</button>
                <button className={styles.btnGhost} onClick={()=>navigate(`/vacaciones/${perfil.id}`)}>Abrir vista del chófer</button>
              </div>

              {/* Solicitudes */}
              <div className={styles.solicitudes}>
                <h4>Solicitudes</h4>
                {(!solicitudes || !solicitudes.length) ? (
                  <p className={styles.muted}>No hay solicitudes aún.</p>
                ) : (
                  <div className={styles.table}>
                    <div className={styles.thead}>
                      <div>Inicio</div><div>Fin</div><div>Días</div><div>Estado</div><div>Acciones</div>
                    </div>
                    {solicitudes.map(s => (
                      <div key={s.id} className={styles.trow}>
                        <div>{monthLabel(s.fecha_inicio)}</div>
                        <div>{monthLabel(s.fecha_fin)}</div>
                        <div>{s.dias}</div>
                        <div className={styles.badge + ' ' + styles['st_'+s.estado]}>{s.estado}</div>
                        <div className={styles.actions}>
                          {s.estado === 'pendiente' ? (
                            <>
                              <button className={styles.btnMini} onClick={()=>setSolicitudStatus(s.id, 'aprobada', s.dias)}>Aprobar</button>
                              <button className={styles.btnMiniOutline} onClick={()=>setSolicitudStatus(s.id, 'rechazada', 0)}>Rechazar</button>
                            </>
                          ) : <span className={styles.muted}>—</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* Hint */}
        {!perfil && (
          <p className={styles.hint}>
            Escribe y selecciona un chófer. El perfil completo se mostrará aquí abajo (sin cambiar de ruta).
          </p>
        )}
      </div>

      {/* Modal Editar */}
      {editOpen && editable && (
        <div className={styles.modalOverlay} onClick={()=>setEditOpen(false)}>
          <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Editar perfil</h3>
              <button className={styles.iconBtn} onClick={()=>setEditOpen(false)}><CloseIcon/></button>
            </div>

            <form className={styles.modalBody} onSubmit={saveProfile}>
              <div className={styles.grid2}>
                <div className={styles.inputGroup}>
                  <label>Nombre Completo</label>
                  <input type="text" value={editable.nombre_completo || ''}
                         onChange={(e)=>setEditable(p=>({...p, nombre_completo:e.target.value}))}/>
                </div>
                <div className={styles.inputGroup}>
                  <label>¿Tiene ADR?</label>
                  <select value={String(!!editable.tiene_adr)} onChange={(e)=>setEditable(p=>({...p, tiene_adr: e.target.value==='true'}))}>
                    <option value="false">No</option><option value="true">Sí</option>
                  </select>
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.inputGroup}>
                  <label>Caducidad CAP</label>
                  <input type="date" value={editable.cap_expirare || ''} onChange={(e)=>setEditable(p=>({...p, cap_expirare:e.target.value}))}/>
                </div>
                <div className={styles.inputGroup}>
                  <label>Caducidad Carnet</label>
                  <input type="date" value={editable.carnet_caducidad || ''} onChange={(e)=>setEditable(p=>({...p, carnet_caducidad:e.target.value}))}/>
                </div>
              </div>

              {editable.tiene_adr && (
                <div className={styles.inputGroup}>
                  <label>Caducidad ADR</label>
                  <input type="date" value={editable.adr_caducidad || ''} onChange={(e)=>setEditable(p=>({...p, adr_caducidad:e.target.value}))}/>
                </div>
              )}

              <div className={styles.grid2}>
                <div className={styles.inputGroup}>
                  <label>Camión asignado</label>
                  <select value={editable.camion_id || ''} onChange={(e)=>setEditable(p=>({...p, camion_id:e.target.value}))}>
                    <option value="">Ninguno</option>
                    {camioaneOpts.map(c => <option key={c.id} value={c.id}>{c.matricula}</option>)}
                  </select>
                </div>
                <div className={styles.inputGroup}>
                  <label>Remolque asignado</label>
                  <select value={editable.remorca_id || ''} onChange={(e)=>setEditable(p=>({...p, remorca_id:e.target.value}))}>
                    <option value="">Ninguno</option>
                    {remorciOpts.map(r => <option key={r.id} value={r.id}>{r.matricula}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnGhost} onClick={()=>setEditOpen(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary}>Guardar cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}