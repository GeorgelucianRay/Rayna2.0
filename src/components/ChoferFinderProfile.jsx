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

export default function ChoferFinderProfile() {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);

  const [profile, setProfile] = useState(null); // profilul încărcat jos
  const [busyProfile, setBusyProfile] = useState(false);

  /* ---- Căutare cu AND pe cuvinte (ex: "Lucian George") ---- */
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const term = q.trim();
      if (!term) {
        if (!cancelled) { setRows([]); setOpen(false); setHi(-1); }
        return;
      }
      setLoading(true);
      try {
        const tokens = term.split(/\s+/).filter(Boolean);

        let query = supabase
          .from('profiles')
          .select('id, nombre_completo, camion_id, remorca_id')
          .eq('role', 'sofer')
          .order('nombre_completo', { ascending: true })
          .limit(12);

        // AND pe fiecare token
        tokens.forEach(tok => {
          query = query.ilike('nombre_completo', `%${tok}%`);
        });

        const { data, error } = await query;
        if (error) throw error;

        if (!cancelled) {
          setRows(data || []);
          setOpen(true);
          setHi(data && data.length ? 0 : -1);
        }
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          setOpen(true);
          setHi(-1);
        }
        console.warn('Search error:', e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  /* ---- Încarcă profilul complet în pagină ---- */
  const loadProfile = async (id) => {
    setBusyProfile(true);
    try {
      // 1) profilul basic
      const { data: p, error: e1 } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (e1) throw e1;
      // 2) camion
      let camion = null;
      if (p?.camion_id) {
        const { data: c } = await supabase
          .from('camioane')
          .select('*')
          .eq('id', p.camion_id)
          .maybeSingle();
        camion = c || null;
      }
      // 3) remorcă
      let remorca = null;
      if (p?.remorca_id) {
        const { data: r } = await supabase
          .from('remorci')
          .select('*')
          .eq('id', p.remorca_id)
          .maybeSingle();
        remorca = r || null;
      }

      setProfile({ ...p, camion, remorca });
    } catch (e) {
      console.error('Profile load error:', e.message);
      setProfile({ __error: 'No se pudo cargar el perfil.' });
    } finally {
      setBusyProfile(false);
    }
  };

  /* ---- Handlere UI ---- */
  const onKeyDown = (e) => {
    if (!open || !rows.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(p => Math.min(p + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(p => Math.max(p - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (hi >= 0 && hi < rows.length) loadProfile(rows[hi].id);
    } else if (e.key === 'Escape') setOpen(false);
  };

  const blurTimer = useRef(null);
  const handleBlur = () => { blurTimer.current = setTimeout(() => setOpen(false), 120); };
  const handleFocus = () => { if (blurTimer.current) clearTimeout(blurTimer.current); if (rows.length) setOpen(true); };

  /* ---- Acțiuni ---- */
  const abrirVistaCompleta = () => profile?.id && navigate(`/chofer/${profile.id}`);
  const abrirVacacionesAdmin = () => profile?.id && navigate(`/vacaciones-admin/${profile.id}`);
  const abrirNomina = () => profile?.id && navigate(`/calculadora-nomina?user_id=${encodeURIComponent(profile.id)}`);

  return (
    <Layout>
      <div className={styles.page}>
        <header className={styles.header}>
          <h1><UsersIcon /> Buscar chófer</h1>
          <div className={styles.actions}>
            <button className={styles.btn} onClick={abrirVistaCompleta} disabled={!profile?.id}>Abrir vista completa</button>
            <button className={styles.btn} onClick={abrirNomina} disabled={!profile?.id}>Calculadora Nómina</button>
            <button className={styles.btnAccent} onClick={abrirVacacionesAdmin} disabled={!profile?.id}>Vacaciones (admin)</button>
          </div>
        </header>

        {/* Căutare */}
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
                  onClick={() => loadProfile(r.id)}
                  onMouseEnter={() => setHi(idx)}
                >
                  <div className={styles.itemTitle}>{r.nombre_completo}</div>
                  <div className={styles.meta}>
                    <span>ID: <b>{r.id.slice(0,8)}…</b></span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Panoul de profil */}
        <div className={styles.profilePanel}>
          {!profile && (
            <p className={styles.hint}>Caută un nume și alege din listă — profilul complet se afișează mai jos.</p>
          )}

          {busyProfile && <p className={styles.hint}>Se încarcă profilul…</p>}

          {profile && !busyProfile && profile.__error && (
            <p className={styles.hint}>{profile.__error}</p>
          )}

          {profile && !busyProfile && !profile.__error && (
            <div className={styles.grid}>
              {/* Card: Conductor */}
              <div className={styles.card}>
                <div className={styles.rowHeader}><h3>Conductor</h3></div>
                <div className={styles.kv}><span className={styles.k}>Nombre completo</span><span className={styles.v}>{profile.nombre_completo || '—'}</span></div>
                <div className={styles.kv}><span className={styles.k}>CAP</span><span className={styles.v}>{profile.cap_expirare || '—'}</span></div>
                <div className={styles.kv}><span className={styles.k}>Carnet</span><span className={styles.v}>{profile.carnet_caducidad || '—'}</span></div>
                <div className={styles.kv}><span className={styles.k}>ADR</span><span className={styles.v}>{profile.tiene_adr ? (profile.adr_caducidad || 'Sí') : 'No'}</span></div>
              </div>

              {/* Card: Camión */}
              <div className={styles.card}>
                <div className={styles.rowHeader}>
                  <h3>Camión</h3>
                  {profile.camion?.id && (
                    <button className={styles.ghost} onClick={()=>navigate(`/camion/${profile.camion.id}`)}>Ver ficha</button>
                  )}
                </div>
                <div className={styles.kv}><span className={styles.k}>Matrícula</span><span className={styles.v}>{profile.camion?.matricula || 'No asignado'}</span></div>
                <div className={styles.kv}><span className={styles.k}>ITV</span><span className={styles.v}>{profile.camion?.itv || '—'}</span></div>
              </div>

              {/* Card: Remolque */}
              <div className={styles.card}>
                <div className={styles.rowHeader}>
                  <h3>Remolque</h3>
                  {profile.remorca?.id && (
                    <button className={styles.ghost} onClick={()=>navigate(`/remorca/${profile.remorca.id}`)}>Ver ficha</button>
                  )}
                </div>
                <div className={styles.kv}><span className={styles.k}>Matrícula</span><span className={styles.v}>{profile.remorca?.matricula || 'No asignado'}</span></div>
                <div className={styles.kv}><span className={styles.k}>ITV</span><span className={styles.v}>{profile.remorca?.itv || '—'}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}