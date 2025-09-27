import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import styles from './AdminFeedback.module.css';

const PAGE_SIZE = 20;

export default function AdminFeedback() {
  const [rows, setRows] = useState([]);        // feedback + profil atașat
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(null);
  const [q, setQ] = useState('');              // căutare client-side
  const [exporting, setExporting] = useState(false);

  // 1) Citește feedback-urile paginat
  const fetchFeedbackPage = async (pageNum = 1) => {
    setLoading(true);
    setErr(null);
    try {
      const from = (pageNum - 1) * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;

      // feedback de bază
      const { data: feedback, error, count } = await supabase
        .from('feedback_utilizatori')
        .select('id, user_id, continut, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // ia profilele pentru user_id-uri unice
      const userIds = [...new Set((feedback || []).map(r => r.user_id))];
      let profilesById = {};
      if (userIds.length > 0) {
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('id, nombre_completo, email, role')
          .in('id', userIds);
        if (pErr) throw pErr;
        profilesById = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
      }

      // combină
      const combined = (feedback || []).map(f => ({
        ...f,
        profile: profilesById[f.user_id] || null,
      }));

      setRows(combined);
      setTotalCount(count ?? null);
      setPage(pageNum);
    } catch (e) {
      setErr(e.message || 'Eroare la încărcare.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbackPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Filtru client-side
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r => {
      const name  = r.profile?.nombre_completo?.toLowerCase() || '';
      const mail  = r.profile?.email?.toLowerCase() || '';
      const role  = r.profile?.role?.toLowerCase() || '';
      const text  = r.continut?.toLowerCase() || '';
      return name.includes(term) || mail.includes(term) || role.includes(term) || text.includes(term);
    });
  }, [q, rows]);

  // 3) Export CSV
  const handleExport = async () => {
    try {
      setExporting(true);
      // scoatem TOATE rândurile (nu doar pagina), pentru CSV
      const { data: allFeedback, error } = await supabase
        .from('feedback_utilizatori')
        .select('id, user_id, continut, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((allFeedback || []).map(r => r.user_id))];
      let profilesById = {};
      if (userIds.length > 0) {
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('id, nombre_completo, email, role')
          .in('id', userIds);
        if (pErr) throw pErr;
        profilesById = (profiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
      }

      const header = ['Fecha', 'Nombre', 'Email', 'Rol', 'Feedback'];
      const lines = [header.join(',')];

      (allFeedback || []).forEach(f => {
        const p = profilesById[f.user_id] || {};
        const cells = [
          new Date(f.created_at).toLocaleString(),
          (p.nombre_completo || '').replaceAll('"','""'),
          (p.email || '').replaceAll('"','""'),
          (p.role || ''),
          (f.continut || '').replaceAll('\n',' ').replaceAll('"','""'),
        ].map(v => `"${v}"`);
        lines.push(cells.join(','));
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `feedback_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.message || 'Eroare la export.');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = totalCount ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) : 1;

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerBar}>
        <h2>Feedback de usuarios</h2>
        <div className={styles.headerActions}>
          <input
            className={styles.search}
            placeholder="Buscar por nombre, email, rol o texto…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className={styles.exportBtn} onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exportando…' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      {err && <div className={styles.error}>Error: {err}</div>}

      {loading ? (
        <div className={styles.loading}>Cargando…</div>
      ) : (
        <>
          <div className={styles.tableWrap}>
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
                  <tr><td colSpan={5} className={styles.empty}>No hay resultados.</td></tr>
                ) : filtered.map(row => (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>{row.profile?.nombre_completo || '—'}</td>
                    <td>{row.profile?.email || '—'}</td>
                    <td>{row.profile?.role || '—'}</td>
                    <td className={styles.feedbackCell}>{row.continut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button
              onClick={() => fetchFeedbackPage(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
            >
              « Anterior
            </button>
            <span>Página {page}{totalPages ? ` de ${totalPages}` : ''}</span>
            <button
              onClick={() => fetchFeedbackPage(page + 1)}
              disabled={totalPages && page >= totalPages || loading}
            >
              Siguiente »
            </button>
          </div>
        </>
      )}
    </div>
  );
}