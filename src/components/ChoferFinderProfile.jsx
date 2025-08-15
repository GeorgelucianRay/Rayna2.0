import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './ChoferFinderProfile.module.css';

/* Icons */
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
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
const TruckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 17h4M1 17h2m18 0h2M3 17V7a2 2 0 0 1 2-2h9v12M22 17v-5a2 2 0 0 0-2-2h-4" />
    <circle cx="7.5" cy="17.5" r="1.5" /><circle cx="16.5" cy="17.5" r="1.5" />
  </svg>
);
const TrailerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="8" width="13" height="7" rx="1" />
    <circle cx="8" cy="17" r="1.5" /><circle cx="15" cy="17" r="1.5" />
  </svg>
);
const CalcIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="8" y2="18" /><line x1="12" y1="10" x2="12" y2="18" /><line x1="16" y1="10" x2="16" y2="18" />
  </svg>
);
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export default function ChoferFinderProfile() {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // căutare
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [lastClickedId, setLastClickedId] = useState(null);

  // profil selectat
  const [selectedId, setSelectedId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileBusy, setProfileBusy] = useState(false);

  /* Căutare tolerantă la ordine */
  useEffect(() => {
    let cancel = false;
    const t = setTimeout(async () => {
      const term = q.trim();
      if (!term) {
        if (!cancel) { setRows([]); setHi(-1); setOpen(false); }
        return;
      }
      setLoading(true);
      try {
        const words = term.split(/\s+/).filter(Boolean);
        let query = supabase
          .from('profiles')
          .select(`
            id, nombre_completo,
            camion_id, remorca_id,
            camioane:camion_id(matricula),
            remorci:remorca_id(matricula)
          `)
          .eq('role', 'sofer');

        if (words.length) {
          const orFilter = words.map(w => `nombre_completo.ilike.%${w}%`).join(',');
          query = query.or(orFilter);
        }

        const { data, error } = await query
          .order('nombre_completo', { ascending: true })
          .limit(12);

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

  /* Încarcă profilul complet jos (fără coloane inexistente) */
  const loadProfile = async (id) => {
    if (!id) return;
    setProfileBusy(true);
    setProfile(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, nombre_completo, cap_expirare, carnet_caducidad, tiene_adr, adr_caducidad,
          camion_id, remorca_id,
          camioane:camion_id(id, matricula),
          remorci:remorca_id(id, matricula)
        `)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      setProfile(data || null);
    } catch (e) {
      console.error('Load profile error:', e.message);
      setProfile(null);
    } finally {
      setProfileBusy(false);
    }
  };

  const onPick = (id) => {
    setLastClickedId(id);
    setSelectedId(id);
    setOpen(false);
    loadProfile(id);
  };

  /* Keyboard nav */
  const onKeyDown = (e) => {
    if (!open || !rows.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setHi(p => Math.min(p + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setHi(p => Math.max(p - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hi >= 0 && hi < rows.length) onPick(rows[hi].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // închidere dropdown la blur
  const blurTimer = useRef(null);
  const handleBlur = () => { blurTimer.current = setTimeout(() => setOpen(false), 120); };
  const handleFocus = () => { if (blurTimer.current) clearTimeout(blurTimer.current); if (rows.length) setOpen(true); };

  /* Acțiuni rapide – folosesc ID-urile din join */
  const goCamion = () => profile?.camioane?.id && navigate(`/camion/${profile.camioane.id}`);
  const goRemorca = () => profile?.remorci?.id && navigate(`/remorca/${profile.remorci.id}`);
  const goNomina = () => selectedId && navigate(`/calculadora-nomina?user_id=${encodeURIComponent(selectedId)}`);
  const goVacacionesAdmin = () => selectedId && navigate(`/vacaciones-admin/${encodeURIComponent(selectedId)}`);

  const highlightedId = useMemo(
    () => (hi >= 0 && hi < rows.length) ? rows[hi]?.id : lastClickedId,
    [hi, rows, lastClickedId]
  );

  return (
    <Layout>
      <div className={styles.page}>
        <header className={styles.header}>
          <h1><UsersIcon /> Buscar chófer</h1>
          <div className={styles.actions}>
            <button className={styles.btn} disabled={!selectedId} onClick={goNomina}>
              <CalcIcon /> Nómina
            </button>
            <button className={styles.btnAccent} disabled={!selectedId} onClick={goVacacionesAdmin}>
              <CalendarIcon /> Vacaciones (admin)
            </button>
          </div>
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
                  onClick={() => onPick(r.id)}
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

        {/* Profil jos */}
        <section className={styles.profilePanel}>
          {!selectedId ? (
            <p className={styles.hint}>Selectează un chófer din căutare pentru a-i vedea detaliile aici.</p>
          ) : profileBusy ? (
            <div className={styles.card}><p>Cargando perfil…</p></div>
          ) : !profile ? (
            <div className={styles.card}><p>No se pudo cargar el perfil.</p></div>
          ) : (
            <div className={styles.grid}>
              <div className={styles.card}>
                <h3>Conductor</h3>
                <div className={styles.kv}><span className={styles.k}>Nombre</span><span className={styles.v}>{profile.nombre_completo || '—'}</span></div>
                <div className={styles.kv}><span className={styles.k}>CAP</span><span className={styles.v}>{profile.cap_expirare || '—'}</span></div>
                <div className={styles.kv}><span className={styles.k}>Carnet</span><span className={styles.v}>{profile.carnet_caducidad || '—'}</span></div>
                <div className={styles.kv}><span className={styles.k}>ADR</span><span className={styles.v}>{profile.tiene_adr ? (`Sí — ${profile.adr_caducidad || 'N/A'}`) : 'No'}</span></div>
              </div>

              <div className={styles.card}>
                <div className={styles.rowHeader}>
                  <h3>Camión</h3>
                  <button className={styles.ghost} disabled={!profile.camioane?.id} onClick={goCamion}><TruckIcon/> Ver ficha</button>
                </div>
                <div className={styles.kv}><span className={styles.k}>Matrícula</span><span className={styles.v}>{profile.camioane?.matricula || '—'}</span></div>
                {/* Dacă vei avea o coloană ITV în viitor, o poți adăuga aici */}
              </div>

              <div className={styles.card}>
                <div className={styles.rowHeader}>
                  <h3>Remolque</h3>
                  <button className={styles.ghost} disabled={!profile.remorci?.id} onClick={goRemorca}><TrailerIcon/> Ver ficha</button>
                </div>
                <div className={styles.kv}><span className={styles.k}>Matrícula</span><span className={styles.v}>{profile.remorci?.matricula || '—'}</span></div>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}