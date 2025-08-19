import React, { useEffect, useMemo, useState, useCallback } from 'react';
import styles from './VacacionesStandalone.module.css';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

/* ——— iconițe mici ——— */
const Chevron = ({ left }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    {left ? <polyline points="15 18 9 12 15 6"></polyline> : <polyline points="9 18 15 12 9 6"></polyline>}
  </svg>
);
const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const Dot = ({ className }) => <span className={`${styles.dot} ${className || ''}`} />;

/* ——— helperi dată ——— */
function toLocalISO(date = new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}
function fmt(d) { return toLocalISO(new Date(d)); }
function daysBetween(a, b) {
  const A = new Date(fmt(a)), B = new Date(fmt(b));
  return Math.floor((B - A) / 86400000) + 1;
}
function overlaps(a1, a2, b1, b2) {
  return new Date(a1) <= new Date(b2) && new Date(b1) <= new Date(a2);
}

export default function VacacionesStandalone() {
  const { profile } = useAuth() || {};
  const role = String(profile?.role || '').toLowerCase(); // 'sofer' | 'dispecer' | 'admin'
  const canModerate = role === 'dispecer' || role === 'admin';

  // stare calendar
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  // parametri & evenimente
  const [available, setAvailable] = useState({ total: 0, carry: 0 });
  const [params, setParams] = useState({ dias_base: 23, dias_personales: 2, dias_pueblo: 0, max_simultaneous: 2 });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // formular solicitare
  const [reqType, setReqType] = useState('vacacion'); // 'vacacion' | 'personal'
  const [dateStart, setDateStart] = useState(toLocalISO());
  const [dateEnd, setDateEnd] = useState(toLocalISO(new Date(Date.now() + 86400000)));
  const [note, setNote] = useState('');

  // selecție drag
  const [selStart, setSelStart] = useState(null);
  const [selEnd, setSelEnd] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);

  /* ——— load data ——— */
  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      // 1) parametri pe an
      const { data: cfg } = await supabase
        .from('vacaciones_parametros_anio')
        .select('*')
        .eq('anio', year)
        .maybeSingle();

      const base = cfg?.dias_base ?? 23;
      const pers = cfg?.dias_personales ?? 2;
      const pueblo = cfg?.dias_pueblo ?? 0;

      // 2) extra user/an (opțional)
      const { data: ex } = await supabase
        .from('vacaciones_asignaciones_extra')
        .select('dias_extra')
        .eq('user_id', profile.id)
        .eq('anio', year)
        .maybeSingle();

      const total = base + pers + pueblo + (ex?.dias_extra ?? 0);

      // 3) evenimente user în anul curent (orice stare)
      const { data: ev } = await supabase
        .from('vacaciones_eventos')
        .select('id,tipo,state,start_date,end_date,dias,notas,created_at')
        .eq('user_id', profile.id)
        .gte('start_date', `${year}-01-01`)
        .lte('end_date', `${year}-12-31`)
        .order('start_date', { ascending: true });

      setParams({
        dias_base: base,
        dias_personales: pers,
        dias_pueblo: pueblo,
        max_simultaneous: cfg?.max_simultaneous ?? 2
      });
      setAvailable({ total, carry: 0 }); // dacă vrei carry, îl putem calcula din altă sursă
      setEvents(ev || []);
    } catch (e) {
      console.warn('[VacacionesStandalone] load:', e.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, year]);

  useEffect(() => { load(); }, [load]);

  /* ——— calcule ——— */
  const monthDate = useMemo(() => new Date(year, month, 1), [year, month]);
  const monthTitle = useMemo(
    () => monthDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\p{L}/u, c => c.toUpperCase()),
    [monthDate]
  );

  // Luni-primul
  const weekLabels = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
  const monthCells = useMemo(() => {
    const firstIdx = (new Date(year, month, 1).getDay() + 6) % 7; // L=0..D=6
    const count = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstIdx; i++) cells.push({ key: `b-${i}`, blank: true });
    for (let d = 1; d <= count; d++) {
      const iso = fmt(new Date(year, month, d));
      const dayEvents = events.filter(e => overlaps(e.start_date, e.end_date, iso, iso));
      cells.push({ key: `d-${d}`, d, iso, dayEvents });
    }
    return cells;
  }, [year, month, events]);

  const usedDays = useMemo(
    () => (events || [])
      .filter(e => e.state === 'aprobado' && new Date(e.start_date).getFullYear() === year)
      .reduce((s, e) => s + (e.dias ?? daysBetween(e.start_date, e.end_date)), 0),
    [events, year]
  );
  const leftDays = Math.max((available.total || 0) - usedDays, 0);

  const overlapBanner = useMemo(() => {
    const hit = (events || []).find(e => e.state === 'aprobado' && overlaps(e.start_date, e.end_date, dateStart, dateEnd));
    if (!hit) return null;
    const s = new Date(hit.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const e = new Date(hit.end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    return `Se solapa con ${s} – ${e} (aprobado)`;
  }, [events, dateStart, dateEnd]);

  // donut
  const donut = useMemo(() => {
    const total = Math.max(available.total || 0, 1);
    const arc = 314 * (leftDays / total); // 2πr, r≈50
    return { total, left: leftDays, used: total - leftDays, arc: Math.max(0, arc) };
  }, [available.total, leftDays]);

  /* ——— handlers calendar ——— */
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

  function onDayMouseDown(iso) {
    setSelStart(iso);
    setSelEnd(iso);
    setIsSelecting(true);
  }
  function onDayMouseEnter(iso) {
    if (!isSelecting || !selStart) return;
    if (new Date(iso) < new Date(selStart)) {
      setSelEnd(selStart);
      setSelStart(iso);
    } else {
      setSelEnd(iso);
    }
  }
  function onMouseUp() {
    if (!isSelecting) return;
    setIsSelecting(false);
    if (selStart && selEnd) {
      setDateStart(selStart);
      setDateEnd(selEnd);
    }
  }

  /* ——— acțiuni ——— */
  async function submitRequest() {
    if (!profile?.id) return alert('Necesitas iniciar sesión.');
    const d1 = new Date(dateStart), d2 = new Date(dateEnd);
    if (d2 < d1) return alert('La fecha fin no puede ser anterior al inicio.');

    const reqDays = daysBetween(dateStart, dateEnd);
    if (reqType === 'vacacion' && reqDays > leftDays) {
      const ok = confirm(`Solicitas ${reqDays} días pero te quedan ${leftDays}. ¿Continuar?`);
      if (!ok) return;
    }

    const payload = {
      user_id: profile.id,
      tipo: reqType,
      state: 'pendiente',
      start_date: dateStart,
      end_date: dateEnd,
      notas: note || null,
      created_by: profile.id
    };

    const { data, error } = await supabase
      .from('vacaciones_eventos')
      .insert(payload)
      .select('id')
      .maybeSingle();

    if (error) {
      console.warn('insert error:', error);
      return alert('No se pudo crear la solicitud.');
    }

    await supabase.rpc('check_vacation_conflicts', { p_event_id: data.id }).catch(() => {});

    setNote('');
    setSelStart(null); setSelEnd(null);
    await load();
    alert('Solicitud enviada.');
  }

  // 👇 --- FUNCȚIILE MODIFICATE --- 👇
  async function approveRequest(id) {
    if (!canModerate) return;
    
    const { error } = await supabase
      .from('vacaciones_eventos')
      .update({ state: 'aprobado' })
      .eq('id', id);

    if (error) {
      console.error('Error al aprobar la solicitud:', error);
      alert('No se pudo aprobar la solicitud.');
    } else {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, state: 'aprobado' } : e));
    }
  }

  async function rejectRequest(id) {
    if (!canModerate) return;

    const { error } = await supabase
      .from('vacaciones_eventos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al rechazar la solicitud:', error);
      alert('No se pudo rechazar la solicitud.');
    } else {
      setEvents(prev => prev.filter(e => e.id !== id));
    }
  }
  // 👆 --- SFÂRȘITUL MODIFICĂRILOR --- 👆

  return (
    <div className={styles.vacWrap}>
      {/* titlu intern */}
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Vacaciones</h2>
        <button className={styles.todayBtn}
                onClick={() => { setYear(new Date().getFullYear()); setMonth(new Date().getMonth()); }}>
          Hoy
        </button>
      </div>

      {/* stats */}
      <div className={styles.statsRow}>
        <div className={styles.stat}><span>Disponibles</span><strong>{leftDays}</strong></div>
        <div className={styles.stat}><span>Pendientes</span><strong>{events.filter(e => e.state === 'pendiente').length}</strong></div>
        <div className={styles.stat}><span>Aprobadas este año</span><strong>{donut.used}</strong></div>
      </div>

      {/* grid principal */}
      <div className={styles.grid}>
        {/* stânga: donut + legendă */}
        <div className={styles.card}>
          <div className={styles.donutBox}>
            <svg className={styles.donut} viewBox="0 0 120 120" aria-label="Disponibles">
              <circle className={styles.donutTrack} cx="60" cy="60" r="50" />
              <circle className={styles.donutValue} cx="60" cy="60" r="50" style={{ strokeDasharray: `${donut.arc} 314` }} />
              <g className={styles.donutCenter}>
                <text x="60" y="52" textAnchor="middle" className={styles.donutBig}>{leftDays}</text>
                <text x="60" y="70" textAnchor="middle" className={styles.donutSmall}>días</text>
                <text x="60" y="84" textAnchor="middle" className={styles.donutSmall2}>Disponibles</text>
              </g>
            </svg>
            <ul className={styles.legend}>
              <li><Dot className={styles.vac}/> Vacación <span>—</span></li>
              <li><Dot className={styles.per}/> Personal <span>—</span></li>
              <li><Dot className={styles.emp}/> Empresa <span>—</span></li>
              <li><Dot className={styles.car}/> Carryover <span>{available.carry}</span></li>
            </ul>
          </div>
        </div>

        {/* dreapta: calendar */}
        <div className={styles.card} onMouseUp={onMouseUp}>
          <div className={styles.calHeader}>
            <button className={styles.iconBtn} onClick={onPrev} aria-label="Mes anterior"><Chevron left/></button>
            <h3 className={styles.monthTitle}>{monthTitle}</h3>
            <button className={styles.iconBtn} onClick={onNext} aria-label="Mes siguiente"><Chevron/></button>
          </div>

          {(dateStart && dateEnd) && (
            <div className={styles.rangeBar}>
              {new Date(dateStart).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' – '}
              {new Date(dateEnd).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          )}

          <div className={styles.weekRow}>{weekLabels.map(d => <span key={d}>{d}</span>)}</div>
          <div className={styles.daysGrid}>
            {monthCells.map(c => c.blank ? (
              <div key={c.key} className={styles.dayBlank}/>
            ) : (
              <div
                key={c.key}
                className={`${styles.dayCell} ${
                  (selStart && selEnd && c.iso >= selStart && c.iso <= selEnd) ? styles.sel : ''
                }`}
                onMouseDown={() => onDayMouseDown(c.iso)}
                onMouseEnter={() => onDayMouseEnter(c.iso)}
              >
                <span className={styles.dayNum}>{c.d}</span>
                <div className={styles.dayDots}>
                  {c.dayEvents.slice(0, 3).map(ev => (
                    <span key={`${c.iso}-${ev.id}`} className={`${styles.dot} ${
                      ev.tipo === 'vacacion' ? styles.vac :
                      ev.tipo === 'personal' ? styles.per :
                      ev.tipo === 'empresa' ? styles.emp : styles.car
                    }`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {overlapBanner && <div className={styles.banner}>⚠️ {overlapBanner}</div>}
        </div>
      </div>

      {/* formular cerere */}
      <div className={styles.requestRow}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${reqType === 'vacacion' ? styles.tabOn : ''}`} onClick={() => setReqType('vacacion')}>Vacación</button>
          <button className={`${styles.tab} ${reqType === 'personal' ? styles.tabOn : ''}`} onClick={() => setReqType('personal')}>Personal</button>
        </div>
        <div className={styles.reqInputs}>
          <label>Inicio<input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} /></label>
          <label>Fin<input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} /></label>
          <label className={styles.note}><input type="text" placeholder="Nota (opcional)" value={note} onChange={e => setNote(e.target.value)} /></label>
        </div>
        <button className={styles.primary} onClick={submitRequest} disabled={loading}>Solicitar</button>
      </div>

      {/* activitate */}
      <div className={styles.bottom}>
        <div className={styles.card}>
          <h4 className={styles.cardTitle}>Actividad</h4>
          {loading ? <p>Cargando…</p> : (
            <ul className={styles.activity}>
              {events.slice().sort((a, b) => new Date(b.start_date) - new Date(a.start_date)).map(ev => (
                <li key={ev.id} className={styles.activityItem}>
                  <div className={styles.activityLeft}>
                    <span className={`${styles.stateDot} ${ev.state === 'aprobado' ? styles.ok : (ev.state === 'conflicto' ? styles.pending : styles.pending)}`}>
                      {ev.state === 'aprobado' ? <Check/> : null}
                    </span>
                    <div>
                      <strong className={styles.kind}>
                        {ev.tipo === 'vacacion' ? 'Vacación' : ev.tipo === 'personal' ? 'Personal' : ev.tipo}
                      </strong>
                      <span className={styles.range}>
                        {new Date(ev.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} – {new Date(ev.end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  <div className={styles.activityRight}>
                    <span className={`${styles.badge} ${
                      ev.state === 'aprobado' ? styles.badgeOk :
                      ev.state === 'conflicto' ? styles.badgePend : styles.badgePend
                    }`}>{ev.state.toUpperCase()}</span>
                    {canModerate && ev.state === 'pendiente' && (
                      <div className={styles.mod}>
                        {/* 👇 --- BUTOANELE MODIFICATE --- 👇 */}
                        <button onClick={() => approveRequest(ev.id)} className={styles.smallOk}>Aprobar</button>
                        <button onClick={() => rejectRequest(ev.id)} className={styles.smallGhost}>Rechazar</button>
                        {/* 👆 --- SFÂRȘITUL MODIFICĂRILOR --- 👆 */}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
