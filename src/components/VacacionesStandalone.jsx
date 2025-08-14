import React, { useMemo, useState } from 'react';
import styles from './VacacionesStandalone.module.css';
import { useAuth } from '../AuthContext';

/* ——— iconițe mici ——— */
const Chevron = ({ left }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {left ? <polyline points="15 18 9 12 15 6"></polyline> : <polyline points="9 18 15 12 9 6"></polyline>}
  </svg>
);
const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const Dot = ({ className }) => <span className={`${styles.dot} ${className || ''}`} />;

/* ——— date mock (înlocuiești cu Supabase) ——— */
const MOCK_COMPANY_DAYS = [
  { id: 'emp-1', title: 'Navidad (empresa)', start: '2025-12-24', end: '2025-12-26', type: 'empresa' },
  { id: 'emp-2', title: 'Fin de año (empresa)', start: '2025-12-31', end: '2026-01-02', type: 'empresa' },
];

const MOCK_EVENTS = [
  { id: 'v1', type: 'vacacion', start: '2025-07-12', end: '2025-07-16', state: 'aprobado', by: 'María' },
  { id: 'p1', type: 'personal', start: '2025-08-05', end: '2025-08-05', state: 'aprobado' },
  { id: 'v2', type: 'vacacion', start: '2025-08-14', end: '2025-08-16', state: 'aprobado' },
  { id: 'r1', type: 'vacacion', start: '2025-08-25', end: '2025-08-26', state: 'pendiente' },
];

function fmt(d){ return new Date(d).toISOString().slice(0,10); }
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function daysBetween(a,b){ const A=new Date(fmt(a)), B=new Date(fmt(b)); return Math.floor((B-A)/(1000*60*60*24))+1; }
function overlaps(a1,a2,b1,b2){ return new Date(a1) <= new Date(b2) && new Date(b1) <= new Date(a2); }

export default function VacacionesStandalone(){
  const { profile } = useAuth() || {};
  const role = String(profile?.role || '').toLowerCase(); // 'sofer' | 'dispecer' | 'admin'
  const canModerate = role === 'dispecer' || role === 'admin';

  // stări principale (mock)
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [available, setAvailable] = useState({ total: 23, carry: 5 }); // TODO: fetch din profil/an
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [company, setCompany] = useState(MOCK_COMPANY_DAYS);

  // formular solicitare
  const [reqType, setReqType] = useState('vacacion'); // 'vacacion' | 'personal'
  const [dateStart, setDateStart] = useState(fmt(new Date()));
  const [dateEnd, setDateEnd] = useState(fmt(addDays(new Date(), 1)));
  const [note, setNote] = useState('');

  const monthDate = useMemo(() => new Date(year, month, 1), [year, month]);
  const monthTitle = useMemo(
    () => monthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\p{L}/u, c => c.toUpperCase()),
    [monthDate]
  );

  const monthCells = useMemo(() => {
    const firstIdx = (new Date(year, month, 1).getDay() + 6) % 7; // L=0..D=6
    const count = new Date(year, month+1, 0).getDate();
    const cells = [];
    for (let i=0;i<firstIdx;i++) cells.push({ key:`b-${i}`, blank:true });
    for (let d=1; d<=count; d++){
      const iso = fmt(new Date(year, month, d));
      const dayEvents = [
        ...events.filter(e => overlaps(e.start, e.end, iso, iso)),
        ...company.filter(e => overlaps(e.start, e.end, iso, iso)),
      ];
      cells.push({ key:`d-${d}`, d, iso, dayEvents });
    }
    return cells;
  }, [year, month, events, company]);

  const usedDays = useMemo(
    () => events.filter(e=>e.state==='aprobado').reduce((s,e)=>s+daysBetween(e.start,e.end),0),
    [events]
  );
  const leftDays = Math.max(available.total - usedDays, 0);

  const overlapBanner = useMemo(() => {
    const hit = events.find(e => e.state==='aprobado' && overlaps(e.start, e.end, dateStart, dateEnd));
    if (!hit) return null;
    const s = new Date(hit.start).toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
    const e = new Date(hit.end).toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
    return `Se solapa con ${s} – ${e} (aprobado)`;
  }, [events, dateStart, dateEnd]);

  function onPrev(){ setMonth(m => (m===0 ? 11 : m-1)); if (month===0) setYear(y=>y-1); }
  function onNext(){ setMonth(m => (m===11? 0 : m+1)); if (month===11) setYear(y=>y+1); }

  // acțiuni
  function submitRequest(){
    // TODO: insert în supabase (vacaciones_events)
    setEvents(prev => [...prev, {
      id: `tmp-${Date.now()}`,
      type: reqType, start: dateStart, end: dateEnd, state: 'pendiente', by: 'Yo', note
    }]);
    setNote('');
    alert('Solicitud enviada.');
  }
  function approve(id){ if (!canModerate) return; setEvents(prev => prev.map(e => e.id===id ? {...e, state:'aprobado'} : e)); }
  function deny(id){ if (!canModerate) return; setEvents(prev => prev.filter(e => e.id!==id)); }

  // donut calc
  const donut = useMemo(()=>{
    const total = Math.max(available.total, 1);
    const arc = 314 * (leftDays / total); // 2πr, r≈50
    return { total, left:leftDays, used:available.total-leftDays, arc: Math.max(0, arc) };
  }, [available, leftDays]);

  return (
    <div className={styles.vacWrap}>
      {/* titlu intern */}
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Vacaciones</h2>
        <button className={styles.todayBtn} onClick={()=>{ setYear(new Date().getFullYear()); setMonth(new Date().getMonth()); }}>
          Hoy
        </button>
      </div>

      {/* stats */}
      <div className={styles.statsRow}>
        <div className={styles.stat}><span>Disponibles</span><strong>{leftDays}</strong></div>
        <div className={styles.stat}><span>Pendientes</span><strong>{events.filter(e=>e.state==='pendiente').length}</strong></div>
        <div className={styles.stat}><span>Aprobadas este año</span><strong>{donut.used}</strong></div>
      </div>

      {/* grid principal */}
      <div className={styles.grid}>
        {/* stânga: donut + legendă */}
        <div className={styles.card}>
          <div className={styles.donutBox}>
            <svg className={styles.donut} viewBox="0 0 120 120">
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
        <div className={styles.card}>
          <div className={styles.calHeader}>
            <button className={styles.iconBtn} onClick={onPrev}><Chevron left/></button>
            <h3 className={styles.monthTitle}>{monthTitle}</h3>
            <button className={styles.iconBtn} onClick={onNext}><Chevron/></button>
          </div>
          <div className={styles.weekRow}>{['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><span key={d}>{d}</span>)}</div>
          <div className={styles.daysGrid}>
            {monthCells.map(c => c.blank ? (
              <div key={c.key} className={styles.dayBlank}/>
            ) : (
              <div key={c.key} className={styles.dayCell}>
                <span className={styles.dayNum}>{c.d}</span>
                <div className={styles.dayDots}>
                  {c.dayEvents.slice(0,3).map(ev => (
                    <span key={`${c.iso}-${ev.id}`} className={`${styles.dot} ${
                      ev.type==='vacacion'?styles.vac: ev.type==='personal'?styles.per : ev.type==='empresa'?styles.emp : styles.car
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
          <button className={`${styles.tab} ${reqType==='vacacion'?styles.tabOn:''}`} onClick={()=>setReqType('vacacion')}>Vacación</button>
          <button className={`${styles.tab} ${reqType==='personal'?styles.tabOn:''}`} onClick={()=>setReqType('personal')}>Personal</button>
        </div>
        <div className={styles.reqInputs}>
          <label>Inicio<input type="date" value={dateStart} onChange={e=>setDateStart(e.target.value)} /></label>
          <label>Fin<input type="date" value={dateEnd} onChange={e=>setDateEnd(e.target.value)} /></label>
          <label className={styles.note}><input type="text" placeholder="Nota (opcional)" value={note} onChange={e=>setNote(e.target.value)} /></label>
        </div>
        <button className={styles.primary} onClick={submitRequest}>Solicitar</button>
      </div>

      {/* activitate & zile de firmă */}
      <div className={styles.bottom}>
        <div className={styles.card}>
          <h4 className={styles.cardTitle}>Actividad</h4>
          <ul className={styles.activity}>
            {events.slice().sort((a,b)=>new Date(b.start)-new Date(a.start)).map(ev => (
              <li key={ev.id} className={styles.activityItem}>
                <div className={styles.activityLeft}>
                  <span className={`${styles.stateDot} ${ev.state==='aprobado'?styles.ok:styles.pending}`}>{ev.state==='aprobado'?<Check/>:null}</span>
                  <div>
                    <strong className={styles.kind}>
                      {ev.type==='vacacion'?'Vacación':ev.type==='personal'?'Personal':ev.type}
                    </strong>
                    <span className={styles.range}>
                      {new Date(ev.start).toLocaleDateString('es-ES',{day:'2-digit',month:'short'})} – {new Date(ev.end).toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}
                    </span>
                    {ev.by && <span className={styles.by}> · por {ev.by}</span>}
                  </div>
                </div>
                <div className={styles.activityRight}>
                  <span className={`${styles.badge} ${ev.state==='aprobado'?styles.badgeOk:styles.badgePend}`}>{ev.state.toUpperCase()}</span>
                  {canModerate && ev.state==='pendiente' && (
                    <div className={styles.mod}>
                      <button onClick={()=>approve(ev.id)} className={styles.smallOk}>Aprobar</button>
                      <button onClick={()=>deny(ev.id)} className={styles.smallGhost}>Rechazar</button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.card}>
          <h4 className={styles.cardTitle}>Vacaciones de empresa</h4>
          <ul className={styles.holidays}>
            {company.map(h => (
              <li key={h.id} className={styles.holidayItem}>
                <Dot className={styles.emp}/> {h.title}
                <span className={styles.holidayRange}>
                  {new Date(h.start).toLocaleDateString('es-ES',{day:'2-digit',month:'short'})} – {new Date(h.end).toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
