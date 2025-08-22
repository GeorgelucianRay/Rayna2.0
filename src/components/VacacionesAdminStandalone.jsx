// VacacionesAdminGlobal.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import styles from './VacacionesAdmin.module.css'; // poți refolosi același CSS
// Dacă vrei separat, creează un fișier CSS nou și ajustează numele claselor.

const PALETTE = [
  '#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd',
  '#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf'
];

/* ---------- helpers fecha ---------- */
function toLocalISO(date = new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}
function fmt(d) { // YYYY-MM-DD
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

export default function VacacionesAdminGlobal() {
  const { profile } = useAuth();
  const canEdit = ['admin','dispecer','dispatcher'].includes(String(profile?.role||'').toLowerCase());

  /* ----- estado principal ----- */
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [params, setParams] = useState({
    dias_base: 23,
    dias_personales: 2,
    dias_pueblo: 0,
    max_simultaneous: 3,           // limită simultană pentru avertizare
    dias_totales_por_defecto: 25,  // nou: total global (rapid)
  });

  const [loading, setLoading] = useState(true);
  const [errorDb, setErrorDb] = useState('');

  /* ----- datos globales ----- */
  const [drivers, setDrivers] = useState([]); // {id, nombre_completo}
  const [eventsAll, setEventsAll] = useState([]); // evenimente pt toți userii afectați în anul curent

  /* ----- panel verificación/colores ----- */
  const [verifOpen, setVerifOpen] = useState(false);
  const [verifMonth, setVerifMonth] = useState(new Date().getMonth());
  const [verifColors, setVerifColors] = useState({}); // user_id -> color
  const [verifDriverIds, setVerifDriverIds] = useState([]); // driv. implicați pe luna curentă

  /* ----- empresa rápido ----- */
  const [empresaFrom, setEmpresaFrom] = useState(toLocalISO());
  const [empresaTo, setEmpresaTo] = useState(toLocalISO());
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]); // results din search
  const [selectedDrivers, setSelectedDrivers] = useState([]); // [{id,nombre_completo}]

  /* ---------- cargar parámetros + chóferes + eventos ---------- */
  const load = useCallback(async () => {
    setLoading(true);
    setErrorDb('');
    try {
      // 1) parámetros del año
      const { data: cfg } = await supabase
        .from('vacaciones_parametros_anio')
        .select('*')
        .eq('anio', anio)
        .maybeSingle();

      setParams(p => ({
        ...p,
        dias_base: cfg?.dias_base ?? 23,
        dias_personales: cfg?.dias_personales ?? 2,
        dias_pueblo: cfg?.dias_pueblo ?? 0,
        max_simultaneous: cfg?.max_simultaneous ?? 3,
        dias_totales_por_defecto: (cfg?.dias_totales_por_defecto ?? (cfg ? (cfg.dias_base||0)+(cfg.dias_personales||0)+(cfg.dias_pueblo||0) : 25))
      }));

      // 2) chóferes
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, nombre_completo')
        .order('nombre_completo', { ascending: true });

      setDrivers(profs || []);

      // 3) eventos del año (todos los usuarios)
      const yearStart = `${anio}-01-01`;
      const yearEnd = `${anio}-12-31`;
      const { data: ev } = await supabase
        .from('vacaciones_eventos')
        .select('id,user_id,tipo,state,start_date,end_date,notas,created_by')
        .or(`and(start_date.lte.${yearEnd},end_date.gte.${yearStart})`)
        .order('start_date', { ascending: true });

      setEventsAll(ev || []);
    } catch (e) {
      console.warn('[VacacionesAdminGlobal] load:', e);
      setErrorDb(e.message || 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, [anio]);

  useEffect(() => { load(); }, [load]);

  /* ---------- guardar parámetros ---------- */
  const saveParams = async () => {
    if (!canEdit) return;
    const payload = {
      anio,
      dias_base: Number(params.dias_base)||0,
      dias_personales: Number(params.dias_personales)||0,
      dias_pueblo: Number(params.dias_pueblo)||0,
      max_simultaneous: Number(params.max_simultaneous)||1,
      dias_totales_por_defecto: Number(params.dias_totales_por_defecto)||0
    };
    const { error } = await supabase.from('vacaciones_parametros_anio').upsert(payload, { onConflict: 'anio' });
    if (error) return alert('No se pudo guardar parámetros.');
    alert('Parámetros guardados.');
    await load();
  };

  /* ---------- aplicar total global rapid (ex: 25) ---------- */
  // Asta setează baza astfel încât totalul (base+personales+pueblo) == dias_totales_por_defecto
  const aplicarTotalGlobal = async () => {
    if (!canEdit) return;
    const total = Number(params.dias_totales_por_defecto)||0;
    if (total <= 0) return alert('Introduce un total válido.');
    // Strategie simplă: setăm base=total, personales=0, pueblo=0
    const payload = {
      anio,
      dias_base: total,
      dias_personales: 0,
      dias_pueblo: 0,
      max_simultaneous: Number(params.max_simultaneous)||1,
      dias_totales_por_defecto: total
    };
    const { error } = await supabase.from('vacaciones_parametros_anio').upsert(payload, { onConflict: 'anio' });
    if (error) return alert('No se pudo aplicar el total global.');
    alert(`Total global aplicado: ${total} días para ${anio}.`);
    await load();
  };

  /* ---------- búsqueda chóferes (empresa rápido) ---------- */
  const searchDrivers = useCallback(async (term) => {
    setSearchTerm(term);
    if (!term || term.trim().length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id,nombre_completo')
      .ilike('nombre_completo', `%${term.trim()}%`)
      .limit(20);
    // elimină pe cei deja selectați
    const selectedIds = new Set(selectedDrivers.map(d => d.id));
    setSearchResults((data || []).filter(d => !selectedIds.has(d.id)));
  }, [selectedDrivers]);

  const addSelected = (drv) => {
    if (!drv) return;
    if (selectedDrivers.find(d => d.id === drv.id)) return;
    setSelectedDrivers(prev => [...prev, drv]);
    setSearchResults(results => results.filter(r => r.id !== drv.id));
  };
  const removeSelected = (id) => {
    setSelectedDrivers(prev => prev.filter(d => d.id !== id));
  };

  /* ---------- crear vacaciones de empresa (masivo) ---------- */
  const crearEmpresaMasivo = async () => {
    if (!canEdit) return;
    const d1 = new Date(empresaFrom), d2 = new Date(empresaTo);
    if (isNaN(d1) || isNaN(d2) || d2 < d1) return alert('Rango de fechas inválido.');
    if (selectedDrivers.length === 0) return alert('Selecciona al menos un chófer.');
    const payloads = selectedDrivers.map(drv => ({
      user_id: drv.id,
      tipo: 'empresa',
      state: 'aprobado',
      start_date: empresaFrom,
      end_date: empresaTo,
      notas: 'Vacaciones de empresa',
      created_by: profile?.id || null
    }));
    const { error } = await supabase.from('vacaciones_eventos').insert(payloads);
    if (error) return alert('No se pudieron crear los eventos.');
    alert(`Vacaciones de empresa creadas para ${selectedDrivers.length} chófer(es).`);
    setSelectedDrivers([]);
    await load();
  };

  /* ---------- verificación de solapamientos (global) ---------- */
  // Construim o hartă zi -> set de user_id care au evenimente (pendiente/aprobado) în ziua respectivă
  const dayMap = useMemo(() => {
    const map = new Map(); // ISO -> Set<user_id>
    (eventsAll || []).forEach(ev => {
      if (ev.state === 'rechazado') return;
      for (const iso of iterateDates(ev.start_date, ev.end_date)) {
        const y = new Date(iso).getFullYear();
        if (y !== anio) continue;
        if (!map.has(iso)) map.set(iso, new Set());
        map.get(iso).add(ev.user_id);
      }
    });
    return map;
  }, [eventsAll, anio]);

  const conflictDays = useMemo(() => {
    const limit = Number(params.max_simultaneous)||1;
    const arr = [];
    for (const [iso, setIds] of dayMap.entries()) {
      if (setIds.size >= limit) {
        arr.push({ iso, count: setIds.size, userIds: [...setIds] });
      }
    }
    // sort by date asc
    return arr.sort((a,b) => new Date(a.iso) - new Date(b.iso));
  }, [dayMap, params.max_simultaneous]);

  // Deschide panelul cu calendar colorat pentru luna curentă (verifMonth)
  const openVerif = () => {
    // găsește toți userii implicați în luna curentă
    const yearMonth = `${anio}-${String(verifMonth+1).padStart(2,'0')}`;
    const ids = new Set();
    for (const [iso, setIds] of dayMap.entries()) {
      if (iso.startsWith(yearMonth)) setIds.forEach(id => ids.add(id));
    }
    const involved = [...ids].slice(0, PALETTE.length); // max 10
    // atribuie culori stabile
    const mapColors = {};
    involved.forEach((uid, idx) => { mapColors[uid] = PALETTE[idx]; });
    setVerifColors(mapColors);
    setVerifDriverIds(involved);
    setVerifOpen(true);
  };

  const closeVerif = () => setVerifOpen(false);

  /* ---------- calendarul de verificare (o lună) ---------- */
  const verifMonthDate = useMemo(() => new Date(anio, verifMonth, 1), [anio, verifMonth]);
  const verifCells = useMemo(() => {
    const y = anio, m = verifMonth;
    const firstIdx = (new Date(y, m, 1).getDay() + 6) % 7; // luni=0
    const count = new Date(y, m+1, 0).getDate();
    const cells = [];
    for (let i=0; i<firstIdx; i++) cells.push({ key:`b-${i}`, blank:true });
    for (let d=1; d<=count; d++) {
      const iso = fmt(new Date(y, m, d));
      const setIds = dayMap.get(iso) || new Set();
      const ids = [...setIds].filter(id => verifDriverIds.includes(id)).slice(0, PALETTE.length);
      cells.push({ key:`d-${d}`, d, iso, ids });
    }
    return cells;
  }, [anio, verifMonth, dayMap, verifDriverIds]);

  const monthTitle = useMemo(() => monthLabel(verifMonthDate), [verifMonthDate]);

  const nextMonth = () => setVerifMonth(m => (m===11?0:m+1));
  const prevMonth = () => setVerifMonth(m => (m===0?11:m-1));

  /* ---------- util: nume drivere ---------- */
  const nameOf = (uid) => drivers.find(d => d.id === uid)?.nombre_completo || '—';

  /* ---------- UI ---------- */
  return (
    <div className={styles.card} style={{ padding: 20 }}>
      <h1 style={{ marginTop: 0 }}>Vacaciones — Administración Global</h1>

      {errorDb && <p className={styles.errorLine}>⚠️ {errorDb}</p>}

      <div className={styles.grid3} style={{ marginTop: 16 }}>
        <div className={styles.inputGroup}>
          <label>Año</label>
          <select
            value={anio}
            onChange={e => setAnio(Number(e.target.value))}
          >
            {[anio-1, anio, anio+1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label>Máx. simultáneos por día</label>
          <input
            type="number"
            min={1}
            max={10}
            value={params.max_simultaneous}
            onChange={e => setParams(p => ({ ...p, max_simultaneous: +e.target.value || 1 }))}
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Días totales por defecto</label>
          <input
            type="number"
            min={0}
            value={params.dias_totales_por_defecto}
            onChange={e => setParams(p => ({ ...p, dias_totales_por_defecto: +e.target.value || 0 }))}
          />
        </div>
      </div>

      <div className={styles.grid3} style={{ marginTop: 10 }}>
        <div className={styles.inputGroup}>
          <label>Días base</label>
          <input
            type="number"
            value={params.dias_base}
            onChange={e => setParams(p => ({ ...p, dias_base: +e.target.value || 0 }))}
          />
        </div>
        <div className={styles.inputGroup}>
          <label>Personales</label>
          <input
            type="number"
            value={params.dias_personales}
            onChange={e => setParams(p => ({ ...p, dias_personales: +e.target.value || 0 }))}
          />
        </div>
        <div className={styles.inputGroup}>
          <label>Fiesta de pueblo</label>
          <input
            type="number"
            value={params.dias_pueblo}
            onChange={e => setParams(p => ({ ...p, dias_pueblo: +e.target.value || 0 }))}
          />
        </div>
      </div>

      {canEdit && (
        <div className={styles.row} style={{ gap: 10, marginTop: 10 }}>
          <button type="button" className={styles.primary} onClick={saveParams} disabled={loading}>
            Guardar parámetros
          </button>
          <button type="button" className={styles.ghost} onClick={aplicarTotalGlobal} disabled={loading}>
            Aplicar total global (rápido)
          </button>
        </div>
      )}

      {/* ---- Verificación de solapamientos ---- */}
      <div className={styles.card} style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Verificación de solapamientos ({anio})</h3>
        <p className={styles.hint}>
          Si en un mismo día hay <b>{params.max_simultaneous}</b> o más chóferes con vacaciones,
          aparecerá en la lista. Abre el calendario para ver colores por chófer (máx. 10).
        </p>
        {loading ? <p>Cargando…</p> : (
          <>
            {conflictDays.length === 0 ? (
              <p>No hay días con el límite alcanzado.</p>
            ) : (
              <ul className={styles.activity} style={{ maxHeight: 220, overflow: 'auto' }}>
                {conflictDays.map(d => (
                  <li key={d.iso} className={styles.activityItem}>
                    <div>
                      <strong>{new Date(d.iso).toLocaleDateString('es-ES', { day:'2-digit', month:'short' })}</strong>
                      <span style={{ marginLeft: 8 }}>
                        — {d.count} chóferes: {d.userIds.slice(0,5).map(nameOf).join(', ')}{d.userIds.length>5?'…':''}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.row} style={{ gap: 10, marginTop: 10 }}>
              <label>Mes</label>
              <select value={verifMonth} onChange={e => setVerifMonth(+e.target.value)}>
                {Array.from({length:12},(_,i)=>i).map(i => (
                  <option value={i} key={i}>
                    {new Date(2000,i,1).toLocaleDateString('es-ES',{month:'long'}).replace(/^\p{L}/u,c=>c.toUpperCase())}
                  </option>
                ))}
              </select>
              <button type="button" className={styles.primary} onClick={openVerif}>Verificar solapamientos</button>
            </div>
          </>
        )}
      </div>

      {/* ---- Vacaciones de empresa (rápido) ---- */}
      <div className={styles.card} style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Vacaciones de empresa — Asignación rápida</h3>
        <div className={styles.grid3}>
          <div className={styles.inputGroup}>
            <label>Inicio</label>
            <input type="date" value={empresaFrom} onChange={e => setEmpresaFrom(e.target.value)} />
          </div>
          <div className={styles.inputGroup}>
            <label>Fin</label>
            <input type="date" value={empresaTo} onChange={e => setEmpresaTo(e.target.value)} />
          </div>
          <div className={styles.inputGroup}>
            <label>Buscar chófer</label>
            <input
              type="text"
              placeholder="Nombre…"
              value={searchTerm}
              onChange={e => searchDrivers(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className={styles.dropdown}>
                {searchResults.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => addSelected(d)}
                  >
                    {d.nombre_completo}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedDrivers.length > 0 && (
          <>
            <div className={styles.legend} style={{ marginTop: 8 }}>
              <b>Seleccionados:</b>
              <ul>
                {selectedDrivers.map(d => (
                  <li key={d.id}>
                    {d.nombre_completo}
                    <button type="button" className={styles.smallGhost} onClick={() => removeSelected(d.id)} style={{ marginLeft: 8 }}>
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <button type="button" className={styles.primary} onClick={crearEmpresaMasivo} disabled={loading}>
              Crear vacaciones de empresa
            </button>
          </>
        )}
      </div>

      {/* ---- Overlay verificare calendar colorat ---- */}
      {verifOpen && (
        <div className={styles.modalOverlay} onClick={closeVerif}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <button type="button" onClick={prevMonth} aria-label="Mes anterior">◀</button>
              <h3>{monthTitle}</h3>
              <button type="button" onClick={nextMonth} aria-label="Mes siguiente">▶</button>
            </div>

            <div className={styles.weekRow}>
              {['Lu','Ma','Mi','Ju','Vi','Sa','Do'].map(d => <span key={d}>{d}</span>)}
            </div>

            <div className={styles.daysGrid}>
              {verifCells.map(c => c.blank ? (
                <div key={c.key} className={styles.dayBlank}/>
              ) : (
                <div key={c.key} className={styles.dayCell}>
                  <span className={styles.dayNum}>{c.d}</span>
                  <div className={styles.dayDots}>
                    {c.ids.map(uid => {
                      const color = verifColors[uid] || '#999';
                      return (
                        <span
                          key={`${c.key}-${uid}`}
                          title={nameOf(uid)}
                          style={{
                            display:'inline-block',
                            width:8,height:8,borderRadius:'50%',
                            marginRight:3, backgroundColor: color
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.legend} style={{ marginTop: 10 }}>
              <b>Leyenda (máx. 10):</b>
              <ul>
                {verifDriverIds.map((uid, idx) => (
                  <li key={uid} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:10, height:10, borderRadius:'50%', backgroundColor: PALETTE[idx] }} />
                    <span>{nameOf(uid)}</span>
                  </li>
                ))}
                {verifDriverIds.length === 0 && <li>— Sin conductores en este mes —</li>}
              </ul>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.ghost} onClick={closeVerif}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}