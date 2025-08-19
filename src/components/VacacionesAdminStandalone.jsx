import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import styles from './VacacionesAdmin.module.css';

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

/* ---------- helpers date ---------- */
function toLocalISO(date = new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}
function daysInOverlap(startISO, endISO, year) {
  const a = new Date(`${year}-01-01`);
  const b = new Date(`${year}-12-31`);
  const s0 = new Date(startISO);
  const e0 = new Date(endISO);
  const s = s0 < a ? a : s0;
  const e = e0 > b ? b : e0;
  if (e < s) return 0;
  return Math.floor((e - s) / 86400000) + 1;
}

export default function VacacionesAdminStandalone() {
  const { id } = useParams(); // user_id del chófer
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [chofer, setChofer] = useState(null);

  const [params, setParams] = useState({ dias_base: 23, dias_personales: 2, dias_pueblo: 0, max_simultaneous: 2 });
  const [extra, setExtra] = useState(0); // dias_extra per user/an
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorDb, setErrorDb] = useState('');

  const aniosList = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  const canEdit = String(profile?.role || '').toLowerCase() === 'dispecer'
               || String(profile?.role || '').toLowerCase() === 'admin';

  /* ---------- loader principal ---------- */
  const load = useCallback(async () => {
    setLoading(true);
    setErrorDb('');
    try {
      // 1) profil șofer
      const { data: p } = await supabase
        .from('profiles')
        .select('id, nombre_completo')
        .eq('id', id)
        .maybeSingle();
      setChofer(p || null);

      // 2) parametri an
      const { data: cfg, error: eCfg } = await supabase
        .from('vacaciones_parametros_anio')
        .select('*')
        .eq('anio', anio)
        .maybeSingle();
      if (eCfg && eCfg.code === '42P01') throw new Error('Faltan tablas de vacaciones.');
      setParams({
        dias_base: cfg?.dias_base ?? 23,
        dias_personales: cfg?.dias_personales ?? 2,
        dias_pueblo: cfg?.dias_pueblo ?? 0,
        max_simultaneous: cfg?.max_simultaneous ?? 2
      });

      // 3) extra user/an
      const { data: ex } = await supabase
        .from('vacaciones_asignaciones_extra')
        .select('dias_extra')
        .eq('user_id', id)
        .eq('anio', anio)
        .maybeSingle();
      setExtra(ex?.dias_extra ?? 0);

      // 4) evenimente care ating anul (toate stările)
      const { data: ev } = await supabase
        .from('vacaciones_eventos')
        .select('id,tipo,state,start_date,end_date,dias,notas,created_at')
        .eq('user_id', id)
        .lte('start_date', `${anio}-12-31`)
        .gte('end_date', `${anio}-01-01`)
        .order('start_date', { ascending: true });
      setEventos(ev || []);
    } catch (err) {
      console.warn('[VacacionesAdminStandalone] load:', err);
      setErrorDb(err.message || 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, [id, anio]);

  useEffect(() => { load(); }, [load]);

  /* ---------- derivate de saldo ---------- */
  const totalAsignado = useMemo(
    () => (params.dias_base || 0) + (params.dias_personales || 0) + (params.dias_pueblo || 0) + (extra || 0),
    [params, extra]
  );

  const usadas = useMemo(() =>
      (eventos || [])
        .filter(e => e.state === 'aprobado')
        .reduce((s, e) => s + daysInOverlap(e.start_date, e.end_date, anio), 0),
    [eventos, anio]
  );

  const pendientes = useMemo(() =>
      (eventos || [])
        .filter(e => e.state === 'pendiente' || e.state === 'conflicto')
        .reduce((s, e) => s + daysInOverlap(e.start_date, e.end_date, anio), 0),
    [eventos, anio]
  );

  const disponibles = Math.max(totalAsignado - usadas - pendientes, 0);

  /* ---------- acțiuni ---------- */
  const saveParams = async () => {
    if (!canEdit) return;
    const payload = { anio, dias_base: Number(params.dias_base)||0, dias_personales: Number(params.dias_personales)||0, dias_pueblo: Number(params.dias_pueblo)||0, max_simultaneous: Number(params.max_simultaneous)||2 };
    const { error } = await supabase.from('vacaciones_parametros_anio').upsert(payload, { onConflict: 'anio' });
    if (error) return alert('No se pudo guardar parámetros.');
    alert('Parámetros guardados.');
    await load();
  };

  const saveExtra = async () => {
    if (!canEdit) return;
    const payload = { user_id: id, anio, dias_extra: Number(extra)||0 };
    const { error } = await supabase
      .from('vacaciones_asignaciones_extra')
      .upsert(payload, { onConflict: 'user_id,anio' });
    if (error) return alert('No se pudo guardar días extra.');
    alert('Días extra guardados.');
    await load();
  };

  const addEmpresa = async () => {
    if (!canEdit) return;
    const today = toLocalISO();
    const payload = {
      user_id: id,
      tipo: 'empresa',
      state: 'aprobado', // eveniment de firmă aprobat direct
      start_date: today,
      end_date: today,
      notas: 'Vacaciones de empresa (demo)',
      created_by: profile?.id || null
      // 'dias' se calculează automat în DB
    };
    const { error } = await supabase.from('vacaciones_eventos').insert(payload);
    if (error) return alert('No se pudo crear evento.');
    await load();
  };

  const approve = async (eventId) => {
    if (!canEdit) return;
    try {
      await supabase.rpc('approve_vacation_safe', { p_event_id: eventId });
    } catch (e) {
      alert(e.message || 'No se pudo aprobar (posible límite excedido).');
    } finally {
      await load();
    }
  };

  const reject = async (eventId) => {
    if (!canEdit) return;
    const { error } = await supabase
      .from('vacaciones_eventos')
      .update({ state: 'rechazado' })
      .eq('id', eventId);
    if (error) alert('No se pudo rechazar.');
    await load();
  };

  /* ---------- UI ---------- */
  return (
    <Layout backgroundClassName="miPerfil-background">
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/choferes')} aria-label="Volver">
          <BackIcon /> Volver
        </button>
        <h1>Vacaciones — {chofer?.nombre_completo || 'Chófer'}</h1>
        <div />
      </div>

      {errorDb && (
        <div className={styles.card}>
          <p className={styles.errorLine}>⚠️ {errorDb}</p>
        </div>
      )}

      {!errorDb && (
        <>
          <div className={styles.card}>
            <div className={styles.row}>
              <label>Año</label>
              <select
                value={anio}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) setAnio(v);
                }}
              >
                {aniosList.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className={styles.grid3}>
              <div className={styles.inputGroup}>
                <label>Días base</label>
                <input
                  type="number"
                  value={params.dias_base}
                  onChange={(e) => setParams((p) => ({ ...p, dias_base: +e.target.value }))}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Personales</label>
                <input
                  type="number"
                  value={params.dias_personales}
                  onChange={(e) => setParams((p) => ({ ...p, dias_personales: +e.target.value }))}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Fiesta de pueblo</label>
                <input
                  type="number"
                  value={params.dias_pueblo}
                  onChange={(e) => setParams((p) => ({ ...p, dias_pueblo: +e.target.value }))}
                />
              </div>
            </div>

            <div className={styles.row}>
              <label>Máx. simultáneos por día</label>
              <input
                type="number"
                value={params.max_simultaneous}
                onChange={(e) => setParams((p) => ({ ...p, max_simultaneous: +e.target.value || 1 }))}
              />
            </div>

            {canEdit && (
              <button className={styles.primary} onClick={saveParams} disabled={loading}>
                Guardar parámetros
              </button>
            )}
          </div>

          <div className={styles.gridTop}>
            <div className={styles.card}>
              <h3 style={{ marginTop: 0 }}>Saldo {anio}</h3>

              <div className={styles.saldoRow}>
                <div><b>Disponibles:</b> <span className={styles.left}>{disponibles}</span></div>
                <div className={styles.metaLine}>
                  Asignadas: {totalAsignado} • Usadas (aprobadas): {usadas} • Pendientes: {pendientes}
                </div>
              </div>

              <p className={styles.hint}>
                Las solicitudes pendientes o en conflicto descuentan temporalmente del disponible.
              </p>
            </div>

            <div className={styles.card}>
              <h3 style={{ marginTop: 0 }}>Acciones</h3>
              <div className={styles.grid2}>
                <div className={styles.inputGroup}>
                  <label>Días extra (usuario)</label>
                  <input
                    type="number"
                    value={extra}
                    onChange={(e) => setExtra(+e.target.value || 0)}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  {canEdit && (
                    <button className={styles.primary} onClick={saveExtra} disabled={loading}>
                      Guardar extra
                    </button>
                  )}
                </div>
              </div>

              {canEdit && (
                <button className={styles.ghost} onClick={addEmpresa} disabled={loading}>
                  Crear “vacaciones de empresa” (demo: 1 día hoy)
                </button>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <h3 style={{ marginTop: 0 }}>Eventos del {anio}</h3>
            {loading ? (
              <p>Cargando…</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Días</th>
                    <th>Notas</th>
                    {canEdit && <th style={{ width: 160 }}>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {(eventos || []).length === 0 && (
                    <tr>
                      <td colSpan={canEdit ? 7 : 6} style={{ opacity: 0.8 }}>
                        Sin eventos
                      </td>
                    </tr>
                  )}
                  {(eventos || []).map((ev) => (
                    <tr key={ev.id}>
                      <td>{ev.tipo}</td>
                      <td>
                        <span className={`${styles.badge} ${
                          ev.state === 'aprobado' ? styles.badgeOk :
                          ev.state === 'conflicto' ? styles.badgeWarn :
                          ev.state === 'rechazado' ? styles.badgeGrey : styles.badgePend
                        }`}>
                          {ev.state.toUpperCase()}
                        </span>
                      </td>
                      <td>{ev.start_date}</td>
                      <td>{ev.end_date}</td>
                      <td>{daysInOverlap(ev.start_date, ev.end_date, anio)}</td>
                      <td>{ev.notas || '—'}</td>
                      {canEdit && (
                        <td>
                          {(ev.state === 'pendiente' || ev.state === 'conflicto') && (
                            <div className={styles.rowBtns}>
                              <button className={styles.smallOk} onClick={() => approve(ev.id)}>Aprobar</button>
                              <button className={styles.smallGhost} onClick={() => reject(ev.id)}>Rechazar</button>
                            </div>
                          )}
                          {ev.state === 'aprobado' && <span className={styles.muted}>—</span>}
                          {ev.state === 'rechazado' && <span className={styles.muted}>—</span>}
                        </td>
                      )}
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