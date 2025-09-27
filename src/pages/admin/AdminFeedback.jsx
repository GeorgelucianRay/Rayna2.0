import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import styles from './AdminFeedback.module.css';

export default function AdminFeedback() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('feedback_utilizatori')
        .select(`
          id, continut, created_at, user_id,
          profiles:profiles!feedback_utilizatori_user_id_fkey (nombre_completo, email, role)
        `)
        .order('created_at', { ascending: false });

      if (!isMounted) return;
      if (error) setError(error.message);
      else setItems(data || []);
    })();
    return () => { isMounted = false; };
  }, []);

  const filtered = items.filter((fb) => {
    const s = q.toLowerCase().trim();
    if (!s) return true;
    const name = fb.profiles?.nombre_completo || '';
    const email = fb.profiles?.email || '';
    const role = fb.profiles?.role || '';
    const text = fb.continut || '';
    return (
      name.toLowerCase().includes(s) ||
      email.toLowerCase().includes(s) ||
      role.toLowerCase().includes(s) ||
      text.toLowerCase().includes(s)
    );
  });

  return (
    <div className={styles.page}>
      {/* BARĂ SUS – X roșu (înapoi) */}
      <header className={styles.topbar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          aria-label="Volver"
          title="Volver"
        >
          ×
        </button>
        <h2 className={styles.title}>Feedback de usuarios</h2>
      </header>

      {/* Căutare + erori */}
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Buscar por nombre, email, rol o texto…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {error && <span className={styles.error}>Error: {error}</span>}
      </div>

      {/* CARD TABEL */}
      <div className={styles.card}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>No hay resultados.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((fb) => (
                  <tr
                    key={fb.id}
                    className={styles.row}
                    onClick={() => setSelected(fb)}
                    title="Ver detalles"
                  >
                    <td>{new Date(fb.created_at).toLocaleString()}</td>
                    <td>{fb.profiles?.nombre_completo || '—'}</td>
                    <td>{fb.profiles?.email || '—'}</td>
                    <td>{fb.profiles?.role || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DETALII */}
      {selected && (
        <div className={styles.modalOverlay} onClick={() => setSelected(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setSelected(null)}
              aria-label="Cerrar"
              title="Cerrar"
            >
              ×
            </button>
            <h3 className={styles.modalTitle}>Detalles del feedback</h3>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Fecha</span>
              <span className={styles.detailValue}>
                {new Date(selected.created_at).toLocaleString()}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Nombre</span>
              <span className={styles.detailValue}>
                {selected.profiles?.nombre_completo || '—'}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Email</span>
              <span className={styles.detailValue}>
                {selected.profiles?.email || '—'}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Rol</span>
              <span className={styles.detailValue}>
                {selected.profiles?.role || '—'}
              </span>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Mensaje</span>
              <div className={styles.messageBox}>
                {selected.continut || '—'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}