import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import styles from './AdminFeedback.module.css';
import FeedbackDetailsModal from './FeedbackDetailsModal';

export default function AdminFeedback() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      // 🔧 IMPORTANT: coloana textului este `message`
      const { data, error } = await supabase
        .from('feedback_utilizatori')
        .select(`id, created_at, message, profiles(nombre_completo, email, role)`)
        .order('created_at', { ascending: false });

      if (error) setError(error.message);
      else setRows(data || []);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => {
      const s = `${r.profiles?.nombre_completo ?? ''} ${r.profiles?.email ?? ''} ${r.profiles?.role ?? ''} ${r.message ?? ''}`.toLowerCase();
      return s.includes(q);
    });
  }, [rows, search]);

  const exportCSV = () => {
    const header = ['Fecha', 'Nombre', 'Email', 'Rol', 'Mensaje'];
    const lines = filtered.map(r => [
      new Date(r.created_at).toLocaleString(),
      r.profiles?.nombre_completo ?? '',
      r.profiles?.email ?? '',
      r.profiles?.role ?? '',
      (r.message ?? '').replace(/\r?\n/g, ' ')
    ]);
    const csv = [header, ...lines].map(a => a.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'feedback_usuarios.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Feedback de usuarios</h1>
        <button className={styles.closeBtn} onClick={() => navigate(-1)} aria-label="Cerrar">×</button>
      </div>

      {error && <div className={styles.error}>Error: {error}</div>}

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="text"
          placeholder="Buscar por nombre, email, rol o texto…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className={styles.exportBtn} onClick={exportCSV}>Exportar CSV</button>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Mensaje</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5">No hay resultados.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  className={`${styles.row} ${styles.clickable}`}
                  onClick={() => setSelected(r)}
                >
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>{r.profiles?.nombre_completo ?? '-'}</td>
                  <td>{r.profiles?.email ?? '-'}</td>
                  <td>{r.profiles?.role ?? '-'}</td>
                  <td className={styles.ellipsis}>{r.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de detalii */}
      <FeedbackDetailsModal
        open={!!selected}
        onClose={() => setSelected(null)}
        item={selected}
      />
    </div>
  );
}