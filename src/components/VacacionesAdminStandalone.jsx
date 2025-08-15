// src/components/VacacionesAdminStandalone.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import styles from './VacacionesAdmin.module.css';

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

export default function VacacionesAdminStandalone() {
  const { id } = useParams();              // user_id del chófer
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [chofer, setChofer] = useState(null);

  const [params, setParams] = useState({ dias_base: 23, dias_personales: 2, dias_pueblo: 0 });
  const [saldo, setSaldo] = useState({
    total_asignado: 23,
    carryover_prev: 0,
    usadas_prev: 0,
    usadas_actual: 0,
    pendientes_prev: 0,
    pendientes_actual: 0
  });
  const [extra, setExtra] = useState(0);   // dias_extra per user/an
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);

  const aniosList = useMemo(() => {
    const y = new Date().getFullYear();
    return [y-1, y, y+1];
  }, []);

  const canEdit = profile?.role === 'dispecer' || profile?.role === 'admin';

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true);
      try {
        // profilul șoferului
        const { data: p } = await supabase
          .from('profiles')
          .select('id, nombre_completo')
          .eq('id', id)
          .maybeSingle();
        if (!cancel) setChofer(p);

        // parametrii anului
        const { data: cfg, error: e1 } = await supabase
          .from('vacaciones_parametros_anio')
          .select('*')
          .eq('anio', anio)
          .maybeSingle();
        if (e1 && e1.code === '42P01') { setDbReady(false); setLoading(false); return; }
        if (!cancel) setParams({
          dias_base: cfg?.dias_base ?? 23,
          dias_personales: cfg?.dias_personales ?? 2,
          dias_pueblo: cfg?.dias_pueblo ?? 0
        });

        // extra user/an
        const { data: ex } = await supabase
          .from('vacaciones_asignaciones_extra')
          .select('dias_extra')
          .eq('user_id', id)
          .eq('anio', anio)
          .maybeSingle();
        if (!cancel) setExtra(ex?.dias_extra ?? 0);

        // solduri split
        const { data: s } = await supabase
          .from('vacaciones_saldos')
          .select('*')
          .eq('user_id', id)
          .eq('anio', anio)
          .maybeSingle();
        if (!cancel && s) {
          setSaldo({
            total_asignado: s.total_asignado ?? 23,
            carryover_prev: s.carryover_prev ?? 0,
            usadas_prev: s.usadas_prev ?? 0,
            usadas_actual: s.usadas_actual ?? 0,
            pendientes_prev: s.pendientes_prev ?? 0,
            pendientes_actual: s.pendientes_actual ?? 0
          });
        } else if (!cancel) {
          // fallback: total_asignado din parametri + extra
          const total = (cfg?.dias_base ?? 23) + (cfg?.dias_personales ?? 2) + (cfg?.dias_pueblo ?? 0) + (ex?.dias_extra ?? 0);
          setSaldo(s => ({ ...s, total_asignado: total }));
        }

        // evenimentele anului
        const { data: ev } = await supabase
          .from('vacaciones_eventos')
          .select('*')
          .eq('user_id', id)
          .gte('start_date', `${anio}-01-01`)
          .lte('end_date', `${anio}-12-31`)
          .order('start_date', { ascending: true });
        if (!cancel) setEventos(ev || []);
      } catch (err) {
        console.warn('[VacacionesAdmin] load:', err.message);
        if (!cancel) setDbReady(false);
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    load();
    return () => { cancel = true; };
  }, [id, anio]);

  // Derivate
  const prev_left = Math.max((saldo.carryover_prev || 0) - (saldo.usadas_prev || 0) - (saldo.pendientes_prev || 0), 0);
  const actual_left = Math.max((saldo.total_asignado || 0) - (saldo.usadas_actual || 0) - (saldo.pendientes_actual || 0), 0);
  const total_left = prev_left + actual_left;

  // Actions
  const saveParams = async () => {
    if (!canEdit) return;
    const payload = { anio, ...params };
    const { error } = await supabase.from('vacaciones_parametros_anio').upsert(payload, { onConflict: 'anio' });
    if (error) return alert('No se pudo guardar parámetros.');
    alert('Parámetros guardados.');
    // recalc pentru user curent
    await supabase.rpc('recalc_vacaciones_saldo', { p_user: id, p_anio: anio }).catch(()=>{});
  };

  const saveExtra = async () => {
    if (!canEdit) return;
    const payload = { user_id: id, anio, dias_extra: Number(extra)||0 };
    const { error } = await supabase
      .from('vacaciones_asignaciones_extra').upsert(payload, { onConflict: 'user_id,anio' });
    if (error) return alert('No se pudo guardar días extra.');
    alert('Días extra guardados.');
    await supabase.rpc('recalc_vacaciones_saldo', { p_user: id, p_anio: anio }).catch(()=>{});
    // re-trigger local
    setAnio(a => a);
  };

  const addEmpresa = async () => {
    if (!canEdit) return;
    // demo: azi-azi (1 día), tipo aprobada
    const today = new Date().toISOString().slice(0,10);
    const payload = {
      user_id: id,
      tipo: 'aprobada',
      start_date: today,
      end_date: today,
      dias: 1,
      notas: 'Vacaciones de empresa (demo)',
      created_by: profile?.id || null
    };
    const { error } = await supabase.from('vacaciones_eventos').insert(payload);
    if (error) return alert('No se pudo crear evento.');
    await supabase.rpc('recalc_vacaciones_saldo', { p_user: id, p_anio: anio }).catch(()=>{});
    setAnio(a => a);
  };

  return (
    <Layout backgroundClassName="miPerfil-background">
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={()=>navigate('/choferes')}>
          <BackIcon/> Volver
        </button>
        <h1>Vacaciones — {chofer?.nombre_completo || 'Chófer'}</h1>
        <div />
      </div>

      {!dbReady && (
        <div className={styles.card}>
          <p style={{margin:0}}>
            Las tablas de vacaciones aún no existen. Crea schema-ul și vuelve.
          </p>
        </div>
      )}

      {dbReady && (
        <>
          <div className={styles.card}>
            <div className={styles.row}>
              <label>Año</label>
              <select value={anio} onChange={(e)=>setAnio(parseInt(e.target.value))}>
                {aniosList.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className={styles.grid3}>
              <div className={styles.inputGroup}>
                <label>Días base</label>
                <input type="number" value={params.dias_base}
                       onChange={(e)=>setParams(p=>({...p, dias_base:+e.target.value}))}/>
              </div>
              <div className={styles.inputGroup}>
                <label>Personales</label>
                <input type="number" value={params.dias_personales}
                       onChange={(e)=>setParams(p=>({...p, dias_personales:+e.target.value}))}/>
              </div>
              <div className={styles.inputGroup}>
                <label>Fiesta de pueblo</label>
                <input type="number" value={params.dias_pueblo}
                       onChange={(e)=>setParams(p=>({...p, dias_pueblo:+e.target.value}))}/>
              </div>
            </div>

            {canEdit && <button className={styles.primary} onClick={saveParams}>Guardar parámetros</button>}
          </div>

          <div className={styles.gridTop}>
            <div className={styles.card}>
              <h3 style={{marginTop:0}}>Saldo</h3>

              {/* Dacă mai ai din anul trecut */}
              {prev_left > 0 && (
                <div className={styles.saldoRow}>
                  <div><b>Del año pasado:</b> {prev_left}</div>
                  <div className={styles.metaLine}>
                    Usadas prev: {saldo.usadas_prev} • Pendientes prev: {saldo.pendientes_prev}
                  </div>
                </div>
              )}

              <div className={styles.saldoRow}>
                <div><b>Año actual:</b> {actual_left}</div>
                <div className={styles.metaLine}>
                  Asignadas: {saldo.total_asignado} • Usadas: {saldo.usadas_actual} • Pendientes: {saldo.pendientes_actual}
                </div>
              </div>

              <div className={styles.saldoTotal}>
                Total disponibles: <b className={styles.left}>{total_left}</b>
              </div>
            </div>

            <div className={styles.card}>
              <h3 style={{marginTop:0}}>Acciones</h3>
              <div className={styles.grid2}>
                <div className={styles.inputGroup}>
                  <label>Días extra (usuario)</label>
                  <input type="number" value={extra} onChange={(e)=>setExtra(+e.target.value || 0)} />
                </div>
                <div style={{display:'flex', alignItems:'flex-end'}}>
                  {canEdit && <button className={styles.primary} onClick={saveExtra}>Guardar extra</button>}
                </div>
              </div>
              {canEdit && (
                <button className={styles.ghost} onClick={addEmpresa}>
                  Crear “vacaciones de empresa” (demo 1 día hoy)
                </button>
              )}
              <p className={styles.hint}>
                El consumo se descuenta primero del año pasado. Cuando llegue a 0, la sección “del año pasado” desaparece.
              </p>
            </div>
          </div>

          <div className={styles.card}>
            <h3 style={{marginTop:0}}>Eventos del {anio}</h3>
            {loading ? (
              <p>Cargando…</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tipo</th><th>Inicio</th><th>Fin</th><th>Días</th><th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {(eventos||[]).length === 0 && (
                    <tr><td colSpan="5" style={{opacity:.8}}>Sin eventos</td></tr>
                  )}
                  {(eventos||[]).map(ev => (
                    <tr key={ev.id}>
                      <td>{ev.tipo}</td>
                      <td>{ev.start_date}</td>
                      <td>{ev.end_date}</td>
                      <td>{ev.dias}</td>
                      <td>{ev.notas || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
