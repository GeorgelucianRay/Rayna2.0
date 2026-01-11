import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext.jsx';
import styles from './Utilizatori.module.css';

const ROLE_OPTIONS = ['sofer', 'dispecer', 'mecanic', 'admin'];

export default function Utilizatori() {
  const { profile, loading: authLoading } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const notAllowed = !authLoading && profile?.role !== 'admin';

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, nombre_completo, role')
      .order('email', { ascending: true });

    if (error) {
      setError(error.message || 'Eroare la încărcarea utilizatorilor.');
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && profile?.role === 'admin') {
      fetchProfiles();
    }
  }, [authLoading, profile]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.nombre_completo && r.nombre_completo.toLowerCase().includes(q)) ||
        (r.role && r.role.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const handleChangeRole = async (userId, newRole) => {
    if (!ROLE_OPTIONS.includes(newRole)) return alert('Rol invalid.');

    setSavingId(userId);
    setError(null);

    const prev = rows;
    setRows((cur) => cur.map((r) => (r.id === userId ? { ...r, role: newRole } : r)));

    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) {
      setRows(prev);
      setError(error.message || 'Nu am putut salva rolul.');
    }

    setSavingId(null);
  };

  if (authLoading || loading) return <div className={styles.pageRoot}><div className={styles.wrapper}>Se încarcă…</div></div>;
  if (notAllowed) return <div className={styles.pageRoot}><div className={styles.wrapper}>Nu ai permisiunea să accesezi această pagină.</div></div>;

  return (
    <div className={styles.pageRoot}>
      <button
  className={styles.closeBtn}
  onClick={() => navigate('/dispecer-homepage', { replace: true })}
>
  ✕
</button>

      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2 className={styles.title}>Utilizatori (profiles)</h2>
          <div className={styles.actions}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută după email / nume / rol…"
              className={styles.search}
            />
            <button onClick={fetchProfiles} className={styles.reloadBtn}>Reîncarcă</button>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nume</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.noRecords}>Nicio înregistrare.</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.nombre_completo || '—'}</td>
                    <td>{r.email || '—'}</td>
                    <td>
                      <select
                        value={r.role || ''}
                        onChange={(e) => handleChangeRole(r.id, e.target.value)}
                        disabled={savingId === r.id}
                        className={styles.select}
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {savingId === r.id ? <span className={styles.saving}>Se salvează…</span> : <span className={styles.muted}>—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className={styles.footerNote}>
          Schimbarea rolului se salvează automat la selectarea unei opțiuni.
        </p>
      </div>
    </div>
  );
}