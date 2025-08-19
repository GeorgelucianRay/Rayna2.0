// src/components/VacacionesAdminCalendario.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './VacacionesAdmin.module.css';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

/* ——— utils ——— */
function toLocalISO(date = new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}
function fmt(d) { return toLocalISO(new Date(d)); }
function overlaps(a1, a2, b1, b2) {
  return new Date(a1) <= new Date(b2) && new Date(b1) <= new Date(a2);
}
function colorFromId(id, fallbackHex) {
  if (fallbackHex && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(fallbackHex)) return fallbackHex;
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) % 360;
  return `hsl(${h} 65% 50%)`;
}

export default function VacacionesAdminCalendario() {
  const { profile } = useAuth() || {};
  const role = String(profile?.role || '').toLowerCase();
  const canModerate = role === 'dispecer' || role === 'admin';

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  const [params, setParams] = useState({ max_simultaneous: 2 });
  const [users, setUsers] = useState([]);              // [{id,nombre_completo,color_hex}]
  const [events, setEvents] = useState([]);            // toate tipurile & state-urile care ating luna
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const monthStart = useMemo(() => fmt(new Date(year, month, 1)), [year, month]);
  const monthEnd = useMemo(() => fmt(new Date(year, month + 1, 0)), [year, month]);

  // labels Luni-primul
  const weekLabels = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1) parametri pe anul curent
      const { data: cfg, error: e1 } = await supabase
        .from('vacaciones_parametros_anio')
        .select('*')
        .eq('anio', year)
        .maybeSingle();
      if (e1) throw e1;
      setParams({ max_simultaneous: cfg?.max_simultaneous ?? 2 });

      // 2) șoferi (legendă)
      const { data: us, error: e2 } = await supabase
        .from('profiles')
        .select('id, nombre_completo, color_hex');
      if (e2) throw e2;
      setUsers(us || []);

      // 3) evenimente care ating luna curentă (orice state/tip)
      const { data: evs, error: e3 } = await supabase
        .from('vacaciones_eventos')
        .select('id, user_id, tipo, state, start_date, end_date, dias, notas, created_at')
        .lte('start_date', monthEnd)
        .gte('end_date', monthStart);
      if (e3) throw e3;
      setEvents(evs || []);
    } catch (err) {
      console.warn('[Admin load]', err);
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, [year, monthStart, monthEnd]);

  useEffect(() => { load(); }, [load]);

  /* ——— derive: expand pe zile + celule calendar ——— */
  const byDayMap = useMemo(() => {
    const map = new Map(); // 'YYYY-MM-DD' -> [{user_id,state,tipo,event_id}]
    const push = (iso, r) => {
      if (!map.has(iso)) map.set(iso, []);
      map.get(iso).push(r);
    };
    for (const e of events) {
      const s = new Date(e.start_date), en = new Date(e.end_date);
      for (let d = new Date(s); d <= en; d.setDate(d.getDate() + 1)) {
        const iso = fmt(d);
        push(iso, { user_id: e.user_id, state: e.state, tipo: e.tipo, event_id: e.id });
      }
    }
    return map;
  }, [events]);

  const monthCells = useMemo(() => {
    const firstIdx = (new Date(year, month, 1).getDay() + 6) % 7; // L=0..D=6
    const count = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstIdx; i++) cells.push({ key: `b-${i}`, blank: true });
    for (let d = 1; d <= count; d++) {
      const iso = fmt(new Date(year, month, d));
      const dayUsers = byDayMap.get(iso) || [];
      cells.push({ key: `d-${d}`, d, iso, dayUsers });
    }
    return cells;
  }, [year, month, byDayMap]);

  const limit = params.max_simultaneous ?? 2;

  /* ——— pending/conflict list ——— */
  const waiting = useMemo(
    () => events
      .filter(e => e.state === 'pendiente' || e.state === 'conflicto')
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date)),
    [events]
  );

  /* ——— raport zile cu depășire ——— */
  const problematicDays = useMemo(() => {
    const rows = [];
    for (const [iso, arr] of byDayMap.entries()) {
      const approved = arr.filter(x => x.state === 'aprobado').length;
      if (approved > limit) {
        rows.push({
          dia: iso,
          aprobados: approved,
          detalle: arr
        });
      }
    }
    return rows.sort((a, b) => new Date(a.dia) - new Date(b.dia));
  }, [byDayMap, limit]);

  /* ——— helpers ——— */
  function userName(id) {
    return users.find(u => u.id === id)?.nombre_completo || '—';
  }
  function userColor(id) {
    const u = users.find(u => u.id === id);
    return colorFromId(id, u?.color_hex);
  }

  /* ——— actions ——— */
  async function approve(eid) {
    if (!canModerate) return;
    try {
      await supabase.rpc('approve_vacation_safe', { p_event_id: eid });
    } catch (e) {
      alert(e.message || 'Error aprobando (posible límite excedido).');
    } finally {
      await load();
    }
  }
  async function reject(eid) {
    if (!canModerate) return;
    const { error } = await supabase
      .from('vacaciones_eventos')
      .update({ state: 'rechazado' })
      .eq('id', eid);
    if (error) alert('No se pudo rechazar.');
    await load();
  }

  /* ——— nav ——— */
  function onPrev() {
    setMonth(prev => {
      const m = prev === 0 ? 11 : prev - 1;
      if (prev === 0) setYear(y => y - 1);
      return m;
    });
  }
  function onNext() {
    setMonth(prev => {
      const m = prev === 11 ? 0 : prev + 1;
      if (prev === 11) setYear(y => y + 1);
      return m;
    });
  }

  return (
    <div className={styles.adminWrap}>
      <div className={styles.header}>
        <h2>Calendario general</h2>
        <div className={styles.headerRight}>
          <span className={styles.limitBadge}>Max/día: <b>{limit}</b></span>
          <button className={styles.iconBtn} onClick={onPrev} aria-label="Mes anterior">‹</button>
          <strong className={styles.monthTitle}>
            {new Date(year, month, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\p{L}/u, c => c.toUpperCase())}
          </strong>
          <button className={styles.iconBtn} onClick={onNext} aria-label="Mes siguiente">›</button>
        </div>
      </div>

      {error && <div className={styles.error}>⚠️ {error}</div>}

      <div className={styles.grid}>
        {/* Calendarul */}
        <div className={styles.card}>
          <div className={styles.weekRow}>{weekLabels.map(d => <span key={d}>{d}</span>)}</div>
          <div className={styles.daysGrid}>
            {monthCells.map(c => c.blank ? (
              <div key={c.key} className={styles.dayBlank} />
            ) : (
              <div
                key={c.key}
                className={`${styles.dayCell} ${
                  (c.dayUsers.filter(u => u.state === 'aprobado').length > limit) ? styles.over : ''
                }`}
                title={`${c.iso}`}
              >
                <span className={styles.dayNum}>{c.d}</span>
                <div className={styles.bands}>
                  {c.dayUsers.slice(0, 10).map((u, idx) => (
                    <span
                      key={`${c.iso}-${idx}`}
                      className={`${styles.band} ${u.state !== 'aprobado' ? styles.bandPending : ''}`}
                      style={{ background: userColor(u.user_id) }}
                      title={`${userName(u.user_id)} · ${u.state}`}
                    />
                  ))}
                  {c.dayUsers.length > 10 && (
                    <span className={styles.more}>+{c.dayUsers.length - 10}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panou lateral: Legendă + Solicitări */}
        <div className={styles.side}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Legendă șoferi</h3>
            <ul className={styles.legend}>
              {users.map(u => (
                <li key={u.id} className={styles.legendItem}>
                  <span className={styles.userDot} style={{ background: colorFromId(u.id, u.color_hex) }} />
                  <span className={styles.userName}>{u.nombre_completo}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Solicitări (pendiente / conflicto)</h3>
            {loading ? <p>Cargando…</p> : (
              <ul className={styles.requests}>
                {waiting.length === 0 && <li className={styles.empty}>Nu există solicitări.</li>}
                {waiting.map(ev => (
                  <li key={ev.id} className={styles.reqItem}>
                    <div className={styles.reqLeft}>
                      <span className={styles.userDot} style={{ background: userColor(ev.user_id) }} />
                      <div>
                        <strong className={styles.reqName}>{userName(ev.user_id)}</strong>
                        <div className={styles.reqMeta}>
                          {ev.tipo} · {new Date(ev.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} – {new Date(ev.end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          <span className={`${styles.badge} ${ev.state === 'conflicto' ? styles.badgeWarn : styles.badgePend}`}>{ev.state.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    {canModerate && (
                      <div className={styles.reqActions}>
                        <button className={styles.smallOk} onClick={() => approve(ev.id)}>Aprobar</button>
                        <button className={styles.smallGhost} onClick={() => reject(ev.id)}>Rechazar</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Zile cu depășiri</h3>
            {problematicDays.length === 0 ? (
              <p className={styles.empty}>Nicio zi peste limită în această lună.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr><th>Zi</th><th>Aprobați</th><th>Șoferi</th></tr>
                </thead>
                <tbody>
                  {problematicDays.map(row => (
                    <tr key={row.dia}>
                      <td>{row.dia}</td>
                      <td>{row.aprobados} / {limit}</td>
                      <td className={styles.chips}>
                        {row.detalle
                          .filter(d => d.state === 'aprobado')
                          .map((d, i) => (
                            <span key={i} className={styles.chip} style={{ background: userColor(d.user_id) }}>
                              {userName(d.user_id)}
                            </span>
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}