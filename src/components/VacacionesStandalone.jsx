// VacacionesStandaloneCyber.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import styles from './VacacionesStandalone.module.css';

/* ---------- helpers fecha ---------- */
function toLocalISO(date = new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}
function fmt(d) {
  const x = new Date(d);
  const z = new Date(x.getTime() - x.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  const A = new Date(fmt(a)), B = new Date(fmt(b));
  return Math.floor((B - A) / 86400000) + 1;
}
function overlaps(a1, a2, b1, b2) {
  return new Date(a1) <= new Date(b2) && new Date(b1) <= new Date(a2);
}
function* iterateDates(isoStart, isoEnd) {
  let d = new Date(fmt(isoStart));
  const end = new Date(fmt(isoEnd));
  while (d <= end) {
    yield fmt(d);
    d = new Date(d.getTime() + 86400000);
  }
}
function monthLabel(date) {
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
             .replace(/^\p{L}/u, c => c.toUpperCase());
}

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

export default function VacacionesStandaloneCyber() {
  const { profile } = useAuth() || {};
  const userId = profile?.id || null;

  // fecha/mes
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  // parámetros año
  const [params, setParams] = useState({
    dias_base: 23, dias_personales: 2, dias_pueblo: 0, max_simultaneous: 3
  });
  const [diasExtra, setDiasExtra] = useState(0);

  // eventos
  const [myEvents, setMyEvents] = useState([]);
  const [eventsAll, setEventsAll] = useState([]); // pt. avertizare (număr, nu nume)
  const [loading, setLoading] = useState(true);
  const [errorDb, setErrorDb] = useState('');

  // formular
  const [reqType, setReqType] = useState('personal'); // 'personal' | 'empresa'
  const [dateStart, setDateStart] = useState(toLocalISO());
  const [dateEnd, setDateEnd] = useState(toLocalISO(new Date(Date.now() + 86400000)));
  const [note, setNote] = useState('');

  // selecție drag
  const [selStart, setSelStart] = useState(null);
  const [selEnd, setSelEnd] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);

  /* ---------- load principal ---------- */
  const load = useCallback(async () => {
    setLoading(true);
    setErrorDb('');
    try {
      // parámetros del año
      const { data: cfg } = await supabase
        .from('vacaciones_parametros_anio')
        .select('*')
        .eq('anio', anio)
        .maybeSingle();

      setParams({
        dias_base: cfg?.dias_base ?? 23,
        dias_personales: cfg?.dias_personales ?? 2,
        dias_pueblo: cfg?.dias_pueblo ?? 0,
        max_simultaneous: cfg?.max_simultaneous ?? 3
      });

      if (userId) {
        // extra per user
        const { data: ex } = await supabase
          .from('vacaciones_asignaciones_extra')
          .select('dias_extra')
          .eq('user_id', userId).eq('anio', anio)
          .maybeSingle();
        setDiasExtra(ex?.dias_extra ?? 0);

        // evenimentele mele (care ating anul)
        const yearStart = `${anio}-01-01`;
        const yearEnd = `${anio}-12-31`;
        const { data: evMe } = await supabase
          .from('vacaciones_eventos')
          .select('id,tipo,state,start_date,end_date,dias,notas,created_at')
          .eq('user_id', userId)
          .or(`and(start_date.lte.${yearEnd},end_date.gte.${yearStart})`)
          .order('start_date', { ascending: true });
        setMyEvents(evMe || []);
      }

      // toate evenimentele pentru avertizare (fără nume, doar numărare)
      const yearStart = `${anio}-01-01`;
      const yearEnd = `${anio}-12-31`;
      const { data: evAll } = await supabase
        .from('vacaciones_eventos')
        .select('user_id,state,start_date,end_date') // minimul necesar
        .or(`and(start_date.lte.${yearEnd},end_date.gte.${yearStart})`);
      setEventsAll(evAll || []);
    } catch (e) {
      setErrorDb(e.message || 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, [anio, userId]);

  useEffect(() => { load(); }, [load]);

  // mouseup global pt. drag-select
  useEffect(() => {
    if (!isSelecting) return;
    const onUp = () => {
      setIsSelecting(false);
      if (selStart && selEnd) { setDateStart(selStart); setDateEnd(selEnd); }
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [isSelecting, selStart, selEnd]);

  /* ---------- derivate ---------- */
  const totalAsignado = useMemo(() =>
    (params.dias_base||0) + (params.dias_personales||0) + (params.dias_pueblo||0) + (diasExtra||0),
  [params, diasExtra]);

  function overlapDaysWithinYear(ev, y) {
    const start = new Date(ev.start_date);
    const end   = new Date(ev.end_date);
    const yStart = new Date(`${y}-01-01T00:00:00`);
    const yEnd   = new Date(`${y}-12-31T23:59:59`);
    const s = start > yStart ? start : yStart;
    const e = end   < yEnd   ? end   : yEnd;
    if (e < s) return 0;
    return daysBetween(s, e);
  }

  const usadas = useMemo(() =>
    (myEvents || [])
      .filter(e => e.state === 'aprobado')
      .reduce((sum, e) => sum + overlapDaysWithinYear(e, anio), 0),
  [myEvents, anio]);

  const pendientes = useMemo(() =>
    (myEvents || [])
      .filter(e => e.state === 'pendiente' || e.state === 'conflicto')
      .reduce((sum, e) => sum + overlapDaysWithinYear(e, anio), 0),
  [myEvents, anio]);

  const disponibles = Math.max(totalAsignado - usadas - pendientes, 0);

  // Harta pentru punctele din calendar (evenimentele mele)
  const eventByDate = useMemo(() => {
    const map = new Map();
    (myEvents || []).forEach(ev => {
      for (const iso of iterateDates(ev.start_date, ev.end_date)) {
        if (!map.has(iso)) map.set(iso, []);
        map.get(iso).push(ev);
      }
    });
    return map;
  }, [myEvents]);

  // Harta pentru avertizare: zi -> numărul de șoferi (toți)
  const dayMapAll = useMemo(() => {
    const map = new Map();
    (eventsAll || []).forEach(ev => {
      if (ev.state === 'rechazado') return;
      for (const iso of iterateDates(ev.start_date, ev.end_date)) {
        const y = new Date(iso).getFullYear();
        if (y !== anio) continue;
        if (!map.has(iso)) map.set(iso, 0);
        map.set(iso, map.get(iso) + 1);
      }
    });
    return map;
  }, [eventsAll, anio]);

  // Avertizare pentru intervalul selectat
  const crowdWarning = useMemo(() => {
    if (!dateStart || !dateEnd) return null;
    const limit = Math.max(1, Number(params.max_simultaneous)||1);
    let peak = 0, peakDay = null;
    for (const iso of iterateDates(dateStart, dateEnd)) {
      const n = dayMapAll.get(iso) || 0;
      if (n >= limit && n > peak) { peak = n; peakDay = iso; }
    }
    if (!peakDay) return null;
    const d = new Date(peakDay).toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
    return `⚠️ En ${d} hay ${peak} chóferes con vacaciones (límite ${limit}).`;
  }, [dateStart, dateEnd, params.max_simultaneous, dayMapAll]);

  /* ---------- calendar ---------- */
  const monthDate = useMemo(() => new Date(anio, month, 1), [anio, month]);
  const monthTitle = useMemo(() => monthLabel(monthDate), [monthDate]);

  const weekLabels = ['Lu','Ma','Mi','Ju','Vi','Sa','Do'];
  const monthCells = useMemo(() => {
    const firstIdx = (new Date(anio, month, 1).getDay() + 6) % 7; // luni=0
    const count = new Date(anio, month + 1, 0).getDate();
    const cells = [];
    for (let i=0; i<firstIdx; i++) cells.push({ key:`b-${i}`, blank:true });
    for (let d=1; d<=count; d++) {
      const iso = fmt(new Date(anio, month, d));
      const dayEvents = eventByDate.get(iso) || [];
      cells.push({ key:`d-${d}`, d, iso, dayEvents });
    }
    return cells;
  }, [anio, month, eventByDate]);

  const donut = useMemo(() => {
    const total = Math.max(totalAsignado || 0, 1);
    const left = Math.max(disponibles, 0);
    const used = Math.max(total - left, 0);
    const arc = 314 * (left / total); // 2πr, r≈50
    return { total, left, used, arc: Math.max(0, arc) };
  }, [totalAsignado, disponibles]);

  function onPrev() {
    setMonth(prev => (prev === 0 ? 11 : prev - 1));
    if (month === 0) setAnio(y => y - 1);
  }
  function onNext() {
    setMonth(prev => (prev === 11 ? 0 : prev + 1));
    if (month === 11) setAnio(y => y + 1);
  }
  function onDayMouseDown(iso) {
    setSelStart(iso); setSelEnd(iso); setIsSelecting(true);
  }
  function onDayMouseEnter(iso) {
    if (!isSelecting || !selStart) return;
    if (new Date(iso) < new Date(selStart)) { setSelEnd(selStart); setSelStart(iso); }
    else { setSelEnd(iso); }
  }

  /* ---------- acțiuni ---------- */
  async function submitRequest() {
    if (!userId) return alert('Necesitas iniciar sesión.');
    const d1 = new Date(dateStart), d2 = new Date(dateEnd);
    if (isNaN(d1) || isNaN(d2) || d2 < d1) return alert('La fecha fin no puede ser anterior al inicio.');

    if (reqType === 'personal') {
      const reqDays = daysBetween(dateStart, dateEnd);
      if (reqDays > disponibles) {
        const ok = confirm(`Solicitas ${reqDays} días pero te quedan ${disponibles}. ¿Continuar?`);
        if (!ok) return;
      }
    }

    const payload = {
      user_id: userId,
      tipo: reqType,
      state: reqType === 'empresa' ? 'aprobado' : 'pendiente', // empresa: se registra como aprobado (evidencia)
      start_date: dateStart,
      end_date: dateEnd,
      notas: note || null,
      created_by: userId
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

    // opțional: verificare conflict server-side pentru personal
    if (payload.state === 'pendiente') {
      await supabase.rpc('check_vacation_conflicts', { p_event_id: data.id }).catch(() => {});
    }

    setNote('');
    setSelStart(null); setSelEnd(null);
    await load();
    alert(reqType === 'empresa' ? 'Vacaciones de empresa registradas.' : 'Solicitud enviada.');
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.hLeft}>
          <h2 className={styles.title}>Mis vacaciones</h2>
          <span className={styles.sub}>Gestiona tus días y registra vacaciones de empresa</span>
        </div>
        <div className={styles.hRight}>
          <button type="button" className={styles.btnGhost}
                  onClick={() => { setAnio(new Date().getFullYear()); setMonth(new Date().getMonth()); }}>
            Hoy
          </button>
          <span className={styles.pill}>{anio}</span>
        </div>
      </header>

      {errorDb && <div className={styles.alert}>⚠️ {errorDb}</div>}

      <section className={styles.statsRow}>
        <div className={styles.stat}><span>Disponibles</span><strong>{disponibles}</strong></div>
        <div className={styles.stat}><span>Pendientes</span><strong>{(myEvents||[]).filter(e => e.state === 'pendiente').length}</strong></div>
        <div className={styles.stat}><span>Días aprobados</span><strong>{donut.used}</strong></div>
      </section>

      <section className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.donutBox}>
            <svg className={styles.donut} viewBox="0 0 120 120" aria-label="Disponibles">
              <circle className={styles.donutTrack} cx="60" cy="60" r="50" />
              <circle className={styles.donutValue} cx="60" cy="60" r="50" style={{ strokeDasharray: `${donut.arc} 314` }} />
              <g className={styles.donutCenter}>
                <text x="60" y="52" textAnchor="middle" className={styles.donutBig}>{donut.left}</text>
                <text x="60" y="70" textAnchor="middle" className={styles.donutSmall}>días</text>
                <text x="60" y="84" textAnchor="middle" className={styles.donutSmall2}>Disponibles</text>
              </g>
            </svg>
            <ul className={styles.legend}>
              <li><span className={`${styles.dot} ${styles.per}`}/><span>Personal</span></li>
              <li><span className={`${styles.dot} ${styles.emp}`}/><span>Empresa</span></li>
            </ul>
          </div>
        </div>

        <div className={styles.card} onMouseUp={() => { /* mouseup global deja setat */ }}>
          <div className={styles.calHeader}>
            <button type="button" className={styles.navBtn} onClick={onPrev} aria-label="Mes anterior"><Chevron left/></button>
            <h3 className={styles.monthTitle}>{monthTitle}</h3>
            <button type="button" className={styles.navBtn} onClick={onNext} aria-label="Mes siguiente"><Chevron/></button>
          </div>

          {(dateStart && dateEnd) && (
            <div className={styles.rangeBar}>
              {new Date(dateStart).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' })}
              {' – '}
              {new Date(dateEnd).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' })}
            </div>
          )}

          <div className={styles.weekRow}>{weekLabels.map(d => <span key={d}>{d}</span>)}</div>
          <div className={styles.daysGrid}>
            {monthCells.map(c => c.blank ? (
              <div key={c.key} className={styles.dayBlank}/>
            ) : (
              <div
                key={c.key}
                role="button"
                aria-pressed={selStart && selEnd && c.iso >= selStart && c.iso <= selEnd}
                tabIndex={0}
                className={`${styles.dayCell} ${(selStart && selEnd && c.iso >= selStart && c.iso <= selEnd) ? styles.sel : ''}`}
                onMouseDown={() => onDayMouseDown(c.iso)}
                onMouseEnter={() => onDayMouseEnter(c.iso)}
              >
                <span className={styles.dayNum}>{c.d}</span>
                <div className={styles.dayDots}>
                  {c.dayEvents.slice(0,3).map(ev => (
                    <span key={`${c.iso}-${ev.id}`} className={`${styles.dot} ${ev.tipo === 'personal' ? styles.per : styles.emp}`} />
                  ))}
                  {c.dayEvents.length > 3 && <span className={styles.more}>+{c.dayEvents.length - 3}</span>}
                </div>
              </div>
            ))}
          </div>

          {crowdWarning && <div className={styles.banner}>{crowdWarning}</div>}
        </div>
      </section>

      <section className={styles.requestRow}>
        <div className={styles.tabs}>
          <button type="button" className={`${styles.tab} ${reqType === 'personal' ? styles.tabOn : ''}`} onClick={() => setReqType('personal')}>Personal</button>
          <button type="button" className={`${styles.tab} ${reqType === 'empresa' ? styles.tabOn : ''}`} onClick={() => setReqType('empresa')}>Empresa</button>
        </div>
        <div className={styles.reqInputs}>
          <label>Inicio<input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} /></label>
          <label>Fin<input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} /></label>
          <label className={styles.note}><input type="text" placeholder="Nota (opcional)" value={note} onChange={e => setNote(e.target.value)} /></label>
        </div>
        <button type="button" className={styles.btnPrimary} onClick={submitRequest} disabled={loading}>
          {reqType === 'empresa' ? 'Registrar empresa' : 'Solicitar'}
        </button>
      </section>

      <section className={styles.card}>
        <h4 className={styles.cardTitle}>Actividad {anio}</h4>
        {loading ? <p className={styles.muted}>Cargando…</p> : (
          <ul className={styles.activity}>
            {myEvents.slice().sort((a,b) => new Date(b.start_date) - new Date(a.start_date)).map(ev => (
              <li key={ev.id} className={styles.activityItem}>
                <div className={styles.activityLeft}>
                  <span className={`${styles.stateDot} ${ev.state === 'aprobado' ? styles.ok : ev.state === 'rechazado' ? styles.grey : styles.pending}`}>
                    {ev.state === 'aprobado' ? <Check/> : null}
                  </span>
                  <div>
                    <strong className={styles.kind}>
                      {ev.tipo === 'personal' ? 'Personal' : 'Empresa'}
                    </strong>
                    <span className={styles.range}>
                      {new Date(ev.start_date).toLocaleDateString('es-ES', { day:'2-digit', month:'short' })} – {new Date(ev.end_date).toLocaleDateString('es-ES', { day:'2-digit', month:'short' })}
                    </span>
                  </div>
                </div>
                <div className={styles.activityRight}>
                  <span className={`${styles.badge} ${
                    ev.state === 'aprobado' ? styles.badgeOk :
                    ev.state === 'rechazado' ? styles.badgeGrey : styles.badgePend
                  }`}>{ev.state.toUpperCase()}</span>
                </div>
              </li>
            ))}
            {(myEvents||[]).length === 0 && <li className={styles.muted}>Sin eventos</li>}
          </ul>
        )}
      </section>
    </div>
  );
}