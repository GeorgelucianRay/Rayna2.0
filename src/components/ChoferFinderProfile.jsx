import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import styles from './ChoferFinderProfile.module.css';

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 3a2.828 2.828 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
  </svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default function ChoferFinderProfile() {
  const { loading } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const boxRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editable, setEditable] = useState(null);
  const [camioane, setCamioane] = useState([]);
  const [remorci, setRemorci] = useState([]);

  // 1) încărcăm lista minimă pentru autocomplete
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

  // 2) sugestii filtrate
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

  // click în afara sugestiilor => închide
  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // 3) selectează șofer => încărcăm profil complet
  const pickDriver = async (id) => {
    setOpen(false);
    setTerm('');
    const { data, error } = await supabase
      .from('profiles')
      .select('*, camioane:camion_id(*), remorci:remorca_id(*)')
      .eq('id', id)
      .maybeSingle();
    if (!error) setProfile(data || null);

    // liste pentru dropdown-urile din modal
    const { data: c } = await supabase.from('camioane').select('id, matricula').order('matricula');
    const { data: r } = await supabase.from('remorci').select('id, matricula').order('matricula');
    setCamioane(c || []);
    setRemorci(r || []);
  };

  // 4) tastatură în input
  const onKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi(h => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi(h => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = hi >= 0 ? suggestions[hi] : suggestions[0];
      if (pick) pickDriver(pick.id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // 5) deschide modal edit
  const openEdit = () => {
    if (!profile) return;
    setEditable({ ...profile });
    setIsEditOpen(true);
  };

  // 6) salvează profil
  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nombre_completo: editable.nombre_completo || null,
        cap_expirare: editable.cap_expirare || null,
        carnet_caducidad: editable.carnet_caducidad || null,
        tiene_adr: !!editable.tiene_adr,
        adr_caducidad: editable.tiene_adr ? (editable.adr_caducidad || null) : null,
        camion_id: editable.camion_id || null,
        remorca_id: editable.remorca_id || null,
      };
      const { error } = await supabase.from('profiles').update(payload).eq('id', editable.id);
      if (error) throw error;

      // re-fetch profil curent
      const { data } = await supabase
        .from('profiles')
        .select('*, camioane:camion_id(*), remorci:remorca_id(*)')
        .eq('id', editable.id)
        .maybeSingle();
      setProfile(data || null);

      setIsEditOpen(false);
      alert('Perfil actualizado con éxito.');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <Layout backgroundClassName="profile-background">
      {/* Header */}
      <div className={styles.header}>
        <h1>Choferes & Perfil</h1>
      </div>

      {/* Finder simplu */}
      <div className={styles.centerWrap}>
        <div className={styles.searchWrap} ref={boxRef}>
          <div className={styles.searchBar}>
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
                  onClick={() => pickDriver(s.id)}
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

        {!profile && (
          <p className={styles.hint}>
            Escribe para buscar y selecciona un chófer para ver su perfil aquí mismo.
          </p>
        )}
      </div>

      {/* Profilul apare aici după select */}
      {profile && (
        <div className={styles.cardsGrid}>
          {/* CONDUCTOR */}
          <section className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>Conductor</div>
              <button className={styles.ghostBtn} onClick={openEdit}><EditIcon/> Editar</button>
            </div>
            <div className={styles.rows2}>
              <div>
                <span className={styles.k}>Nombre completo</span>
                <span className={styles.v}>{profile.nombre_completo || '—'}</span>
              </div>
              <div>
                <span className={styles.k}>CAP</span>
                <span className={styles.v}>{profile.cap_expirare || '—'}</span>
              </div>
              <div>
                <span className={styles.k}>Carnet conducir</span>
                <span className={styles.v}>{profile.carnet_caducidad || '—'}</span>
              </div>
              <div>
                <span className={styles.k}>ADR</span>
                <span className={styles.v}>{profile.tiene_adr ? (profile.adr_caducidad || 'Sí') : 'No'}</span>
              </div>
            </div>
          </section>

          {/* CAMIÓN */}
          <section className={styles.card}>
            <div className={styles.cardTitle}>Camión</div>
            <div className={styles.rows2}>
              <div>
                <span className={styles.k}>Matrícula</span>
                <span className={styles.v}>{profile.camioane?.matricula || 'No asignado'}</span>
              </div>
              <div>
                <span className={styles.k}>ITV</span>
                <span className={styles.v}>{profile.camioane?.fecha_itv || '—'}</span>
              </div>
            </div>
          </section>

          {/* REMOLQUE */}
          <section className={styles.card}>
            <div className={styles.cardTitle}>Remolque</div>
            <div className={styles.rows2}>
              <div>
                <span className={styles.k}>Matrícula</span>
                <span className={styles.v}>{profile.remorci?.matricula || 'No asignado'}</span>
              </div>
              <div>
                <span className={styles.k}>ITV</span>
                <span className={styles.v}>{profile.remorci?.fecha_itv || '—'}</span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Modal Editar */}
      {isEditOpen && editable && (
        <div className={styles.modalOverlay} onClick={()=> setIsEditOpen(false)}>
          <div className={styles.modal} onClick={(e)=> e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Editar Perfil</h3>
              <button className={styles.iconBtn} onClick={()=> setIsEditOpen(false)}><CloseIcon/></button>
            </div>
            <form className={styles.modalBody} onSubmit={saveProfile}>
              <div className={styles.inputGroup}>
                <label>Nombre Completo</label>
                <input
                  type="text"
                  value={editable.nombre_completo || ''}
                  onChange={(e)=> setEditable(p=> ({...p, nombre_completo: e.target.value}))}
                />
              </div>

              <div className={styles.grid2}>
                <div className={styles.inputGroup}>
                  <label>Caducidad CAP</label>
                  <input
                    type="date"
                    value={editable.cap_expirare || ''}
                    onChange={(e)=> setEditable(p=> ({...p, cap_expirare: e.target.value}))}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Caducidad Carnet</label>
                  <input
                    type="date"
                    value={editable.carnet_caducidad || ''}
                    onChange={(e)=> setEditable(p=> ({...p, carnet_caducidad: e.target.value}))}
                  />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.inputGroup}>
                  <label>¿Tiene ADR?</label>
                  <select
                    value={String(!!editable.tiene_adr)}
                    onChange={(e)=> setEditable(p=> ({...p, tiene_adr: e.target.value === 'true'}))}
                  >
                    <option value="false">No</option>
                    <option value="true">Sí</option>
                  </select>
                </div>
                {editable.tiene_adr && (
                  <div className={styles.inputGroup}>
                    <label>Caducidad ADR</label>
                    <input
                      type="date"
                      value={editable.adr_caducidad || ''}
                      onChange={(e)=> setEditable(p=> ({...p, adr_caducidad: e.target.value}))}
                    />
                  </div>
                )}
              </div>

              <div className={styles.grid2}>
                <div className={styles.inputGroup}>
                  <label>Camión asignado</label>
                  <select
                    value={editable.camion_id || ''}
                    onChange={(e)=> setEditable(p=> ({...p, camion_id: e.target.value || null}))}
                  >
                    <option value="">Ninguno</option>
                    {camioane.map(c => <option key={c.id} value={c.id}>{c.matricula}</option>)}
                  </select>
                </div>
                <div className={styles.inputGroup}>
                  <label>Remolque asignado</label>
                  <select
                    value={editable.remorca_id || ''}
                    onChange={(e)=> setEditable(p=> ({...p, remorca_id: e.target.value || null}))}
                  >
                    <option value="">Ninguno</option>
                    {remorci.map(r => <option key={r.id} value={r.id}>{r.matricula}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnGhost} onClick={()=> setIsEditOpen(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary}>Guardar cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
