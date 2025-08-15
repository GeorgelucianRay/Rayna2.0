import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './ChoferesFinderProfile.module.css';

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

export default function ChoferesFinder() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hi, setHi] = useState(-1); // highlighted index
  const [open, setOpen] = useState(false);
  const [lastClickedId, setLastClickedId] = useState(null);

  // Fetch la 250ms debounce
  useEffect(() => {
    let cancel = false;
    const t = setTimeout(async () => {
      const term = q.trim();
      if (!term) {
        setRows([]);
        setHi(-1);
        setOpen(false);
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
        if (!cancel) {
          setRows([]);
          setOpen(true);
          setHi(-1);
        }
        console.warn('Search error:', e.message);
      } finally {
        if (!cancel) setLoading(false);
      }
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [q]);

  const goProfile = (id) => {
    if (!id) return;
    navigate(`/chofer/${id}`);
  };

  const goVacacionesAdmin = (id) => {
    if (!id) return;
    navigate(`/choferes-finder/vacaciones-admin?user_id=${encodeURIComponent(id)}`);
  };

  const selectedId = useMemo(() => {
    if (hi >= 0 && hi < rows.length) return rows[hi]?.id || null;
    return lastClickedId || null;
  }, [hi, rows, lastClickedId]);

  const onKeyDown = (e) => {
    if (!open || !rows.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((p) => Math.min(p + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((p) => Math.max(p - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hi >= 0 && hi < rows.length) goProfile(rows[hi].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Închide dropdown la blur (cu un mic delay ca să permită click-ul)
  const blurTimer = useRef(null);
  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setOpen(false), 120);
  };
  const handleFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    if (rows.length) setOpen(true);
  };

  return (
    <Layout>
      <div className={styles.page}>
        <header className={styles.header}>
          <h1><UsersIcon /> Buscar chófer</h1>
          <div className={styles.actions}>
            <button
              className={styles.btnAccent}
              disabled={!selectedId}
              title={selectedId ? 'Vacaciones (admin) del chófer seleccionado' : 'Seleccione un chófer'}
              onClick={() => goVacacionesAdmin(selectedId)}
            >
              Vacaciones (admin)
            </button>
          </div>
        </header>

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
                  onClick={() => { setLastClickedId(r.id); goProfile(r.id); }}
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

        <p className={styles.hint}>
          Tip: Enter deschide profilul. Selectează un rezultat, apoi „Vacaciones (admin)” pentru panoul de concedii.
        </p>
      </div>
    </Layout>
  );
}