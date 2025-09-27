import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import styles from './AdminFeedback.module.css';

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('feedback_utilizatori')
        .select(`id, created_at, feedback, profiles(nombre_completo, email, role)`)
        .order('created_at', { ascending: false });

      if (error) setError(error.message);
      else setFeedbacks(data);
    };
    load();
  }, []);

  const filtered = feedbacks.filter(fb => {
    const txt = `${fb.profiles?.nombre_completo} ${fb.profiles?.email} ${fb.profiles?.role} ${fb.feedback}`.toLowerCase();
    return txt.includes(search.toLowerCase());
  });

  const exportCSV = () => {
    const rows = [
      ['Fecha', 'Nombre', 'Email', 'Rol', 'Feedback'],
      ...filtered.map(f => [
        new Date(f.created_at).toLocaleString(),
        f.profiles?.nombre_completo || '',
        f.profiles?.email || '',
        f.profiles?.role || '',
        f.feedback || ''
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedback.csv';
    a.click();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Feedback de usuarios</h2>
        <button className={styles.closeBtn} onClick={() => navigate(-1)}>×</button>
      </div>

      {error && <div className={styles.error}>Error: {error}</div>}

      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.search}
          placeholder="Buscar por nombre, email, rol o texto..."
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
              <th>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5">No hay resultados.</td>
              </tr>
            ) : (
              filtered.map((f) => (
                <tr key={f.id} className={styles.row}>
                  <td>{new Date(f.created_at).toLocaleString()}</td>
                  <td>{f.profiles?.nombre_completo || '-'}</td>
                  <td>{f.profiles?.email || '-'}</td>
                  <td>{f.profiles?.role || '-'}</td>
                  <td className={styles.feedback}>{f.feedback}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}