import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';
import styles from './AdminFeedback.module.css';

export default function AdminFeedback() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('feedback_utilizatori')
        .select(`
          id,
          created_at,
          user_id,
          email,
          continut,
          origen,
          categoria,
          severidad,
          contexto,
          profiles:profiles!feedback_utilizatori_user_id_fkey (
            nombre_completo,
            email,
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (!alive) return;

      if (error) setError(error.message);
      setItems(data || []);
      setLoading(false);
    })();

    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;

    return items.filter((fb) => {
      const name   = fb.profiles?.nombre_completo || '';
      const email1 = fb.email || '';
      const email2 = fb.profiles?.email || '';
      const role   = fb.profiles?.role || '';
      const text   = fb.continut || '';
      const cat    = fb.categoria || '';
      const org    = fb.origen || '';
      const sev    = fb.severidad || '';
      return (
        name.toLowerCase().includes(s) ||
        email1.toLowerCase().includes(s) ||
        email2.toLowerCase().includes(s) ||
        role.toLowerCase().includes(s) ||
        text.toLowerCase().includes(s) ||
        cat.toLowerCase().includes(s) ||
        org.toLowerCase().includes(s) ||
        sev.toLowerCase().includes(s)
      );
    });
  }, [items, q]);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
    try {
      const { error } = await supabase
        .from('feedback_utilizatori')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setItems((list) => list.filter((x) => x.id !== id));
      setSelected((sel) => (sel?.id === id ? null : sel));
    } catch (e) {
      console.error('delete error:', e);
      setError(e.message || 'No se ha podido eliminar.');
    }
  };

  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <header className={styles.topbar}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>×</button>
          <h2 className={styles.title}>Feedback / Reclamos</h2>
        </header>
        <div className={styles.card}>
          <p className={styles.empty}>Necesitas permisos de administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* BARĂ SUS */}
      <header className={styles.topbar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Volver">×</button>
        <h2 className={styles.title}>Feedback & Reclamos</h2>
      </header>

      {/* Căutare + erori */}
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Buscar por texto, nombre, email, rol, categoría, origen…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {error && <span className={styles.error}>Error: {error}</span>}
      </div>

      {/* Tabel */}
      <div className={styles.card}>
        {loading ? (
          <p className={styles.empty}>Cargando…</p>
        ) : filtered.length === 0 ? (
          <p className={styles.empty}>No hay resultados.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.colActions}> </th>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Origen</th>
                  <th>Severidad</th>
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
                    <td className={styles.colActions}>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.danger}`}
                        onClick={(e) => { e.stopPropagation(); handleDelete(fb.id); }}
                        title="Eliminar"
                        aria-label="Eliminar"
                      >
                        ×
                      </button>
                    </td>

                    <td>{new Date(fb.created_at).toLocaleString()}</td>
                    <td><Badge>{fb.categoria || '—'}</Badge></td>
                    <td><Badge tone="neutral">{fb.origen || '—'}</Badge></td>
                    <td>
                      <Badge
                        tone={
                          fb.severidad === 'alta' ? 'danger'
                            : fb.severidad === 'media' ? 'warn'
                            : 'ok'
                        }
                      >
                        {fb.severidad || '—'}
                      </Badge>
                    </td>
                    <td>{fb.profiles?.nombre_completo || '—'}</td>
                    <td>{fb.email || fb.profiles?.email || '—'}</td>
                    <td>{fb.profiles?.role || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal detalii */}
      {selected && (
        <div className={styles.modalOverlay} onClick={() => setSelected(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setSelected(null)} aria-label="Cerrar">×</button>
            <h3 className={styles.modalTitle}>Detalle</h3>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Fecha</span>
              <span className={styles.detailValue}>
                {new Date(selected.created_at).toLocaleString()}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Categoría</span>
              <span className={styles.detailValue}>{selected.categoria || '—'}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Origen</span>
              <span className={styles.detailValue}>{selected.origen || '—'}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Severidad</span>
              <span className={styles.detailValue}>{selected.severidad || '—'}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Nombre</span>
              <span className={styles.detailValue}>{selected.profiles?.nombre_completo || '—'}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Email</span>
              <span className={styles.detailValue}>{selected.email || selected.profiles?.email || '—'}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Rol</span>
              <span className={styles.detailValue}>{selected.profiles?.role || '—'}</span>
            </div>

            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>Mensaje</span>
              <div className={styles.messageBox}>{selected.continut || '—'}</div>
            </div>

            {selected.contexto && (
              <div className={styles.detailBlock}>
                <span className={styles.detailLabel}>Contexto</span>
                <pre className={styles.jsonBox}>
                  {JSON.stringify(selected.contexto, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ——— badge mic pentru categorie/origen/severidad ——— */
function Badge({ children, tone = 'info' }) {
  const t =
    tone === 'danger' ? { bg: 'rgba(229,57,53,.18)', brd: 'rgba(229,57,53,.5)', col: '#ffb3b0' } :
    tone === 'warn'   ? { bg: 'rgba(255,193,7,.18)',  brd: 'rgba(255,193,7,.5)',  col: '#ffe08a' } :
    tone === 'ok'     ? { bg: 'rgba(59,228,118,.18)', brd: 'rgba(59,228,118,.5)', col: '#baf3d0' } :
                        { bg: 'rgba(255,255,255,.10)', brd: 'rgba(255,255,255,.25)', col: '#dfe8ff' };
  return (
    <span style={{
      display:'inline-block',
      padding:'2px 8px',
      borderRadius:12,
      background:t.bg,
      border:`1px solid ${t.brd}`,
      color:t.col,
      fontSize:12,
      lineHeight:'18px'
    }}>
      {children}
    </span>
  );
}