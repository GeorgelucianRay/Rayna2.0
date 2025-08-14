import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import styles from './ChoferesPage.module.css';
import depotStyles from './DepotPage.module.css';

const AlarmIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 8v4l2 2"></path>
  </svg>
);
const SearchIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
  </svg>
);

export default function ChoferesPage() {
  const { alarms, loading } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1); // highlighted index
  const boxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre_completo, camioane:camion_id(matricula), remorci:remorca_id(matricula)')
        .eq('role', 'sofer');
      if (!error) setDrivers(data || []);
    })();
  }, [loading]);

  const suggestions = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    return drivers
      .filter(d => (d.nombre_completo || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [drivers, term]);

  useEffect(() => {
    setOpen(suggestions.length > 0);
    setHi(-1);
  }, [suggestions.length]);

  // închidere la click în afara box-ului
  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const onKeyDown = (e) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter' && suggestions.length === 0) {
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi(h => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi(h => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = hi >= 0 ? suggestions[hi] : suggestions[0];
      if (pick) {
        navigate(`/chofer/${pick.id}`);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  if (loading) {
    return <div className={styles.loadingScreen}>Cargando…</div>;
  }

  return (
    <Layout backgroundClassName="profile-background">
      <div className={styles.header}>
        <h1>Administración de Choferes</h1>
      </div>

      {alarms?.length > 0 && (
        <div className={styles.alarm}>
          <div className={styles.alarmHead}>
            <AlarmIcon /><h3>Alertas de Caducidad</h3>
          </div>
          <ul>
            {alarms.map((a, i) => <li key={i}>{a.message}</li>)}
          </ul>
        </div>
      )}

      {/* bara de căutare + dropdown sugestii */}
      <div className={styles.centerWrap}>
        <div className={styles.searchWrap} ref={boxRef}>
          <div className={depotStyles.searchBar}>
            <SearchIcon />
            <input
              type="text"
              placeholder="Busca un chófer por nombre…"
              value={term}
              onChange={(e)=> setTerm(e.target.value)}
              onFocus={()=> setOpen(suggestions.length > 0)}
              onKeyDown={onKeyDown}
            />
          </div>

          {open && (
            <ul className={styles.suggestList} role="listbox">
              {suggestions.map((s, idx) => (
                <li
                  key={s.id}
                  role="option"
                  aria-selected={hi === idx}
                  className={`${styles.suggestItem} ${hi === idx ? styles.active : ''}`}
                  onMouseEnter={()=> setHi(idx)}
                  onMouseLeave={()=> setHi(-1)}
                  onClick={() => { navigate(`/chofer/${s.id}`); setOpen(false); }}
                >
                  <span className={styles.sName}>{s.nombre_completo}</span>
                  <span className={styles.sMeta}>
                    Camión: {s.camioane?.matricula || '—'} · Remolque: {s.remorci?.matricula || '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* hint scurt */}
        {!term && (
          <p className={styles.hint}>
            Empieza a escribir para buscar un perfil de chófer y presiona <b>Enter</b> o haz <b>click</b> en la sugerencia.
          </p>
        )}
        {term && suggestions.length === 0 && (
          <p className={styles.nores}>
            No hay resultados para “{term}”.
          </p>
        )}
      </div>
    </Layout>
  );
}